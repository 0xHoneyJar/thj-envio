/*
 * Aquabera Wall Tracking Handlers
 * 
 * Tracks deposits and withdrawals to the Aquabera HENLO/BERA vault.
 * Identifies contributions from the wall contract and tracks unique builders.
 */

import {
  AquaberaVault,
  AquaberaDeposit,
  AquaberaWithdrawal,
  AquaberaBuilder,
  AquaberaStats,
} from "generated";

// Wall contract address that makes special contributions
const WALL_CONTRACT_ADDRESS = "0xde81b20b6801d99efaeaced48a11ba025180b8cc";
const BERACHAIN_ID = 80094;

/*
 * Handle Deposit events - when users add liquidity to the vault
 */
export const handleAquaberaDeposit = AquaberaVault.Deposit.handler(
  async ({ event, context }) => {
    const timestamp = BigInt(event.block.timestamp);
    const depositor = event.params.owner.toLowerCase();
    const assets = event.params.assets; // BERA amount
    const shares = event.params.shares; // LP tokens received
    const isWallContribution = depositor === WALL_CONTRACT_ADDRESS.toLowerCase();

    // Create deposit record
    const depositId = `${event.transaction.hash}_${event.logIndex}`;
    const deposit: AquaberaDeposit = {
      id: depositId,
      amount: assets,
      shares: shares,
      timestamp: timestamp,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
      from: depositor,
      isWallContribution: isWallContribution,
      chainId: BERACHAIN_ID,
    };
    context.AquaberaDeposit.set(deposit);

    // Update builder stats
    const builderId = depositor;
    let builder = await context.AquaberaBuilder.get(builderId);
    
    if (!builder) {
      // New builder
      builder = {
        id: builderId,
        address: depositor,
        totalDeposited: BigInt(0),
        totalWithdrawn: BigInt(0),
        netDeposited: BigInt(0),
        currentShares: BigInt(0),
        depositCount: 0,
        withdrawalCount: 0,
        firstDepositTime: timestamp,
        lastActivityTime: timestamp,
        isWallContract: isWallContribution,
        chainId: BERACHAIN_ID,
      };
    }

    // Update builder stats with immutable pattern
    const updatedBuilder = {
      ...builder,
      totalDeposited: builder.totalDeposited + assets,
      netDeposited: builder.netDeposited + assets,
      currentShares: builder.currentShares + shares,
      depositCount: builder.depositCount + 1,
      lastActivityTime: timestamp,
    };
    context.AquaberaBuilder.set(updatedBuilder);

    // Update global stats
    const statsId = "global";
    let stats = await context.AquaberaStats.get(statsId);
    
    if (!stats) {
      // Initialize stats
      stats = {
        id: statsId,
        totalBera: BigInt(0),
        totalShares: BigInt(0),
        totalDeposited: BigInt(0),
        totalWithdrawn: BigInt(0),
        uniqueBuilders: 0,
        depositCount: 0,
        withdrawalCount: 0,
        wallContributions: BigInt(0),
        wallDepositCount: 0,
        lastUpdateTime: timestamp,
        chainId: BERACHAIN_ID,
      };
    }

    // Calculate unique builders increment
    const uniqueBuildersIncrement = !builder || builder.depositCount === 0 ? 1 : 0;

    // Update stats with immutable pattern
    const updatedStats = {
      ...stats,
      totalBera: stats.totalBera + assets,
      totalShares: stats.totalShares + shares,
      totalDeposited: stats.totalDeposited + assets,
      uniqueBuilders: stats.uniqueBuilders + uniqueBuildersIncrement,
      depositCount: stats.depositCount + 1,
      wallContributions: isWallContribution 
        ? stats.wallContributions + assets 
        : stats.wallContributions,
      wallDepositCount: isWallContribution 
        ? stats.wallDepositCount + 1 
        : stats.wallDepositCount,
      lastUpdateTime: timestamp,
    };
    context.AquaberaStats.set(updatedStats);

    // Also update chain-specific stats
    const chainStatsId = `${BERACHAIN_ID}`;
    let chainStats = await context.AquaberaStats.get(chainStatsId);
    
    if (!chainStats) {
      // Initialize chain stats
      chainStats = {
        id: chainStatsId,
        totalBera: BigInt(0),
        totalShares: BigInt(0),
        totalDeposited: BigInt(0),
        totalWithdrawn: BigInt(0),
        uniqueBuilders: 0,
        depositCount: 0,
        withdrawalCount: 0,
        wallContributions: BigInt(0),
        wallDepositCount: 0,
        lastUpdateTime: timestamp,
        chainId: BERACHAIN_ID,
      };
    }

    // Update chain stats with immutable pattern
    const updatedChainStats = {
      ...chainStats,
      totalBera: chainStats.totalBera + assets,
      totalShares: chainStats.totalShares + shares,
      totalDeposited: chainStats.totalDeposited + assets,
      uniqueBuilders: chainStats.uniqueBuilders + uniqueBuildersIncrement,
      depositCount: chainStats.depositCount + 1,
      wallContributions: isWallContribution 
        ? chainStats.wallContributions + assets 
        : chainStats.wallContributions,
      wallDepositCount: isWallContribution 
        ? chainStats.wallDepositCount + 1 
        : chainStats.wallDepositCount,
      lastUpdateTime: timestamp,
    };
    context.AquaberaStats.set(updatedChainStats);

    context.log.info(
      `Aquabera deposit: ${assets} BERA from ${depositor}${
        isWallContribution ? " (WALL CONTRIBUTION)" : ""
      } for ${shares} shares`
    );
  }
);

