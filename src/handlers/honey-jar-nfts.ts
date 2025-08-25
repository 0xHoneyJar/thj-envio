/*
 * HoneyJar NFT Event Handlers
 * Handles NFT transfers, mints, burns, and cross-chain tracking
 */

import {
  CollectionStat,
  GlobalCollectionStat,
  Holder,
  HoneyJar,
  HoneyJar2Eth,
  HoneyJar3Eth,
  HoneyJar4Eth,
  HoneyJar5Eth,
  Honeycomb,
  Mint,
  Token,
  Transfer,
  UserBalance,
} from "generated";

import {
  ZERO_ADDRESS,
  BERACHAIN_TESTNET_ID,
  PROXY_CONTRACTS,
  ADDRESS_TO_COLLECTION,
  COLLECTION_TO_GENERATION,
  HOME_CHAIN_IDS,
} from "./constants";

/**
 * Main transfer handler for all HoneyJar NFT contracts
 */
export async function handleTransfer(
  event: any,
  context: any,
  collectionOverride?: string
) {
  const { from, to, tokenId } = event.params;
  const contractAddress = event.srcAddress.toLowerCase();
  const collection =
    collectionOverride || ADDRESS_TO_COLLECTION[contractAddress] || "Unknown";
  const generation = COLLECTION_TO_GENERATION[collection] ?? -1;
  const timestamp = BigInt(event.block.timestamp);
  const chainId = event.chainId;

  // Skip unknown collections
  if (generation < 0) return;

  // Create transfer record
  const transferId = `${event.transaction.hash}_${event.logIndex}`;
  const transfer: Transfer = {
    id: transferId,
    tokenId: BigInt(tokenId.toString()),
    from: from.toLowerCase(),
    to: to.toLowerCase(),
    timestamp,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    collection,
    chainId,
  };

  context.Transfer.set(transfer);

  // Handle mint (from zero address)
  if (from.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
    await handleMint(event, context, collection, to, tokenId, timestamp);
  }

  // Handle burn (to zero address)
  if (to.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
    await handleBurn(context, collection, tokenId, chainId);
  }

  // Update token ownership
  await updateTokenOwnership(
    context,
    collection,
    tokenId,
    from,
    to,
    timestamp,
    chainId
  );

  // Update holder balances
  await updateHolderBalances(
    context,
    collection,
    from,
    to,
    generation,
    timestamp,
    chainId
  );

  // Update collection statistics
  await updateCollectionStats(context, collection, from, to, timestamp, chainId);

  // Update global collection statistics
  await updateGlobalCollectionStat(context, collection, timestamp);
}

/**
 * Handles NFT mint events
 */
async function handleMint(
  event: any,
  context: any,
  collection: string,
  to: string,
  tokenId: any,
  timestamp: bigint
) {
  const mintId = `${event.transaction.hash}_${event.logIndex}_mint`;
  const mint: Mint = {
    id: mintId,
    tokenId: BigInt(tokenId.toString()),
    to: to.toLowerCase(),
    timestamp,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    collection,
    chainId: event.chainId,
  };

  context.Mint.set(mint);
}

/**
 * Handles NFT burn events
 */
async function handleBurn(
  context: any,
  collection: string,
  tokenId: any,
  chainId: number
) {
  const tokenIdStr = `${collection}_${chainId}_${tokenId}`;
  const token = await context.Token.get(tokenIdStr);
  if (token) {
    // Create updated token object (immutable update)
    const updatedToken = {
      ...token,
      isBurned: true,
      owner: ZERO_ADDRESS,
    };
    context.Token.set(updatedToken);
  }
}

/**
 * Updates token ownership records
 */
async function updateTokenOwnership(
  context: any,
  collection: string,
  tokenId: any,
  from: string,
  to: string,
  timestamp: bigint,
  chainId: number
) {
  const tokenIdStr = `${collection}_${chainId}_${tokenId}`;
  let token = await context.Token.get(tokenIdStr);

  if (!token) {
    token = {
      id: tokenIdStr,
      collection,
      chainId,
      tokenId: BigInt(tokenId.toString()),
      owner: to.toLowerCase(),
      isBurned: to.toLowerCase() === ZERO_ADDRESS.toLowerCase(),
      mintedAt: from.toLowerCase() === ZERO_ADDRESS.toLowerCase() ? timestamp : BigInt(0),
      lastTransferTime: timestamp,
    };
  } else {
    // Create updated token object (immutable update)
    token = {
      ...token,
      owner: to.toLowerCase(),
      isBurned: to.toLowerCase() === ZERO_ADDRESS.toLowerCase(),
      lastTransferTime: timestamp,
    };
  }

  context.Token.set(token);
}

