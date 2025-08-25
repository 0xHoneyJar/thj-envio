/*
 * MoneycombVault Event Handlers
 * Handles vault operations including account management, burns, shares, and rewards
 */

import {
  MoneycombVault,
  UserVaultSummary,
  Vault,
  VaultActivity,
} from "generated";

/**
 * Handles vault account opening events
 */
export const handleAccountOpened = MoneycombVault.AccountOpened.handler(
  async ({ event, context }) => {
    const { user, accountIndex, honeycombId } = event.params;
    const userLower = user.toLowerCase();
    const timestamp = BigInt(event.block.timestamp);

    // Create vault record
    const vaultId = `${userLower}_${accountIndex}`;
    const vault: Vault = {
      id: vaultId,
      user: userLower,
      accountIndex: Number(accountIndex),
      honeycombId: BigInt(honeycombId.toString()),
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

    context.Vault.set(vault);

    // Create activity record
    const activityId = `${event.transaction.hash}_${event.logIndex}`;
    const activity: VaultActivity = {
      id: activityId,
      user: userLower,
      accountIndex: Number(accountIndex),
      activityType: "ACCOUNT_OPENED",
      timestamp,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
      honeycombId: BigInt(honeycombId.toString()),
      hjGen: undefined,
      shares: undefined,
      reward: undefined,
    };

    context.VaultActivity.set(activity);

    // Update user summary
    await updateUserVaultSummary(
      context,
      userLower,
      timestamp,
      "ACCOUNT_OPENED"
    );
  }
);

/**
 * Handles vault account closing events
 */
export const handleAccountClosed = MoneycombVault.AccountClosed.handler(
  async ({ event, context }) => {
    const { user, accountIndex, honeycombId } = event.params;
    const userLower = user.toLowerCase();
    const timestamp = BigInt(event.block.timestamp);

    // Update vault record
    const vaultId = `${userLower}_${accountIndex}`;
    const vault = await context.Vault.get(vaultId);

    if (vault) {
      // Create updated vault object (immutable update)
      const updatedVault = {
        ...vault,
        isActive: false,
        closedAt: timestamp,
        lastActivityTime: timestamp,
      };
      context.Vault.set(updatedVault);
    }

    // Create activity record
    const activityId = `${event.transaction.hash}_${event.logIndex}`;
    const activity: VaultActivity = {
      id: activityId,
      user: userLower,
      accountIndex: Number(accountIndex),
      activityType: "ACCOUNT_CLOSED",
      timestamp,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
      honeycombId: BigInt(honeycombId.toString()),
      hjGen: undefined,
      shares: undefined,
      reward: undefined,
    };

    context.VaultActivity.set(activity);

    // Update user summary
    await updateUserVaultSummary(
      context,
      userLower,
      timestamp,
      "ACCOUNT_CLOSED"
    );
  }
);

/**
 * Handles HoneyJar NFT burn events for vault
 */
export const handleHJBurned = MoneycombVault.HJBurned.handler(
  async ({ event, context }) => {
    const { user, accountIndex, hjGen } = event.params;
    const userLower = user.toLowerCase();
    const timestamp = BigInt(event.block.timestamp);
    const generation = Number(hjGen);

    // Update vault record
    const vaultId = `${userLower}_${accountIndex}`;
    const vault = await context.Vault.get(vaultId);

    if (vault) {
      // Create updated vault object (immutable update)
      const updatedVault = {
        ...vault,
        totalBurned: vault.totalBurned + 1,
        burnedGen1: generation === 1 ? true : vault.burnedGen1,
        burnedGen2: generation === 2 ? true : vault.burnedGen2,
        burnedGen3: generation === 3 ? true : vault.burnedGen3,
        burnedGen4: generation === 4 ? true : vault.burnedGen4,
        burnedGen5: generation === 5 ? true : vault.burnedGen5,
        burnedGen6: generation === 6 ? true : vault.burnedGen6,
        lastActivityTime: timestamp,
      };
      context.Vault.set(updatedVault);
    }

    // Create activity record
    const activityId = `${event.transaction.hash}_${event.logIndex}`;
    const activity: VaultActivity = {
      id: activityId,
      user: userLower,
      accountIndex: Number(accountIndex),
      activityType: "HJ_BURNED",
      timestamp,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
      honeycombId: undefined,
      hjGen: generation,
      shares: undefined,
      reward: undefined,
    };

    context.VaultActivity.set(activity);

    // Update user summary
    await updateUserVaultSummary(
      context,
      userLower,
      timestamp,
      "HJ_BURNED"
    );
  }
);

/**
 * Handles shares minting events
 */
export const handleSharesMinted = MoneycombVault.SharesMinted.handler(
  async ({ event, context }) => {
    const { user, accountIndex, shares } = event.params;
    const userLower = user.toLowerCase();
    const timestamp = BigInt(event.block.timestamp);

    // Update vault record
    const vaultId = `${userLower}_${accountIndex}`;
    const vault = await context.Vault.get(vaultId);

    if (vault) {
      // Create updated vault object (immutable update)
      const updatedVault = {
        ...vault,
        shares: vault.shares + BigInt(shares.toString()),
        lastActivityTime: timestamp,
      };
      context.Vault.set(updatedVault);
    }

    // Create activity record
    const activityId = `${event.transaction.hash}_${event.logIndex}`;
    const activity: VaultActivity = {
      id: activityId,
      user: userLower,
      accountIndex: Number(accountIndex),
      activityType: "SHARES_MINTED",
      timestamp,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
      honeycombId: undefined,
      hjGen: undefined,
      shares: BigInt(shares.toString()),
      reward: undefined,
    };

    context.VaultActivity.set(activity);

    // Update user summary
    await updateUserVaultSummary(
      context,
      userLower,
      timestamp,
      "SHARES_MINTED",
      BigInt(shares.toString())
    );
  }
);

/**
 * Handles reward claim events
 */
export const handleRewardClaimed = MoneycombVault.RewardClaimed.handler(
  async ({ event, context }) => {
    const { user, reward } = event.params;
    const userLower = user.toLowerCase();
    const timestamp = BigInt(event.block.timestamp);

    // Create activity record
    const activityId = `${event.transaction.hash}_${event.logIndex}`;
    const activity: VaultActivity = {
      id: activityId,
      user: userLower,
      accountIndex: -1, // Reward claims don't specify account
      activityType: "REWARD_CLAIMED",
      timestamp,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
      honeycombId: undefined,
      hjGen: undefined,
      shares: undefined,
      reward: BigInt(reward.toString()),
    };

    context.VaultActivity.set(activity);

    // Update user summary
    await updateUserVaultSummary(
      context,
      userLower,
      timestamp,
      "REWARD_CLAIMED",
      undefined,
      BigInt(reward.toString())
    );
  }
);

/**
 * Updates user vault summary statistics
 */
async function updateUserVaultSummary(
  context: any,
  user: string,
  timestamp: bigint,
  activityType: string,
  shares?: bigint,
  reward?: bigint
) {
  const summaryId = user;
  let summary = await context.UserVaultSummary.get(summaryId);

  if (!summary) {
    summary = {
      id: summaryId,
      user,
      totalVaults: 0,
      activeVaults: 0,
      totalShares: BigInt(0),
      totalRewardsClaimed: BigInt(0),
      totalHJsBurned: 0,
      firstVaultTime: timestamp,
      lastActivityTime: timestamp,
    };
  }

  // Create updated summary object (immutable update)
  const updatedSummary = {
    ...summary,
    totalVaults:
      activityType === "ACCOUNT_OPENED"
        ? summary.totalVaults + 1
        : summary.totalVaults,
    activeVaults:
      activityType === "ACCOUNT_OPENED"
        ? summary.activeVaults + 1
        : activityType === "ACCOUNT_CLOSED"
        ? Math.max(0, summary.activeVaults - 1)
        : summary.activeVaults,
    totalHJsBurned:
      activityType === "HJ_BURNED"
        ? summary.totalHJsBurned + 1
        : summary.totalHJsBurned,
    totalShares:
      activityType === "SHARES_MINTED" && shares
        ? summary.totalShares + shares
        : summary.totalShares,
    totalRewardsClaimed:
      activityType === "REWARD_CLAIMED" && reward
        ? summary.totalRewardsClaimed + reward
        : summary.totalRewardsClaimed,
    firstVaultTime:
      activityType === "ACCOUNT_OPENED" && !summary.firstVaultTime
        ? timestamp
        : summary.firstVaultTime,
    lastActivityTime: timestamp,
  };

  context.UserVaultSummary.set(updatedSummary);
}