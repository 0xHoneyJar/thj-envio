/**
 * Set & Forgetti Vault Handlers
 *
 * Tracks ERC4626 vault deposits/withdrawals and MultiRewards staking/claiming
 * Maintains stateful position tracking and vault-level statistics
 * Supports dynamic strategy migrations with historical tracking
 */

import {
  SFVaultERC4626,
  SFMultiRewards,
  SFPosition,
  SFVaultStats,
  SFVaultStrategy,
} from "generated";

import { experimental_createEffect, S } from "envio";
import { createPublicClient, http, parseAbi, defineChain } from "viem";

import { recordAction } from "../lib/actions";

// Define Berachain since it may not be in viem/chains yet
const berachain = defineChain({
  id: 80094,
  name: "Berachain",
  nativeCurrency: {
    decimals: 18,
    name: "BERA",
    symbol: "BERA",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.berachain.com"],
    },
  },
  blockExplorers: {
    default: { name: "Berascan", url: "https://berascan.com" },
  },
});

const BERACHAIN_ID = 80094;

/**
 * Vault Configuration Mapping
 * Maps vault addresses to their initial (first) strategy, MultiRewards contract, and metadata
 * These are the original deployments - subsequent strategies are tracked via StrategyUpdated events
 */
interface VaultConfig {
  vault: string;
  multiRewards: string;
  kitchenToken: string;
  kitchenTokenSymbol: string;
  strategy: string;
}

const VAULT_CONFIGS: Record<string, VaultConfig> = {
  // HLKD1B
  "0xddb0fec6e0f94b41eedf526a9d612d125ecf2e46": {
    vault: "0xddb0fec6e0f94b41eedf526a9d612d125ecf2e46",
    multiRewards: "0xed72f22587d1c93c97e83646f1f086525bd846a4",
    kitchenToken: "0xf0edfc3e122db34773293e0e5b2c3a58492e7338",
    kitchenTokenSymbol: "HLKD1B",
    strategy: "0x7cbbed44fbfeb0892b555acba779ee7ae2a6e502",
  },
  // HLKD690M
  "0xf25b842040fbe1837a7267b406b0e68435fc2c85": {
    vault: "0xf25b842040fbe1837a7267b406b0e68435fc2c85",
    multiRewards: "0x08a7a026c184278d7a14bd7da9a7b26594900223",
    kitchenToken: "0x8ab854dc0672d7a13a85399a56cb628fb22102d6",
    kitchenTokenSymbol: "HLKD690M",
    strategy: "0x1ca44b85d2b76d5ad16d02bf1193821dc76c50ef",
  },
  // HLKD420M
  "0xa6965f4681052cc586180c22e128fb874bd9cfad": {
    vault: "0xa6965f4681052cc586180c22e128fb874bd9cfad",
    multiRewards: "0x0c1928130465ddc7ebea199b273da0b38b31effb",
    kitchenToken: "0xf07fa3ece9741d408d643748ff85710bedef25ba",
    kitchenTokenSymbol: "HLKD420M",
    strategy: "0x8d1cbdd97ab977acb8ede973539f3a3e6220eb86",
  },
  // HLKD330M
  "0xb7330861d2e92fb1a3b3987ff47ae8eecddb8254": {
    vault: "0xb7330861d2e92fb1a3b3987ff47ae8eecddb8254",
    multiRewards: "0x5b330c1afb81cc9b4a8c71252ae0fbb9f3068fb7",
    kitchenToken: "0x37dd8850919ebdca911c383211a70839a94b0539",
    kitchenTokenSymbol: "HLKD330M",
    strategy: "0x454e3e17dc36bef39bb6bf87241e176c00b3900f",
  },
  // HLKD100M
  "0x92b6c5709819ac4aa208f0586e18998d4d255a11": {
    vault: "0x92b6c5709819ac4aa208f0586e18998d4d255a11",
    multiRewards: "0xbca0546b61cd5f3855981b6d5afbda32372d931b",
    kitchenToken: "0x7bdf98ddeed209cfa26bd2352b470ac8b5485ec5",
    kitchenTokenSymbol: "HLKD100M",
    strategy: "0x79d0c58f7bedd520957af939c5a7150351a21cdb",
  },
};

