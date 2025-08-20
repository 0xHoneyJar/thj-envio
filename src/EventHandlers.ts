/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import {
  HoneyJar,
  HoneyJar_Approval,
  HoneyJar_ApprovalForAll,
  HoneyJar_BaseURISet,
  HoneyJar_OwnershipTransferred,
  HoneyJar_SetGenerated,
  HoneyJar_Transfer,
  MoneycombVault,
  Transfer,
  Holder,
  CollectionStat,
  Mint,
  UserBalance,
  Vault,
  VaultActivity,
  UserVaultSummary,
} from "generated";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ADDRESS_TO_COLLECTION: Record<string, string> = {
  // mainnet
  "0xa20cf9b0874c3e46b344deaaea9c2e0c3e1db37d": "HoneyJar1",
  "0x98dc31a9648f04e23e4e36b0456d1951531c2a05": "HoneyJar6",
  "0xcb0477d1af5b8b05795d89d59f4667b59eae9244": "Honeycomb",
  // arbitrum
  "0x1b2751328f41d1a0b91f3710edcd33e996591b72": "HoneyJar2",
  // zora
  "0xe798c4d40bc050bc93c7f3b149a0dfe5cfc49fb0": "HoneyJar3",
  // optimism
  "0xe1d16cc75c9f39a2e0f5131eb39d4b634b23f301": "HoneyJar4",
  // base
  "0xbad7b49d985bbfd3a22706c447fb625a28f048b4": "HoneyJar5",
  // berachain (map to base collections)
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
  1: 1,
  2: 42161,
  3: 7777777,
  4: 10,
  5: 8453,
  6: 1,
  0: 1,
};