/*
 * Handle Withdraw events - when users remove liquidity from the vault
 */
export const handleAquaberaWithdraw = AquaberaVault.Withdraw.handler(
  async ({ event, context }) => {
    const timestamp = BigInt(event.block.timestamp);
    const withdrawer = event.params.owner.toLowerCase();
    const assets = event.params.assets; // BERA amount
    const shares = event.params.shares; // LP tokens burned

    // Create withdrawal record
    const withdrawalId = `${event.transaction.hash}_${event.logIndex}`;
    const withdrawal: AquaberaWithdrawal = {
      id: withdrawalId,
      amount: assets,
      shares: shares,
      timestamp: timestamp,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
      from: withdrawer,
      chainId: BERACHAIN_ID,
    };
    context.AquaberaWithdrawal.set(withdrawal);

    // Update builder stats
    const builderId = withdrawer;
    let builder = await context.AquaberaBuilder.get(builderId);
    
    if (builder) {
      // Update builder stats with immutable pattern
      const updatedBuilder = {
        ...builder,
        totalWithdrawn: builder.totalWithdrawn + assets,
        netDeposited: builder.netDeposited - assets,
        currentShares: builder.currentShares > shares 
          ? builder.currentShares - shares 
          : BigInt(0), // Prevent negative shares
        withdrawalCount: builder.withdrawalCount + 1,
        lastActivityTime: timestamp,
      };
      context.AquaberaBuilder.set(updatedBuilder);
    }

    // Update global stats
    const statsId = "global";
    let stats = await context.AquaberaStats.get(statsId);
    
    if (stats) {
      // Update stats with immutable pattern
      const updatedStats = {
        ...stats,
        totalBera: stats.totalBera > assets 
          ? stats.totalBera - assets 
          : BigInt(0), // Prevent negative balance
        totalShares: stats.totalShares > shares 
          ? stats.totalShares - shares 
          : BigInt(0),
        totalWithdrawn: stats.totalWithdrawn + assets,
        withdrawalCount: stats.withdrawalCount + 1,
        lastUpdateTime: timestamp,
      };
      context.AquaberaStats.set(updatedStats);
    }

    // Also update chain-specific stats
    const chainStatsId = `${BERACHAIN_ID}`;
    let chainStats = await context.AquaberaStats.get(chainStatsId);
    
    if (chainStats) {
      // Update chain stats with immutable pattern
      const updatedChainStats = {
        ...chainStats,
        totalBera: chainStats.totalBera > assets 
          ? chainStats.totalBera - assets 
          : BigInt(0),
        totalShares: chainStats.totalShares > shares 
          ? chainStats.totalShares - shares 
          : BigInt(0),
        totalWithdrawn: chainStats.totalWithdrawn + assets,
        withdrawalCount: chainStats.withdrawalCount + 1,
        lastUpdateTime: timestamp,
      };
      context.AquaberaStats.set(updatedChainStats);
    }

    context.log.info(
      `Aquabera withdrawal: ${assets} BERA to ${withdrawer} for ${shares} shares`
    );
  }
);