/**
 * Effect to query multiRewardsAddress from a strategy contract at a specific block
 * Used when handling StrategyUpdated events to get the new MultiRewards address
 */
export const getMultiRewardsAddress = experimental_createEffect(
  {
    name: "getMultiRewardsAddress",
    input: {
      strategyAddress: S.string,
      blockNumber: S.bigint,
    },
    output: S.string,
    cache: true,
  },
  async ({ input, context }) => {
    const rpcUrl = process.env.ENVIO_RPC_URL || "https://rpc.berachain.com";
    const client = createPublicClient({
      chain: berachain,
      transport: http(rpcUrl),
    });

    try {
      const multiRewards = await client.readContract({
        address: input.strategyAddress as `0x${string}`,
        abi: parseAbi(["function multiRewardsAddress() view returns (address)"]),
        functionName: "multiRewardsAddress",
        blockNumber: input.blockNumber,
      });

      return (multiRewards as string).toLowerCase();
    } catch (error) {
      context.log.error(`Failed to get multiRewardsAddress for strategy ${input.strategyAddress} at block ${input.blockNumber}: ${error}`);
      throw error;
    }
  }
);

/**
 * Helper function to get vault info from a MultiRewards address
 * Searches through SFVaultStrategy records and falls back to hardcoded configs
 */
async function getVaultFromMultiRewards(
  context: any,
  multiRewardsAddress: string
): Promise<{ vault: string; config: VaultConfig } | null> {
  // First check hardcoded configs (for initial MultiRewards)
  for (const [vaultAddr, config] of Object.entries(VAULT_CONFIGS)) {
    if (config.multiRewards === multiRewardsAddress) {
      return { vault: vaultAddr, config };
    }
  }

  // Then search SFVaultStrategy records for dynamically registered MultiRewards
  const strategies = await context.SFVaultStrategy.getWhere.multiRewards.eq(multiRewardsAddress);

  if (strategies && strategies.length > 0) {
    const strategyRecord = strategies[0];
    const baseConfig = VAULT_CONFIGS[strategyRecord.vault];
    if (baseConfig) {
      return {
        vault: strategyRecord.vault,
        config: {
          ...baseConfig,
          strategy: strategyRecord.strategy,
          multiRewards: strategyRecord.multiRewards,
        },
      };
    }
  }

  return null;
}

/**
 * Helper function to ensure initial strategy record exists for a vault
 * Called on first deposit to bootstrap the SFVaultStrategy table
 */
async function ensureInitialStrategy(
  context: any,
  vaultAddress: string,
): Promise<void> {
  const config = VAULT_CONFIGS[vaultAddress];
  if (!config) return;

  const strategyId = `${BERACHAIN_ID}_${vaultAddress}_${config.strategy}`;
  const existing = await context.SFVaultStrategy.get(strategyId);

  if (!existing) {
    context.SFVaultStrategy.set({
      id: strategyId,
      vault: vaultAddress,
      strategy: config.strategy,
      multiRewards: config.multiRewards,
      kitchenToken: config.kitchenToken,
      kitchenTokenSymbol: config.kitchenTokenSymbol,
      activeFrom: BigInt(0), // Active from the beginning
      activeTo: undefined,
      isActive: true,
      chainId: BERACHAIN_ID,
    });
  }
}

/**
 * Helper function to get the current active strategy for a vault
 */
async function getActiveStrategy(
  context: any,
  vaultAddress: string
): Promise<{ strategy: string; multiRewards: string } | null> {
  const config = VAULT_CONFIGS[vaultAddress];
  if (!config) return null;

  // Query for active strategy
  const strategies = await context.SFVaultStrategy.getWhere.vault.eq(vaultAddress);

  if (strategies && strategies.length > 0) {
    // Find the active one
    for (const strategy of strategies) {
      if (strategy.isActive) {
        return {
          strategy: strategy.strategy,
          multiRewards: strategy.multiRewards,
        };
      }
    }
  }

  // Fall back to hardcoded config
  return {
    strategy: config.strategy,
    multiRewards: config.multiRewards,
  };
}