HoneyJar.Transfer.handler(async ({ event, context }) => {
  // Keep the original simple event entity for reference/testing
  const basic: HoneyJar_Transfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    from: event.params.from,
    to: event.params.to,
    tokenId: event.params.tokenId,
  };
  context.HoneyJar_Transfer.set(basic);

  const from = event.params.from.toLowerCase();
  const to = event.params.to.toLowerCase();
  const tokenId = event.params.tokenId;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  const chainId = event.chainId;
  const txHash = event.transaction.hash;
  const isMint = from === ZERO_ADDRESS;

  const contractAddress = event.srcAddress.toLowerCase();
  const collection = ADDRESS_TO_COLLECTION[contractAddress] ?? "unknown";

  const transferId = `${collection}-${txHash}-${event.logIndex}`;
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

  // Track mints separately for activity feed
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

  // Update holders
  if (!isMint) {
    const fromHolderId = `${from}-${collection}-${chainId}`;
    const fromHolder = await context.Holder.get(fromHolderId);
    if (fromHolder) {
      const updatedFrom: Holder = {
        ...fromHolder,
        balance: Math.max(0, fromHolder.balance - 1),
        lastActivityTime: timestamp,
      };
      context.Holder.set(updatedFrom);
    }
  }

  let isNewToHolder = false;
  if (to !== ZERO_ADDRESS) {
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
      isNewToHolder = true;
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

  // Update cross-chain user balance summary
  const generation = COLLECTION_TO_GENERATION[collection] ?? -1;
  const isBerachain = chainId === 80094;
  const homeChainId = HOME_CHAIN_IDS[generation];
  const isHomeChain = chainId === homeChainId;

  if (generation >= 0) {
    // From user (transfer out)
    if (!isMint) {
      const fromUserId = `${from}-gen${generation}`;
      const fromUser = await context.UserBalance.get(fromUserId);
      if (fromUser) {
        const newHomeBalance = isHomeChain
          ? Math.max(0, fromUser.balanceHomeChain - 1)
          : fromUser.balanceHomeChain;
        const newBeraBalance = isBerachain
          ? Math.max(0, fromUser.balanceBerachain - 1)
          : fromUser.balanceBerachain;
        const updatedFromUser: UserBalance = {
          ...fromUser,
          balanceHomeChain: newHomeBalance,
          balanceBerachain: newBeraBalance,
          balanceTotal: newHomeBalance + newBeraBalance,
          lastActivityTime: timestamp,
        };
        context.UserBalance.set(updatedFromUser);
      }
    }

    // To user (transfer in)
    if (to !== ZERO_ADDRESS) {
      const toUserId = `${to}-gen${generation}`;
      const toUser = await context.UserBalance.get(toUserId);
      if (toUser) {
        const newHomeBalance = isHomeChain
          ? toUser.balanceHomeChain + 1
          : toUser.balanceHomeChain;
        const newBeraBalance = isBerachain
          ? toUser.balanceBerachain + 1
          : toUser.balanceBerachain;
        const newMintedHome =
          isMint && isHomeChain
            ? toUser.mintedHomeChain + 1
            : toUser.mintedHomeChain;
        const newMintedBera =
          isMint && isBerachain
            ? toUser.mintedBerachain + 1
            : toUser.mintedBerachain;
        const updatedToUser: UserBalance = {
          ...toUser,
          balanceHomeChain: newHomeBalance,
          balanceBerachain: newBeraBalance,
          balanceTotal: newHomeBalance + newBeraBalance,
          mintedHomeChain: newMintedHome,
          mintedBerachain: newMintedBera,
          mintedTotal: newMintedHome + newMintedBera,
          lastActivityTime: timestamp,
        };
        context.UserBalance.set(updatedToUser);
      } else {
        const newUser: UserBalance = {
          id: toUserId,
          address: to,
          generation,
          balanceHomeChain: isHomeChain ? 1 : 0,
          balanceBerachain: isBerachain ? 1 : 0,
          balanceTotal: 1,
          mintedHomeChain: isMint && isHomeChain ? 1 : 0,
          mintedBerachain: isMint && isBerachain ? 1 : 0,
          mintedTotal: isMint ? 1 : 0,
          lastActivityTime: timestamp,
          firstMintTime: isMint ? timestamp : undefined,
        };
        context.UserBalance.set(newUser);
      }
    }
  }

  // Update collection stats
  const statsId = `${collection}-${chainId}`;
  const existingStats = await context.CollectionStat.get(statsId);
  const currentTokenId = Number(tokenId);

  if (existingStats) {
    const shouldUpdateSupply =
      currentTokenId > (existingStats.totalSupply || 0);
    const updatedStats: CollectionStat = {
      ...existingStats,
      totalSupply: shouldUpdateSupply
        ? currentTokenId
        : existingStats.totalSupply,
      lastMintTime: isMint ? timestamp : existingStats.lastMintTime,
      uniqueHolders:
        to !== ZERO_ADDRESS && isNewToHolder
          ? existingStats.uniqueHolders + 1
          : existingStats.uniqueHolders,
    };
    context.CollectionStat.set(updatedStats);
  } else {
    const initialStats: CollectionStat = {
      id: statsId,
      collection,
      totalSupply: currentTokenId,
      uniqueHolders: to !== ZERO_ADDRESS ? 1 : 0,
      lastMintTime: isMint ? timestamp : undefined,
      chainId,
    };
    context.CollectionStat.set(initialStats);
  }
});

// ==============================
// Moneycomb Vault Event Handlers
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
    const updated: Vault = {
      ...vault,
      totalBurned: vault.totalBurned + 1,
      lastActivityTime: timestamp,
      ...(Object.fromEntries([
        [`burnedGen${hjGen}`, true],
      ]) as unknown as Partial<Vault>),
    } as Vault;
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
  if (summary) {
    const updatedSummary: UserVaultSummary = {
      ...summary,
      activeVaults: Math.max(0, summary.activeVaults - 1),
      lastActivityTime: timestamp,
    };
    context.UserVaultSummary.set(updatedSummary);
  }
});
