/*
 * Henlo Token Event Handlers
 * Tracks HENLO token burns, transfers, and holder statistics
 */

import {
  HenloBurn,
  HenloBurnStats,
  HenloGlobalBurnStats,
  HenloHolder,
  HenloHolderStats,
  HenloToken,
} from "generated";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dead";
const BERACHAIN_MAINNET_ID = 80084;

// Henlo burn source addresses (Berachain mainnet)
const HENLO_BURN_SOURCES: Record<string, string> = {
  "0xde81b20b6801d99efeaeced48a11ba025180b8cc": "incinerator",
  // TODO: Add actual OverUnder contract address when available
  // TODO: Add actual BeraTrackr contract address when available
};

/**
 * Handles ALL HENLO token transfer events
 * Tracks burns, regular transfers, and maintains holder statistics
 */
export const handleHenloBurn = HenloToken.Transfer.handler(
  async ({ event, context }) => {
    const { from, to, value } = event.params;
    const timestamp = BigInt(event.block.timestamp);
    const chainId = event.chainId;
    
    // Normalize addresses to lowercase
    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();
    const zeroAddress = ZERO_ADDRESS.toLowerCase();
    const deadAddress = DEAD_ADDRESS.toLowerCase();

    // Track changes in holder counts and supply
    let holderDelta = 0;
    let supplyDelta = BigInt(0);

    // Handle 'from' address (decrease balance)
    if (fromLower !== zeroAddress) {
      const fromHolder = await getOrCreateHolder(context, fromLower, chainId, timestamp);
      const newFromBalance = fromHolder.balance - value;
      
      // Update holder record
      const updatedFromHolder = {
        ...fromHolder,
        balance: newFromBalance,
        lastActivityTime: timestamp,
      };
      context.HenloHolder.set(updatedFromHolder);

      // If balance went to zero, decrease holder count
      if (fromHolder.balance > BigInt(0) && newFromBalance === BigInt(0)) {
        holderDelta--;
      }
      
      // Supply decreases when tokens are burned
      if (toLower === zeroAddress || toLower === deadAddress) {
        supplyDelta -= value;
      }
    } else {
      // Mint: supply increases
      supplyDelta += value;
    }

    // Handle 'to' address (increase balance)
    if (toLower !== zeroAddress && toLower !== deadAddress) {
      const toHolder = await getOrCreateHolder(context, toLower, chainId, timestamp);
      const newToBalance = toHolder.balance + value;
      
      // Update holder record
      const updatedToHolder = {
        ...toHolder,
        balance: newToBalance,
        lastActivityTime: timestamp,
        // Set firstTransferTime if this is their first time receiving tokens
        firstTransferTime: toHolder.firstTransferTime || timestamp,
      };
      context.HenloHolder.set(updatedToHolder);

      // If balance went from zero to positive, increase holder count
      if (toHolder.balance === BigInt(0) && newToBalance > BigInt(0)) {
        holderDelta++;
      }
    }

    // Update holder statistics if there were changes
    if (holderDelta !== 0 || supplyDelta !== BigInt(0)) {
      await updateHolderStats(context, chainId, holderDelta, supplyDelta, timestamp);
    }

    // Handle burn tracking (only for burns)
    const isZeroAddress = toLower === zeroAddress;
    const isDeadAddress = toLower === deadAddress;
    
  if (isZeroAddress || isDeadAddress) {
      // Determine burn source
      const source = HENLO_BURN_SOURCES[fromLower] || "user";

      // Create burn record
      const burnId = `${event.transaction.hash}_${event.logIndex}`;
      const burn: HenloBurn = {
        id: burnId,
        amount: value,
        timestamp,
        blockNumber: BigInt(event.block.number),
        transactionHash: event.transaction.hash,
        from: fromLower,
        source,
        chainId,
      };

      context.HenloBurn.set(burn);

      // Materialize unique burners and increment global unique count on first burn
      const existingBurner = await context.HenloBurner.get(fromLower);
      if (!existingBurner) {
        const burner = {
          id: fromLower,
          address: fromLower,
          firstBurnTime: timestamp,
          chainId,
        };
        context.HenloBurner.set(burner);

        // Increment global uniqueBurners counter
        let g = await context.HenloGlobalBurnStats.get("global");
        if (!g) {
          g = {
            id: "global",
            totalBurnedAllChains: BigInt(0),
            totalBurnedMainnet: BigInt(0),
            totalBurnedTestnet: BigInt(0),
            burnCountAllChains: 0,
            incineratorBurns: BigInt(0),
            overunderBurns: BigInt(0),
            beratrackrBurns: BigInt(0),
            userBurns: BigInt(0),
            uniqueBurners: 0,
            lastUpdateTime: timestamp,
          };
        }
        const gUpdated = {
          ...g,
          uniqueBurners: (g.uniqueBurners ?? 0) + 1,
          lastUpdateTime: timestamp,
        };
        context.HenloGlobalBurnStats.set(gUpdated);
      }

      // Update chain-specific burn stats
      await updateChainBurnStats(context, chainId, source, value, timestamp);

      // Update global burn stats
      await updateGlobalBurnStats(context, chainId, source, value, timestamp);
    }
  }
);