/**
 * Register new MultiRewards contracts dynamically when strategy is updated
 */
SFVaultERC4626.StrategyUpdated.contractRegister(async ({ event, context }) => {
  const newStrategy = event.params.newStrategy.toLowerCase();

  // Query the new strategy's multiRewardsAddress at this block
  // Note: contractRegister doesn't have access to context.effect, so we make direct RPC call
  const rpcUrl = process.env.RPC_URL || "https://rpc.berachain.com";
  const client = createPublicClient({
    chain: berachain,
    transport: http(rpcUrl),
  });

  try {
    const multiRewards = await client.readContract({
      address: newStrategy as `0x${string}`,
      abi: parseAbi(["function multiRewardsAddress() view returns (address)"]),
      functionName: "multiRewardsAddress",
      blockNumber: BigInt(event.block.number),
    });

    const newMultiRewards = (multiRewards as string).toLowerCase();

    // Register the new MultiRewards contract for indexing
    context.addSFMultiRewards(newMultiRewards);
  } catch (error) {
    context.log.error(`Failed to get multiRewardsAddress for strategy ${newStrategy}: ${error}`);
  }
});

/**
 * Handle StrategyUpdated events
 * Event: StrategyUpdated(address indexed oldStrategy, address indexed newStrategy)
 */
export const handleSFVaultStrategyUpdated = SFVaultERC4626.StrategyUpdated.handler(
  async ({ event, context }) => {
    const vaultAddress = event.srcAddress.toLowerCase();
    const oldStrategy = event.params.oldStrategy.toLowerCase();
    const newStrategy = event.params.newStrategy.toLowerCase();
    const timestamp = BigInt(event.block.timestamp);

    const config = VAULT_CONFIGS[vaultAddress];
    if (!config) {
      context.log.warn(`Unknown vault address: ${vaultAddress}`);
      return;
    }

    // Query the new strategy's multiRewardsAddress at this block
    const newMultiRewards = await context.effect(getMultiRewardsAddress, {
      strategyAddress: newStrategy,
      blockNumber: BigInt(event.block.number),
    });

    // Mark old strategy as inactive
    const oldStrategyId = `${BERACHAIN_ID}_${vaultAddress}_${oldStrategy}`;
    const oldStrategyRecord = await context.SFVaultStrategy.get(oldStrategyId);
    if (oldStrategyRecord) {
      context.SFVaultStrategy.set({
        ...oldStrategyRecord,
        activeTo: timestamp,
        isActive: false,
      });
    }

    // Create new strategy record
    const newStrategyId = `${BERACHAIN_ID}_${vaultAddress}_${newStrategy}`;
    context.SFVaultStrategy.set({
      id: newStrategyId,
      vault: vaultAddress,
      strategy: newStrategy,
      multiRewards: newMultiRewards,
      kitchenToken: config.kitchenToken,
      kitchenTokenSymbol: config.kitchenTokenSymbol,
      activeFrom: timestamp,
      activeTo: undefined,
      isActive: true,
      chainId: BERACHAIN_ID,
    });

    // Update vault stats with new strategy
    const statsId = `${BERACHAIN_ID}_${vaultAddress}`;
    const stats = await context.SFVaultStats.get(statsId);
    if (stats) {
      context.SFVaultStats.set({
        ...stats,
        strategy: newStrategy,
        lastActivityAt: timestamp,
      });
    }

    context.log.info(
      `Strategy updated for vault ${vaultAddress}: ${oldStrategy} -> ${newStrategy} (MultiRewards: ${newMultiRewards})`
    );

    // Record action for activity feed
    recordAction(context, {
      actionType: "sf_strategy_updated",
      actor: vaultAddress,
      primaryCollection: vaultAddress,
      timestamp,
      chainId: BERACHAIN_ID,
      txHash: event.transaction.hash,
      logIndex: event.logIndex,
      context: {
        vault: vaultAddress,
        oldStrategy,
        newStrategy,
        newMultiRewards,
        kitchenTokenSymbol: config.kitchenTokenSymbol,
      },
    });
  }
);