/**
 * Updates holder balance records
 */
async function updateHolderBalances(
  context: any,
  collection: string,
  from: string,
  to: string,
  generation: number,
  timestamp: bigint,
  chainId: number
) {
  const fromLower = from.toLowerCase();
  const toLower = to.toLowerCase();

  // Update 'from' holder (if not zero address)
  if (fromLower !== ZERO_ADDRESS.toLowerCase()) {
    const fromHolderId = `${collection}_${chainId}_${fromLower}`;
    let fromHolder = await context.Holder.get(fromHolderId);

    if (fromHolder && fromHolder.balance > 0) {
      // Create updated holder object (immutable update)
      const updatedFromHolder = {
        ...fromHolder,
        balance: fromHolder.balance - 1,
        lastActivityTime: timestamp,
      };
      context.Holder.set(updatedFromHolder);
    }

    // Update user balance
    await updateUserBalance(
      context,
      fromLower,
      generation,
      chainId,
      -1,
      false,
      timestamp
    );
  }

  // Update 'to' holder (if not zero address)
  if (toLower !== ZERO_ADDRESS.toLowerCase()) {
    const toHolderId = `${collection}_${chainId}_${toLower}`;
    let toHolder = await context.Holder.get(toHolderId);

    if (!toHolder) {
      toHolder = {
        id: toHolderId,
        address: toLower,
        balance: 0,
        totalMinted: 0,
        lastActivityTime: timestamp,
        firstMintTime: fromLower === ZERO_ADDRESS.toLowerCase() ? timestamp : undefined,
        collection,
        chainId,
      };
    }

    // Create updated holder object (immutable update)
    const updatedToHolder = {
      ...toHolder,
      balance: toHolder.balance + 1,
      lastActivityTime: timestamp,
      totalMinted:
        fromLower === ZERO_ADDRESS.toLowerCase()
          ? toHolder.totalMinted + 1
          : toHolder.totalMinted,
      firstMintTime:
        fromLower === ZERO_ADDRESS.toLowerCase() && !toHolder.firstMintTime
          ? timestamp
          : toHolder.firstMintTime,
    };

    context.Holder.set(updatedToHolder);

    // Update user balance
    await updateUserBalance(
      context,
      toLower,
      generation,
      chainId,
      1,
      fromLower === ZERO_ADDRESS.toLowerCase(),
      timestamp
    );
  }
}

/**
 * Updates user balance across all chains
 */
async function updateUserBalance(
  context: any,
  address: string,
  generation: number,
  chainId: number,
  balanceDelta: number,
  isMint: boolean,
  timestamp: bigint
) {
  const userBalanceId = `${generation}_${address}`;
  let userBalance = await context.UserBalance.get(userBalanceId);

  if (!userBalance) {
    userBalance = {
      id: userBalanceId,
      address,
      generation,
      balanceHomeChain: 0,
      balanceEthereum: 0,
      balanceBerachain: 0,
      balanceTotal: 0,
      mintedHomeChain: 0,
      mintedEthereum: 0,
      mintedBerachain: 0,
      mintedTotal: 0,
      lastActivityTime: timestamp,
      firstMintTime: isMint ? timestamp : undefined,
    };
  }

  // Update balances based on chain
  const homeChainId = HOME_CHAIN_IDS[generation];

  // Create updated user balance object (immutable update)
  const updatedUserBalance = {
    ...userBalance,
    balanceHomeChain:
      chainId === homeChainId
        ? Math.max(0, userBalance.balanceHomeChain + balanceDelta)
        : userBalance.balanceHomeChain,
    balanceEthereum:
      chainId === 1
        ? Math.max(0, userBalance.balanceEthereum + balanceDelta)
        : userBalance.balanceEthereum,
    balanceBerachain:
      chainId === BERACHAIN_TESTNET_ID
        ? Math.max(0, userBalance.balanceBerachain + balanceDelta)
        : userBalance.balanceBerachain,
    balanceTotal: Math.max(0, userBalance.balanceTotal + balanceDelta),
    mintedHomeChain:
      chainId === homeChainId && isMint
        ? userBalance.mintedHomeChain + 1
        : userBalance.mintedHomeChain,
    mintedEthereum:
      chainId === 1 && isMint
        ? userBalance.mintedEthereum + 1
        : userBalance.mintedEthereum,
    mintedBerachain:
      chainId === BERACHAIN_TESTNET_ID && isMint
        ? userBalance.mintedBerachain + 1
        : userBalance.mintedBerachain,
    mintedTotal: isMint ? userBalance.mintedTotal + 1 : userBalance.mintedTotal,
    firstMintTime:
      isMint && !userBalance.firstMintTime
        ? timestamp
        : userBalance.firstMintTime,
    lastActivityTime: timestamp,
  };

  context.UserBalance.set(updatedUserBalance);
}

