/*
 * THJ Indexer - Complete Event Handlers with Supply Tracking
 * Includes GlobalCollectionStat for cross-chain aggregation and proxy bridge handling
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
  MoneycombVault,
  Token,
  Transfer,
  UserBalance,
  UserVaultSummary,
  Vault,
  VaultActivity,
} from "generated";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const BERACHAIN_ID = 80094;

// Kingdomly proxy bridge contracts (these hold NFTs when bridged to Berachain)
const PROXY_CONTRACTS: Record<string, string> = {
  HoneyJar1: "0xe0b791529f7876dc2b9d748a2e6570e605f40e5e",
  HoneyJar2: "0xd1d5df5f85c0fcbdc5c9757272de2ee5296ed512",
  HoneyJar3: "0x3992605f13bc182c0b0c60029fcbb21c0626a5f1",
  HoneyJar4: "0xeeaa4926019eaed089b8b66b544deb320c04e421",
  HoneyJar5: "0x00331b0e835c511489dba62a2b16b8fa380224f9",
  HoneyJar6: "0x0de0f0a9f7f1a56dafd025d0f31c31c6cb190346",
  Honeycomb: "0x33a76173680427cba3ffc3a625b7bc43b08ce0c5",
};

// Address to collection mapping (includes all contracts)
const ADDRESS_TO_COLLECTION: Record<string, string> = {
  // Ethereum mainnet
  "0xa20cf9b0874c3e46b344deaeea9c2e0c3e1db37d": "HoneyJar1",
  "0x98dc31a9648f04e23e4e36b0456d1951531c2a05": "HoneyJar6",
  "0xcb0477d1af5b8b05795d89d59f4667b59eae9244": "Honeycomb",
  // Ethereum L0 reminted contracts (when bridged from native chains)
  "0x3f4dd25ba6fb6441bfd1a869cbda6a511966456d": "HoneyJar2",
  "0x49f3915a52e137e597d6bf11c73e78c68b082297": "HoneyJar3",
  "0x0b820623485dcfb1c40a70c55755160f6a42186d": "HoneyJar4",
  "0x39eb35a84752b4bd3459083834af1267d276a54c": "HoneyJar5",
  // Arbitrum
  "0x1b2751328f41d1a0b91f3710edcd33e996591b72": "HoneyJar2",
  // Zora
  "0xe798c4d40bc050bc93c7f3b149a0dfe5cfc49fb0": "HoneyJar3",
  // Optimism
  "0xe1d16cc75c9f39a2e0f5131eb39d4b634b23f301": "HoneyJar4",
  // Base
  "0xbad7b49d985bbfd3a22706c447fb625a28f048b4": "HoneyJar5",
  // Berachain
  "0xedc5dfd6f37464cc91bbce572b6fe2c97f1bc7b3": "HoneyJar1",
  "0x1c6c24cac266c791c4ba789c3ec91f04331725bd": "HoneyJar2",
  "0xf1e4a550772fabfc35b28b51eb8d0b6fcd1c4878": "HoneyJar3",
  "0xdb602ab4d6bd71c8d11542a9c8c936877a9a4f45": "HoneyJar4",
  "0x0263728e7f59f315c17d3c180aeade027a375f17": "HoneyJar5",
  "0xb62a9a21d98478f477e134e175fd2003c15cb83a": "HoneyJar6",
  "0x886d2176d899796cd1affa07eff07b9b2b80f1be": "Honeycomb",
};

const COLLECTION_TO_GENERATION: Record<string, number> = {
  HoneyJar1: 1,
  HoneyJar2: 2,
  HoneyJar3: 3,
  HoneyJar4: 4,
  HoneyJar5: 5,
  HoneyJar6: 6,
  Honeycomb: 0,
};

const HOME_CHAIN_IDS: Record<number, number> = {
  1: 1, // Gen 1 - Ethereum
  2: 42161, // Gen 2 - Arbitrum
  3: 7777777, // Gen 3 - Zora
  4: 10, // Gen 4 - Optimism
  5: 8453, // Gen 5 - Base
  6: 1, // Gen 6 - Ethereum
  0: 1, // Honeycomb - Ethereum
};

// Helper function to update global collection statistics
async function updateGlobalCollectionStat(
  context: any,
  collection: string,
  timestamp: bigint
) {
  const generation = COLLECTION_TO_GENERATION[collection] ?? -1;
  if (generation < 0) return;

  const homeChainId = HOME_CHAIN_IDS[generation];
  const proxyAddress = PROXY_CONTRACTS[collection]?.toLowerCase();

  // Aggregate stats from all chains
  let homeChainSupply = 0;
  let ethereumSupply = 0;
  let berachainSupply = 0;
  let proxyLockedSupply = 0;
  let totalMinted = 0;
  let totalBurned = 0;

  // Get all collection stats for this collection across chains
  const allStatsIds = [
    `${collection}-1`, // Ethereum
    `${collection}-10`, // Optimism
    `${collection}-8453`, // Base
    `${collection}-42161`, // Arbitrum
    `${collection}-7777777`, // Zora
    `${collection}-80094`, // Berachain
  ];

  for (const statsId of allStatsIds) {
    const stat = await context.CollectionStat.get(statsId);
    if (stat) {
      totalMinted += stat.totalMinted || 0;
      totalBurned += stat.totalBurned || 0;

      if (stat.chainId === homeChainId) {
        homeChainSupply = stat.totalSupply || 0;
      } else if (stat.chainId === 1 && homeChainId !== 1) {
        ethereumSupply = stat.totalSupply || 0;
      } else if (stat.chainId === BERACHAIN_ID) {
        berachainSupply = stat.totalSupply || 0;
      }
    }
  }

  // Count tokens locked in proxy (we'll need to track this separately)
  // For now, we'll estimate based on the difference
  if (proxyAddress) {
    // In a real implementation, we'd query Token entities where owner === proxyAddress
    // For now, we'll calculate based on the minted on Berachain
    proxyLockedSupply = berachainSupply; // Approximation
  }

  // Calculate true circulating supply
  // Simple formula: total minted minus total burned across all chains
  const circulatingSupply = totalMinted - totalBurned;

  // Update or create global stat
  const globalStatId = collection;
  const existingGlobalStat = await context.GlobalCollectionStat.get(
    globalStatId
  );

  const globalStat: GlobalCollectionStat = {
    id: globalStatId,
    collection: collection,
    circulatingSupply: circulatingSupply,
    homeChainSupply: homeChainSupply - proxyLockedSupply,
    ethereumSupply: ethereumSupply,
    berachainSupply: berachainSupply,
    proxyLockedSupply: proxyLockedSupply,
    totalMinted: totalMinted,
    totalBurned: totalBurned,
    uniqueHoldersTotal: 0, // Will implement holder aggregation later
    lastUpdateTime: timestamp,
    homeChainId: homeChainId,
  };

  context.GlobalCollectionStat.set(globalStat);
}

// Main transfer handler for HoneyJar contracts
async function handleTransfer(
  event: any,
  context: any,
  collectionOverride?: string
) {
  const from = event.params.from.toLowerCase();
  const to = event.params.to.toLowerCase();
  const tokenId = event.params.tokenId;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  const chainId = event.chainId;
  const txHash = event.transaction.hash;
  const isMint = from === ZERO_ADDRESS;
  const isBurn = to === ZERO_ADDRESS;

  // Determine collection from contract address or use override
  const contractAddress = event.srcAddress.toLowerCase();
  const collection =
    collectionOverride || ADDRESS_TO_COLLECTION[contractAddress] || "unknown";

  // Get generation and chain info
  const generation = COLLECTION_TO_GENERATION[collection] ?? -1;
  const isBerachain = chainId === BERACHAIN_ID;
  const homeChainId = HOME_CHAIN_IDS[generation];
  const isHomeChain = chainId === homeChainId;
  const isEthereum = chainId === 1;

  // Check if this is a transfer to/from a proxy bridge contract
  const proxyAddress = PROXY_CONTRACTS[collection]?.toLowerCase();
  const isToProxy = proxyAddress && to === proxyAddress;
  const isFromProxy = proxyAddress && from === proxyAddress;

  // Create Transfer entity
  const transferId = `${collection}-${chainId}-${txHash}-${event.logIndex}`;
  const transferEntity: Transfer = {
    id: transferId,
    tokenId,
    from,
    to,
    timestamp,
    blockNumber,
    transactionHash: txHash,
    collection,
    chainId,
  };
  context.Transfer.set(transferEntity);

  // Track mints for activity feed
  if (isMint) {
    const mintId = `${collection}-${chainId}-${txHash}-${event.logIndex}`;
    const mintEntity: Mint = {
      id: mintId,
      tokenId,
      to,
      timestamp,
      blockNumber,
      transactionHash: txHash,
      collection,
      chainId,
    };
    context.Mint.set(mintEntity);
  }

  // Update Token entity
  const tokenKey = `${collection}-${chainId}-${tokenId}`;
  const existingToken = await context.Token.get(tokenKey);

  if (isMint && !existingToken) {
    const newToken: Token = {
      id: tokenKey,
      collection,
      chainId,
      tokenId,
      owner: to,
      isBurned: false,
      mintedAt: timestamp,
      lastTransferTime: timestamp,
    };
    context.Token.set(newToken);
  } else if (existingToken && !existingToken.isBurned) {
    const updatedToken: Token = {
      ...existingToken,
      owner: isBurn ? ZERO_ADDRESS : isToProxy ? proxyAddress || to : to,
      isBurned: isBurn,
      lastTransferTime: timestamp,
    };
    context.Token.set(updatedToken);
  }

  // Update Holder balances (excluding proxy addresses)
  if (!isMint && !isFromProxy) {
    const fromHolderId = `${from}-${collection}-${chainId}`;
    const fromHolder = await context.Holder.get(fromHolderId);
    if (fromHolder && fromHolder.balance > 0) {
      const updatedFrom: Holder = {
        ...fromHolder,
        balance: Math.max(0, fromHolder.balance - 1),
        lastActivityTime: timestamp,
      };
      context.Holder.set(updatedFrom);
    }
  }

  if (!isBurn && !isToProxy) {
    const toHolderId = `${to}-${collection}-${chainId}`;
    const existingTo = await context.Holder.get(toHolderId);
    if (existingTo) {
      const updatedTo: Holder = {
        ...existingTo,
        balance: existingTo.balance + 1,
        totalMinted: isMint
          ? existingTo.totalMinted + 1
          : existingTo.totalMinted,
        lastActivityTime: timestamp,
      };
      context.Holder.set(updatedTo);
    } else {
      const newTo: Holder = {
        id: toHolderId,
        address: to,
        balance: 1,
        totalMinted: isMint ? 1 : 0,
        lastActivityTime: timestamp,
        firstMintTime: isMint ? timestamp : undefined,
        collection,
        chainId,
      };
      context.Holder.set(newTo);
    }
  }

  // Update UserBalance (cross-chain totals)
  if (generation >= 0) {
    // Update "from" user balance
    if (!isMint && !isFromProxy) {
      const fromUserId = `${from}-gen${generation}`;
      const fromUser = await context.UserBalance.get(fromUserId);
      if (fromUser) {
        const newHomeBalance = isHomeChain
          ? Math.max(0, fromUser.balanceHomeChain - 1)
          : fromUser.balanceHomeChain;
        const newEthereumBalance =
          isEthereum && !isHomeChain
            ? Math.max(0, fromUser.balanceEthereum - 1)
            : fromUser.balanceEthereum;
        const newBeraBalance = isBerachain
          ? Math.max(0, fromUser.balanceBerachain - 1)
          : fromUser.balanceBerachain;
        const updatedFromUser: UserBalance = {
          ...fromUser,
          balanceHomeChain: newHomeBalance,
          balanceEthereum: newEthereumBalance,
          balanceBerachain: newBeraBalance,
          balanceTotal: newHomeBalance + newEthereumBalance + newBeraBalance,
          lastActivityTime: timestamp,
        };
        context.UserBalance.set(updatedFromUser);
      }
    }

    // Update "to" user balance
    if (!isBurn && !isToProxy) {
      const toUserId = `${to}-gen${generation}`;
      const toUser = await context.UserBalance.get(toUserId);
      if (toUser) {
        const newHomeBalance = isHomeChain
          ? toUser.balanceHomeChain + 1
          : toUser.balanceHomeChain;
        const newEthereumBalance =
          isEthereum && !isHomeChain
            ? toUser.balanceEthereum + 1
            : toUser.balanceEthereum;
        const newBeraBalance = isBerachain
          ? toUser.balanceBerachain + 1
          : toUser.balanceBerachain;
        const newMintedHome =
          isMint && isHomeChain
            ? toUser.mintedHomeChain + 1
            : toUser.mintedHomeChain;
        const newMintedEth =
          isMint && isEthereum && !isHomeChain
            ? toUser.mintedEthereum + 1
            : toUser.mintedEthereum;
        const newMintedBera =
          isMint && isBerachain
            ? toUser.mintedBerachain + 1
            : toUser.mintedBerachain;
        const updatedToUser: UserBalance = {
          ...toUser,
          balanceHomeChain: newHomeBalance,
          balanceEthereum: newEthereumBalance,
          balanceBerachain: newBeraBalance,
          balanceTotal: newHomeBalance + newEthereumBalance + newBeraBalance,
          mintedHomeChain: newMintedHome,
          mintedEthereum: newMintedEth,
          mintedBerachain: newMintedBera,
          mintedTotal: newMintedHome + newMintedEth + newMintedBera,
          lastActivityTime: timestamp,
        };
        context.UserBalance.set(updatedToUser);
      } else {
        const newUser: UserBalance = {
          id: toUserId,
          address: to,
          generation,
          balanceHomeChain: isHomeChain ? 1 : 0,
          balanceEthereum: isEthereum && !isHomeChain ? 1 : 0,
          balanceBerachain: isBerachain ? 1 : 0,
          balanceTotal: 1,
          mintedHomeChain: isMint && isHomeChain ? 1 : 0,
          mintedEthereum: isMint && isEthereum && !isHomeChain ? 1 : 0,
          mintedBerachain: isMint && isBerachain ? 1 : 0,
          mintedTotal: isMint ? 1 : 0,
          lastActivityTime: timestamp,
          firstMintTime: isMint ? timestamp : undefined,
        };
        context.UserBalance.set(newUser);
      }
    }
  }

  // Update CollectionStat
  const statsId = `${collection}-${chainId}`;
  const existingStats = await context.CollectionStat.get(statsId);

  if (existingStats) {
    let supplyChange = 0;
    let mintedChange = 0;
    let burnedChange = 0;

    if (isMint) {
      supplyChange = 1;
      mintedChange = 1;
    } else if (isBurn) {
      supplyChange = -1;
      burnedChange = 1;
    }

    const updatedStats: CollectionStat = {
      ...existingStats,
      totalSupply: Math.max(0, existingStats.totalSupply + supplyChange),
      totalMinted: existingStats.totalMinted + mintedChange,
      totalBurned: existingStats.totalBurned + burnedChange,
      lastMintTime: isMint ? timestamp : existingStats.lastMintTime,
    };
    context.CollectionStat.set(updatedStats);
  } else if (isMint) {
    const initialStats: CollectionStat = {
      id: statsId,
      collection,
      totalSupply: 1,
      totalMinted: 1,
      totalBurned: 0,
      uniqueHolders: 1,
      lastMintTime: timestamp,
      chainId,
    };
    context.CollectionStat.set(initialStats);
  }

  // Update global collection statistics
  await updateGlobalCollectionStat(context, collection, timestamp);
}

// HoneyJar Transfer Handler
HoneyJar.Transfer.handler(async ({ event, context }) => {
  await handleTransfer(event, context);
});

// Honeycomb Transfer Handler
Honeycomb.Transfer.handler(async ({ event, context }) => {
  await handleTransfer(event, context, "Honeycomb");
});

// ==============================
// MoneycombVault Event Handlers
// ==============================

MoneycombVault.AccountOpened.handler(async ({ event, context }) => {
  const user = event.params.user.toLowerCase();
  const accountIndex = Number(event.params.accountIndex);
  const honeycombId = event.params.honeycombId;
  const timestamp = BigInt(event.block.timestamp);

  const vaultId = `${user}-${accountIndex}`;
  const activityId = `${event.transaction.hash}-${event.logIndex}`;

  const newVault: Vault = {
    id: vaultId,
    user,
    accountIndex,
    honeycombId,
    isActive: true,
    shares: BigInt(0),
    totalBurned: 0,
    burnedGen1: false,
    burnedGen2: false,
    burnedGen3: false,
    burnedGen4: false,
    burnedGen5: false,
    burnedGen6: false,
    createdAt: timestamp,
    closedAt: undefined,
    lastActivityTime: timestamp,
  };
  context.Vault.set(newVault);

  const newActivity: VaultActivity = {
    id: activityId,
    user,
    accountIndex,
    activityType: "opened",
    timestamp,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    honeycombId,
    hjGen: undefined,
    shares: undefined,
    reward: undefined,
  };
  context.VaultActivity.set(newActivity);

  const summary = await context.UserVaultSummary.get(user);
  if (summary) {
    const updated: UserVaultSummary = {
      ...summary,
      totalVaults: summary.totalVaults + 1,
      activeVaults: summary.activeVaults + 1,
      lastActivityTime: timestamp,
    };
    context.UserVaultSummary.set(updated);
  } else {
    const created: UserVaultSummary = {
      id: user,
      user,
      totalVaults: 1,
      activeVaults: 1,
      totalShares: BigInt(0),
      totalRewardsClaimed: BigInt(0),
      totalHJsBurned: 0,
      firstVaultTime: timestamp,
      lastActivityTime: timestamp,
    };
    context.UserVaultSummary.set(created);
  }
});

MoneycombVault.HJBurned.handler(async ({ event, context }) => {
  const user = event.params.user.toLowerCase();
  const accountIndex = Number(event.params.accountIndex);
  const hjGen = Number(event.params.hjGen);
  const timestamp = BigInt(event.block.timestamp);

  const vaultId = `${user}-${accountIndex}`;
  const activityId = `${event.transaction.hash}-${event.logIndex}`;

  const vault = await context.Vault.get(vaultId);
  if (vault) {
    const burnedGenField = `burnedGen${hjGen}` as keyof Vault;
    const updated: Vault = {
      ...vault,
      totalBurned: vault.totalBurned + 1,
      [burnedGenField]: true,
      lastActivityTime: timestamp,
    };
    context.Vault.set(updated);
  }

  const activity: VaultActivity = {
    id: activityId,
    user,
    accountIndex,
    activityType: "burned",
    timestamp,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    hjGen,
    honeycombId: undefined,
    shares: undefined,
    reward: undefined,
  };
  context.VaultActivity.set(activity);

  const summary = await context.UserVaultSummary.get(user);
  if (summary) {
    const updatedSummary: UserVaultSummary = {
      ...summary,
      totalHJsBurned: summary.totalHJsBurned + 1,
      lastActivityTime: timestamp,
    };
    context.UserVaultSummary.set(updatedSummary);
  }
});

MoneycombVault.SharesMinted.handler(async ({ event, context }) => {
  const user = event.params.user.toLowerCase();
  const accountIndex = Number(event.params.accountIndex);
  const shares = event.params.shares;
  const timestamp = BigInt(event.block.timestamp);

  const vaultId = `${user}-${accountIndex}`;
  const activityId = `${event.transaction.hash}-${event.logIndex}`;

  const vault = await context.Vault.get(vaultId);
  if (vault) {
    const updated: Vault = {
      ...vault,
      shares: vault.shares + shares,
      lastActivityTime: timestamp,
    };
    context.Vault.set(updated);
  }

  const activity: VaultActivity = {
    id: activityId,
    user,
    accountIndex,
    activityType: "shares_minted",
    timestamp,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    shares,
    hjGen: undefined,
    honeycombId: undefined,
    reward: undefined,
  };
  context.VaultActivity.set(activity);

  const summary = await context.UserVaultSummary.get(user);
  if (summary) {
    const updatedSummary: UserVaultSummary = {
      ...summary,
      totalShares: summary.totalShares + shares,
      lastActivityTime: timestamp,
    };
    context.UserVaultSummary.set(updatedSummary);
  }
});

MoneycombVault.RewardClaimed.handler(async ({ event, context }) => {
  const user = event.params.user.toLowerCase();
  const reward = event.params.reward;
  const timestamp = BigInt(event.block.timestamp);

  const activityId = `${event.transaction.hash}-${event.logIndex}`;

  const activity: VaultActivity = {
    id: activityId,
    user,
    accountIndex: 0,
    activityType: "claimed",
    timestamp,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    reward,
    hjGen: undefined,
    honeycombId: undefined,
    shares: undefined,
  };
  context.VaultActivity.set(activity);

  const summary = await context.UserVaultSummary.get(user);
  if (summary) {
    const updatedSummary: UserVaultSummary = {
      ...summary,
      totalRewardsClaimed: summary.totalRewardsClaimed + reward,
      lastActivityTime: timestamp,
    };
    context.UserVaultSummary.set(updatedSummary);
  }
});

MoneycombVault.AccountClosed.handler(async ({ event, context }) => {
  const user = event.params.user.toLowerCase();
  const accountIndex = Number(event.params.accountIndex);
  const honeycombId = event.params.honeycombId;
  const timestamp = BigInt(event.block.timestamp);

  const vaultId = `${user}-${accountIndex}`;
  const activityId = `${event.transaction.hash}-${event.logIndex}`;

  const vault = await context.Vault.get(vaultId);
  if (vault) {
    const updated: Vault = {
      ...vault,
      isActive: false,
      closedAt: timestamp,
      lastActivityTime: timestamp,
    };
    context.Vault.set(updated);
  }

  const activity: VaultActivity = {
    id: activityId,
    user,
    accountIndex,
    activityType: "closed",
    timestamp,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    honeycombId,
    hjGen: undefined,
    shares: undefined,
    reward: undefined,
  };
  context.VaultActivity.set(activity);

  const summary = await context.UserVaultSummary.get(user);
  if (summary && summary.activeVaults > 0) {
    const updatedSummary: UserVaultSummary = {
      ...summary,
      activeVaults: Math.max(0, summary.activeVaults - 1),
      lastActivityTime: timestamp,
    };
    context.UserVaultSummary.set(updatedSummary);
  }
});
// Handlers for bridged HoneyJar contracts on Ethereum
HoneyJar2Eth.Transfer.handler(async ({ event, context }) => {
  await handleTransfer(event, context, "HoneyJar2");
});

HoneyJar3Eth.Transfer.handler(async ({ event, context }) => {
  await handleTransfer(event, context, "HoneyJar3");
});

HoneyJar4Eth.Transfer.handler(async ({ event, context }) => {
  await handleTransfer(event, context, "HoneyJar4");
});

HoneyJar5Eth.Transfer.handler(async ({ event, context }) => {
  await handleTransfer(event, context, "HoneyJar5");
});