/**
 * Handle ERC4626 Deposit events
 * Event: Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)
 */
export const handleSFVaultDeposit = SFVaultERC4626.Deposit.handler(
  async ({ event, context }) => {
    const vaultAddress = event.srcAddress.toLowerCase();
    const config = VAULT_CONFIGS[vaultAddress];

    if (!config) {
      context.log.warn(`Unknown vault address: ${vaultAddress}`);
      return;
    }

    const timestamp = BigInt(event.block.timestamp);
    const owner = event.params.owner.toLowerCase();
    const assets = event.params.assets; // Kitchen tokens deposited
    const shares = event.params.shares; // Vault shares received

    // Ensure initial strategy record exists
    await ensureInitialStrategy(context, vaultAddress);

    // Get the current active strategy for this vault
    const activeStrategy = await getActiveStrategy(context, vaultAddress);
    const strategyAddress = activeStrategy?.strategy || config.strategy;
    const multiRewardsAddress = activeStrategy?.multiRewards || config.multiRewards;

    // Create position ID
    const positionId = `${BERACHAIN_ID}_${owner}_${vaultAddress}`;
    const statsId = `${BERACHAIN_ID}_${vaultAddress}`;

    // Fetch existing position and stats in parallel
    const [position, stats] = await Promise.all([
      context.SFPosition.get(positionId),
      context.SFVaultStats.get(statsId),
    ]);

    // Update or create position
    const isNewPosition = !position;
    const positionToUpdate: SFPosition = position || {
      id: positionId,
      user: owner,
      vault: vaultAddress,
      multiRewards: multiRewardsAddress,
      kitchenToken: config.kitchenToken,
      strategy: strategyAddress,
      kitchenTokenSymbol: config.kitchenTokenSymbol,
      vaultShares: BigInt(0),
      stakedShares: BigInt(0),
      totalShares: BigInt(0),
      totalDeposited: BigInt(0),
      totalWithdrawn: BigInt(0),
      totalClaimed: BigInt(0),
      firstDepositAt: timestamp,
      lastActivityAt: timestamp,
      chainId: BERACHAIN_ID,
    };

    // When depositing, shares go to vault (not staked yet)
    const newVaultShares = positionToUpdate.vaultShares + shares;
    const newTotalShares = newVaultShares + positionToUpdate.stakedShares;

    const updatedPosition = {
      ...positionToUpdate,
      vaultShares: newVaultShares,
      totalShares: newTotalShares,
      totalDeposited: positionToUpdate.totalDeposited + assets,
      lastActivityAt: timestamp,
      // Update strategy/multiRewards to current active one
      strategy: strategyAddress,
      multiRewards: multiRewardsAddress,
      // Set firstDepositAt on first deposit, or backfill if null
      firstDepositAt: positionToUpdate.firstDepositAt || timestamp,
    };

    context.SFPosition.set(updatedPosition);

    // Update or create vault stats
    const statsToUpdate: SFVaultStats = stats || {
      id: statsId,
      vault: vaultAddress,
      kitchenToken: config.kitchenToken,
      kitchenTokenSymbol: config.kitchenTokenSymbol,
      strategy: strategyAddress,
      totalDeposited: BigInt(0),
      totalWithdrawn: BigInt(0),
      totalStaked: BigInt(0),
      totalUnstaked: BigInt(0),
      totalClaimed: BigInt(0),
      uniqueDepositors: 0,
      activePositions: 0,
      depositCount: 0,
      withdrawalCount: 0,
      claimCount: 0,
      firstDepositAt: timestamp,
      lastActivityAt: timestamp,
      chainId: BERACHAIN_ID,
    };

    // Check if this deposit creates a new active position
    const previousTotalShares = position ? (position.vaultShares + position.stakedShares) : BigInt(0);
    const isNewActivePosition = previousTotalShares === BigInt(0) && newTotalShares > BigInt(0);

    const updatedStats = {
      ...statsToUpdate,
      totalDeposited: statsToUpdate.totalDeposited + assets,
      depositCount: statsToUpdate.depositCount + 1,
      lastActivityAt: timestamp,
      // Increment unique depositors if this is a new position
      uniqueDepositors: statsToUpdate.uniqueDepositors + (isNewPosition ? 1 : 0),
      // Increment active positions if totalShares went from 0 to non-zero
      activePositions: statsToUpdate.activePositions + (isNewActivePosition ? 1 : 0),
    };

    context.SFVaultStats.set(updatedStats);

    // Record action for activity feed
    recordAction(context, {
      actionType: "sf_vault_deposit",
      actor: owner,
      primaryCollection: vaultAddress,
      timestamp,
      chainId: BERACHAIN_ID,
      txHash: event.transaction.hash,
      logIndex: event.logIndex,
      numeric1: assets,  // Kitchen token amount
      numeric2: shares,  // Vault shares received
      context: {
        vault: vaultAddress,
        kitchenToken: config.kitchenToken,
        kitchenTokenSymbol: config.kitchenTokenSymbol,
        sender: event.params.sender.toLowerCase(),
      },
    });
  }
);