/**
 * Updates collection statistics
 */
async function updateCollectionStats(
  context: any,
  collection: string,
  from: string,
  to: string,
  timestamp: bigint,
  chainId: number
) {
  const statsId = `${collection}_${chainId}`;
  let stats = await context.CollectionStat.get(statsId);

  if (!stats) {
    stats = {
      id: statsId,
      collection,
      totalSupply: 0,
      totalMinted: 0,
      totalBurned: 0,
      uniqueHolders: 0,
      lastMintTime: undefined,
      chainId,
    };
  }

  // Update unique holders count based on transfer
  // We track this incrementally instead of querying all holders
  let uniqueHoldersAdjustment = 0;
  
  // If this is a transfer TO a new holder (not from mint)
  if (to.toLowerCase() !== ZERO_ADDRESS.toLowerCase()) {
    const toHolderId = `${collection}_${chainId}_${to.toLowerCase()}`;
    const toHolder = await context.Holder.get(toHolderId);
    // If this holder didn't exist or had 0 balance, increment unique holders
    if (!toHolder || toHolder.balance === 0) {
      uniqueHoldersAdjustment += 1;
    }
  }
  
  // If this is a transfer FROM a holder (not to burn)
  if (from.toLowerCase() !== ZERO_ADDRESS.toLowerCase()) {
    const fromHolderId = `${collection}_${chainId}_${from.toLowerCase()}`;
    const fromHolder = await context.Holder.get(fromHolderId);
    // If this holder will have 0 balance after transfer, decrement unique holders
    if (fromHolder && fromHolder.balance === 1) {
      uniqueHoldersAdjustment -= 1;
    }
  }

  // Create updated stats object (immutable update)
  const updatedStats = {
    ...stats,
    totalSupply:
      from.toLowerCase() === ZERO_ADDRESS.toLowerCase()
        ? stats.totalSupply + 1
        : to.toLowerCase() === ZERO_ADDRESS.toLowerCase()
        ? stats.totalSupply - 1
        : stats.totalSupply,
    totalMinted:
      from.toLowerCase() === ZERO_ADDRESS.toLowerCase()
        ? stats.totalMinted + 1
        : stats.totalMinted,
    totalBurned:
      to.toLowerCase() === ZERO_ADDRESS.toLowerCase()
        ? stats.totalBurned + 1
        : stats.totalBurned,
    lastMintTime:
      from.toLowerCase() === ZERO_ADDRESS.toLowerCase()
        ? timestamp
        : stats.lastMintTime,
    uniqueHolders: Math.max(0, stats.uniqueHolders + uniqueHoldersAdjustment),
  };

  context.CollectionStat.set(updatedStats);
}

/**
 * Updates global collection statistics across all chains
 */
export async function updateGlobalCollectionStat(
  context: any,
  collection: string,
  timestamp: bigint
) {
  const generation = COLLECTION_TO_GENERATION[collection] ?? -1;
  if (generation < 0) return;

  const homeChainId = HOME_CHAIN_IDS[generation];
  const proxyAddress = PROXY_CONTRACTS[collection]?.toLowerCase();

  // For now, we'll skip aggregating from all chains
  // This would require maintaining running totals in the global stat itself
  // TODO: Implement incremental updates to global stats
  return;

  // Implementation removed due to getMany limitations
  // This functionality would need to be handled differently in Envio
  // Consider using a separate aggregation service or maintaining running totals
}

// Export individual handlers for each contract
export const handleHoneyJarTransfer = HoneyJar.Transfer.handler(
  async ({ event, context }) => {
    await handleTransfer(event, context);
  }
);

export const handleHoneycombTransfer = Honeycomb.Transfer.handler(
  async ({ event, context }) => {
    await handleTransfer(event, context);
  }
);

export const handleHoneyJar2EthTransfer = HoneyJar2Eth.Transfer.handler(
  async ({ event, context }) => {
    await handleTransfer(event, context, "HoneyJar2");
  }
);

export const handleHoneyJar3EthTransfer = HoneyJar3Eth.Transfer.handler(
  async ({ event, context }) => {
    await handleTransfer(event, context, "HoneyJar3");
  }
);

export const handleHoneyJar4EthTransfer = HoneyJar4Eth.Transfer.handler(
  async ({ event, context }) => {
    await handleTransfer(event, context, "HoneyJar4");
  }
);

export const handleHoneyJar5EthTransfer = HoneyJar5Eth.Transfer.handler(
  async ({ event, context }) => {
    await handleTransfer(event, context, "HoneyJar5");
  }
);