/**
 * Updates burn statistics for a specific chain and source
 */
async function updateChainBurnStats(
  context: any,
  chainId: number,
  source: string,
  amount: bigint,
  timestamp: bigint
) {
  // Update source-specific stats
  const statsId = `${chainId}_${source}`;
  let stats = await context.HenloBurnStats.get(statsId);

  if (!stats) {
    stats = {
      id: statsId,
      chainId,
      source,
      totalBurned: BigInt(0),
      burnCount: 0,
      lastBurnTime: timestamp,
      firstBurnTime: timestamp,
    };
  }

  // Create updated stats object (immutable update)
  const updatedStats = {
    ...stats,
    totalBurned: stats.totalBurned + amount,
    burnCount: stats.burnCount + 1,
    lastBurnTime: timestamp,
  };

  context.HenloBurnStats.set(updatedStats);

  // Update total stats for this chain
  const totalStatsId = `${chainId}_total`;
  let totalStats = await context.HenloBurnStats.get(totalStatsId);

  if (!totalStats) {
    totalStats = {
      id: totalStatsId,
      chainId,
      source: "total",
      totalBurned: BigInt(0),
      burnCount: 0,
      lastBurnTime: timestamp,
      firstBurnTime: timestamp,
    };
  }

  // Create updated total stats object (immutable update)
  const updatedTotalStats = {
    ...totalStats,
    totalBurned: totalStats.totalBurned + amount,
    burnCount: totalStats.burnCount + 1,
    lastBurnTime: timestamp,
  };

  context.HenloBurnStats.set(updatedTotalStats);
}

/**
 * Updates global burn statistics across all chains
 */
async function updateGlobalBurnStats(
  context: any,
  chainId: number,
  source: string,
  amount: bigint,
  timestamp: bigint
) {
  let globalStats = await context.HenloGlobalBurnStats.get("global");

  if (!globalStats) {
    globalStats = {
      id: "global",
      totalBurnedAllChains: BigInt(0),
      totalBurnedMainnet: BigInt(0),
      totalBurnedTestnet: BigInt(0),
      burnCountAllChains: 0,
      incineratorBurns: BigInt(0),
      overunderBurns: BigInt(0),
      beratrackrBurns: BigInt(0),
      userBurns: BigInt(0),
      uniqueBurners: 0,
      lastUpdateTime: timestamp,
    };
  }

  // Create updated global stats object (immutable update)
  const updatedGlobalStats = {
    ...globalStats,
    totalBurnedAllChains: globalStats.totalBurnedAllChains + amount,
    totalBurnedMainnet:
      chainId === BERACHAIN_MAINNET_ID
        ? globalStats.totalBurnedMainnet + amount
        : globalStats.totalBurnedMainnet,
    totalBurnedTestnet:
      chainId !== BERACHAIN_MAINNET_ID
        ? globalStats.totalBurnedTestnet + amount
        : globalStats.totalBurnedTestnet,
    incineratorBurns:
      source === "incinerator"
        ? globalStats.incineratorBurns + amount
        : globalStats.incineratorBurns,
    overunderBurns:
      source === "overunder"
        ? globalStats.overunderBurns + amount
        : globalStats.overunderBurns,
    beratrackrBurns:
      source === "beratrackr"
        ? globalStats.beratrackrBurns + amount
        : globalStats.beratrackrBurns,
    userBurns:
      source !== "incinerator" && source !== "overunder" && source !== "beratrackr"
        ? globalStats.userBurns + amount
        : globalStats.userBurns,
    // Preserve uniqueBurners as-is here; it is incremented only when a new burner appears
    uniqueBurners: globalStats.uniqueBurners ?? 0,
    burnCountAllChains: globalStats.burnCountAllChains + 1,
    lastUpdateTime: timestamp,
  };

  context.HenloGlobalBurnStats.set(updatedGlobalStats);
}

/**
 * Gets an existing holder or creates a new one with zero balance
 */
async function getOrCreateHolder(
  context: any,
  address: string,
  chainId: number,
  timestamp: bigint
): Promise<HenloHolder> {
  const holderId = address; // Use address as ID
  let holder = await context.HenloHolder.get(holderId);

  if (!holder) {
    holder = {
      id: holderId,
      address: address,
      balance: BigInt(0),
      firstTransferTime: undefined,
      lastActivityTime: timestamp,
      chainId,
    };
  }

  return holder;
}

/**
 * Updates holder statistics for the chain
 */
async function updateHolderStats(
  context: any,
  chainId: number,
  holderDelta: number,
  supplyDelta: bigint,
  timestamp: bigint
) {
  const statsId = chainId.toString();
  let stats = await context.HenloHolderStats.get(statsId);

  if (!stats) {
    stats = {
      id: statsId,
      chainId,
      uniqueHolders: 0,
      totalSupply: BigInt(0),
      lastUpdateTime: timestamp,
    };
  }

  // Create updated stats object (immutable update)
  const updatedStats = {
    ...stats,
    uniqueHolders: Math.max(0, stats.uniqueHolders + holderDelta),
    totalSupply: stats.totalSupply + supplyDelta,
    lastUpdateTime: timestamp,
  };

  context.HenloHolderStats.set(updatedStats);
}
