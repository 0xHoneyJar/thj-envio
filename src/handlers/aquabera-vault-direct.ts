/*
 * Direct Aquabera Vault Handlers
 * 
 * Tracks direct deposits and withdrawals to/from the Aquabera vault.
 * This includes wall contract deposits and any other direct vault interactions.
 */

import {
  AquaberaVaultDirect,
  AquaberaDeposit,
  AquaberaWithdrawal,
  AquaberaBuilder,
  AquaberaStats,
} from "generated";

// Wall contract address that makes special contributions (Poku Trump)
const WALL_CONTRACT_ADDRESS = "0x05c98986Fc75D63eF973C648F22687d1a8056CD6".toLowerCase();
const BERACHAIN_ID = 80094;

/*
 * Handle direct Deposit events - when someone deposits directly to the vault
 * This includes wall contract deposits
 */
export const handleDirectDeposit = AquaberaVaultDirect.Deposit.handler(
  async ({ event, context }) => {
    const timestamp = BigInt(event.block.timestamp);
    const depositor = event.params.owner.toLowerCase(); // The owner is who receives the shares
    const sender = event.params.sender.toLowerCase(); // The sender initiated the transaction
    const assets = event.params.assets; // BERA/WBERA amount deposited
    const shares = event.params.shares; // LP tokens received
    // Check both sender and owner for wall contributions (wall might be either)
    const isWallContribution = sender === WALL_CONTRACT_ADDRESS || depositor === WALL_CONTRACT_ADDRESS;

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
      isWallContract: builder.isWallContract || isWallContribution, // Mark as wall contract if any deposit is from wall
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

    context.log.info(
      `Direct vault deposit: ${assets} from ${depositor}${
        isWallContribution ? " (WALL CONTRIBUTION)" : ""
      } for ${shares} shares`
    );
  }
);

/*
 * Handle direct Withdraw events - when someone withdraws directly from the vault
 */
export const handleDirectWithdraw = AquaberaVaultDirect.Withdraw.handler(
  async ({ event, context }) => {
    const timestamp = BigInt(event.block.timestamp);
    const owner = event.params.owner.toLowerCase(); // Who owned the shares
    const receiver = event.params.receiver.toLowerCase(); // Who receives the assets
    const assets = event.params.assets; // BERA amount withdrawn
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
      from: owner,
      chainId: BERACHAIN_ID,
    };
    context.AquaberaWithdrawal.set(withdrawal);

    // Update builder stats
    const builderId = owner;
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

    context.log.info(
      `Direct vault withdrawal: ${assets} to ${receiver} for ${shares} shares`
    );
  }
);