/**
 * Handle ERC4626 Withdraw events
 * Event: Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)
 */
export const handleSFVaultWithdraw = SFVaultERC4626.Withdraw.handler(
  async ({ event, context }) => {
    const vaultAddress = event.srcAddress.toLowerCase();
    const config = VAULT_CONFIGS[vaultAddress];

    if (!config) {
      context.log.warn(`Unknown vault address: ${vaultAddress}`);
      return;
    }

    const timestamp = BigInt(event.block.timestamp);
    const owner = event.params.owner.toLowerCase();
    const assets = event.params.assets; // Kitchen tokens withdrawn
    const shares = event.params.shares; // Vault shares burned

    // Create position ID
    const positionId = `${BERACHAIN_ID}_${owner}_${vaultAddress}`;
    const statsId = `${BERACHAIN_ID}_${vaultAddress}`;

    // Fetch existing position and stats in parallel
    const [position, stats] = await Promise.all([
      context.SFPosition.get(positionId),
      context.SFVaultStats.get(statsId),
    ]);

    // Update position if it exists
    if (position) {
      // When withdrawing, shares are burned from vault balance
      let newVaultShares = position.vaultShares - shares;

      // Ensure vaultShares doesn't go negative
      if (newVaultShares < BigInt(0)) {
        newVaultShares = BigInt(0);
      }

      const newTotalShares = newVaultShares + position.stakedShares;

      const updatedPosition = {
        ...position,
        vaultShares: newVaultShares,
        totalShares: newTotalShares,
        totalWithdrawn: position.totalWithdrawn + assets,
        lastActivityAt: timestamp,
      };
      context.SFPosition.set(updatedPosition);
    }

    // Update vault stats
    if (stats && position) {
      // Check if this withdrawal closes the position (totalShares -> 0)
      const previousTotalShares = position.totalShares;
      const newTotalShares = (position.vaultShares - shares) + position.stakedShares;
      const closedPosition = previousTotalShares > BigInt(0) && newTotalShares === BigInt(0);

      const updatedStats = {
        ...stats,
        totalWithdrawn: stats.totalWithdrawn + assets,
        withdrawalCount: stats.withdrawalCount + 1,
        // Decrement active positions if totalShares went to 0
        activePositions: stats.activePositions - (closedPosition ? 1 : 0),
        lastActivityAt: timestamp,
      };
      context.SFVaultStats.set(updatedStats);
    }

    // Record action for activity feed
    recordAction(context, {
      actionType: "sf_vault_withdraw",
      actor: owner,
      primaryCollection: vaultAddress,
      timestamp,
      chainId: BERACHAIN_ID,
      txHash: event.transaction.hash,
      logIndex: event.logIndex,
      numeric1: assets,  // Kitchen token amount
      numeric2: shares,  // Vault shares burned
      context: {
        vault: vaultAddress,
        kitchenToken: config.kitchenToken,
        kitchenTokenSymbol: config.kitchenTokenSymbol,
        receiver: event.params.receiver.toLowerCase(),
      },
    });
  }
);

