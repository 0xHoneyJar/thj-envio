/*
 * Henlo Burn Tracking Event Handlers
 * Tracks HENLO token burns and categorizes them by source
 */

import {
  HenloBurn,
  HenloBurnStats,
  HenloGlobalBurnStats,
  HenloToken,
} from "generated";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const BERACHAIN_MAINNET_ID = 80084;

// Henlo burn source addresses (Berachain mainnet)
const HENLO_BURN_SOURCES: Record<string, string> = {
  "0xde81b20b6801d99efeaeced48a11ba025180b8cc": "incinerator",
  // TODO: Add actual OverUnder contract address when available
  // TODO: Add actual BeraTrackr contract address when available
};

/**
 * Handles HENLO token burn events
 * Tracks burns by source (incinerator, overunder, beratrackr, user)
 */
export const handleHenloBurn = HenloToken.Transfer.handler(
  async ({ event, context }) => {
    const { from, to, value } = event.params;

    // Only track burns (transfers to zero address)
    if (to.toLowerCase() !== ZERO_ADDRESS.toLowerCase()) {
      return;
    }

    const timestamp = BigInt(event.block.timestamp);
    const chainId = event.chainId;
    const fromLower = from.toLowerCase();

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

    // Update chain-specific burn stats
    await updateChainBurnStats(context, chainId, source, value, timestamp);

    // Update global burn stats
    await updateGlobalBurnStats(context, chainId, source, value, timestamp);
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
    burnCountAllChains: globalStats.burnCountAllChains + 1,
    lastUpdateTime: timestamp,
  };

  context.HenloGlobalBurnStats.set(updatedGlobalStats);
}