/**
 * Handle MultiRewards Staked events
 * Event: Staked(address indexed user, uint256 amount)
 */
export const handleSFMultiRewardsStaked = SFMultiRewards.Staked.handler(
  async ({ event, context }) => {
    const multiRewardsAddress = event.srcAddress.toLowerCase();

    // Look up vault from MultiRewards address
    const vaultInfo = await getVaultFromMultiRewards(context, multiRewardsAddress);

    if (!vaultInfo) {
      context.log.warn(`Unknown MultiRewards address: ${multiRewardsAddress}`);
      return;
    }

    const { vault: vaultAddress, config } = vaultInfo;
    const timestamp = BigInt(event.block.timestamp);
    const user = event.params.user.toLowerCase();
    const amount = event.params.amount; // Vault shares staked

    // Create position ID
    const positionId = `${BERACHAIN_ID}_${user}_${vaultAddress}`;
    const statsId = `${BERACHAIN_ID}_${vaultAddress}`;

    // Fetch existing position and stats in parallel
    const [position, stats] = await Promise.all([
      context.SFPosition.get(positionId),
      context.SFVaultStats.get(statsId),
    ]);

    // Update position
    if (position) {
      const newStakedShares = position.stakedShares + amount;

      // When staking, shares move from vault to staked
      let newVaultShares = position.vaultShares - amount;

      // Ensure vaultShares doesn't go negative
      if (newVaultShares < BigInt(0)) {
        newVaultShares = BigInt(0);
      }

      // totalShares remains the same (just moving between buckets)
      const newTotalShares = newVaultShares + newStakedShares;

      const updatedPosition = {
        ...position,
        vaultShares: newVaultShares,
        stakedShares: newStakedShares,
        totalShares: newTotalShares,
        lastActivityAt: timestamp,
      };
      context.SFPosition.set(updatedPosition);

      // Update stats
      if (stats) {
        const updatedStats = {
          ...stats,
          totalStaked: stats.totalStaked + amount,
          lastActivityAt: timestamp,
        };
        context.SFVaultStats.set(updatedStats);
      }
    }

    // Record action for activity feed
    recordAction(context, {
      actionType: "sf_rewards_stake",
      actor: user,
      primaryCollection: vaultAddress,
      timestamp,
      chainId: BERACHAIN_ID,
      txHash: event.transaction.hash,
      logIndex: event.logIndex,
      numeric1: amount,  // Shares staked
      context: {
        vault: vaultAddress,
        multiRewards: multiRewardsAddress,
        kitchenTokenSymbol: config.kitchenTokenSymbol,
      },
    });
  }
);

/**
 * Handle MultiRewards Withdrawn events
 * Event: Withdrawn(address indexed user, uint256 amount)
 */
export const handleSFMultiRewardsWithdrawn = SFMultiRewards.Withdrawn.handler(
  async ({ event, context }) => {
    const multiRewardsAddress = event.srcAddress.toLowerCase();

    // Look up vault from MultiRewards address
    const vaultInfo = await getVaultFromMultiRewards(context, multiRewardsAddress);

    if (!vaultInfo) {
      context.log.warn(`Unknown MultiRewards address: ${multiRewardsAddress}`);
      return;
    }

    const { vault: vaultAddress, config } = vaultInfo;
    const timestamp = BigInt(event.block.timestamp);
    const user = event.params.user.toLowerCase();
    const amount = event.params.amount; // Vault shares unstaked

    // Create position ID
    const positionId = `${BERACHAIN_ID}_${user}_${vaultAddress}`;
    const statsId = `${BERACHAIN_ID}_${vaultAddress}`;

    // Fetch existing position and stats in parallel
    const [position, stats] = await Promise.all([
      context.SFPosition.get(positionId),
      context.SFVaultStats.get(statsId),
    ]);

    // Update position
    if (position) {
      let newStakedShares = position.stakedShares - amount;

      // Ensure stakedShares doesn't go negative
      if (newStakedShares < BigInt(0)) {
        newStakedShares = BigInt(0);
      }

      // When unstaking, shares move from staked to vault
      const newVaultShares = position.vaultShares + amount;

      // totalShares remains the same (just moving between buckets)
      const newTotalShares = newVaultShares + newStakedShares;

      const updatedPosition = {
        ...position,
        vaultShares: newVaultShares,
        stakedShares: newStakedShares,
        totalShares: newTotalShares,
        lastActivityAt: timestamp,
      };
      context.SFPosition.set(updatedPosition);

      // Update stats
      if (stats) {
        const updatedStats = {
          ...stats,
          totalUnstaked: stats.totalUnstaked + amount,
          lastActivityAt: timestamp,
        };
        context.SFVaultStats.set(updatedStats);
      }
    }

    // Record action for activity feed
    recordAction(context, {
      actionType: "sf_rewards_unstake",
      actor: user,
      primaryCollection: vaultAddress,
      timestamp,
      chainId: BERACHAIN_ID,
      txHash: event.transaction.hash,
      logIndex: event.logIndex,
      numeric1: amount,  // Shares unstaked
      context: {
        vault: vaultAddress,
        multiRewards: multiRewardsAddress,
        kitchenTokenSymbol: config.kitchenTokenSymbol,
      },
    });
  }
);

/**
 * Handle MultiRewards RewardPaid events
 * Event: RewardPaid(address indexed user, address indexed rewardsToken, uint256 reward)
 */
export const handleSFMultiRewardsRewardPaid = SFMultiRewards.RewardPaid.handler(
  async ({ event, context }) => {
    const multiRewardsAddress = event.srcAddress.toLowerCase();

    // Look up vault from MultiRewards address
    const vaultInfo = await getVaultFromMultiRewards(context, multiRewardsAddress);

    if (!vaultInfo) {
      context.log.warn(`Unknown MultiRewards address: ${multiRewardsAddress}`);
      return;
    }

    const { vault: vaultAddress, config } = vaultInfo;
    const timestamp = BigInt(event.block.timestamp);
    const user = event.params.user.toLowerCase();
    const rewardsToken = event.params.rewardsToken.toLowerCase();
    const reward = event.params.reward; // HENLO amount claimed

    // Create position ID
    const positionId = `${BERACHAIN_ID}_${user}_${vaultAddress}`;
    const statsId = `${BERACHAIN_ID}_${vaultAddress}`;

    // Fetch existing position and stats in parallel
    const [position, stats] = await Promise.all([
      context.SFPosition.get(positionId),
      context.SFVaultStats.get(statsId),
    ]);

    // Update position's total claimed
    if (position) {
      const updatedPosition = {
        ...position,
        totalClaimed: position.totalClaimed + reward,
        lastActivityAt: timestamp,
      };
      context.SFPosition.set(updatedPosition);
    }

    // Update vault stats total claimed (income metric!)
    if (stats) {
      const updatedStats = {
        ...stats,
        totalClaimed: stats.totalClaimed + reward,
        claimCount: stats.claimCount + 1,
        lastActivityAt: timestamp,
      };
      context.SFVaultStats.set(updatedStats);
    }

    // Record action for activity feed
    recordAction(context, {
      actionType: "sf_rewards_claim",
      actor: user,
      primaryCollection: vaultAddress,
      timestamp,
      chainId: BERACHAIN_ID,
      txHash: event.transaction.hash,
      logIndex: event.logIndex,
      numeric1: reward,  // HENLO claimed
      context: {
        vault: vaultAddress,
        multiRewards: multiRewardsAddress,
        rewardsToken,
        kitchenTokenSymbol: config.kitchenTokenSymbol,
      },
    });
  }
);
