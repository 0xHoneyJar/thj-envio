/*
 * CORRECTED Aquabera Vault Handlers
 * 
 * Tracks WBERA/HENLO deposits and withdrawals, not LP token amounts
 * The vault is a WBERA/HENLO liquidity pool
 */

import {
  AquaberaVaultDirect,
  AquaberaDeposit,
  AquaberaWithdrawal,
  AquaberaBuilder,
  AquaberaStats,
} from "generated";

const WALL_CONTRACT_ADDRESS = "0x05c98986Fc75D63eF973C648F22687d1a8056CD6".toLowerCase();
const BERACHAIN_ID = 80094;

/*
 * Handle direct Deposit events
 * IMPORTANT: The 'assets' field is WBERA amount, NOT LP tokens
 * The 'shares' field is LP tokens received
 */
export const handleDirectDeposit = AquaberaVaultDirect.Deposit.handler(
  async ({ event, context }) => {
    const timestamp = BigInt(event.block.timestamp);
    const depositor = event.params.owner.toLowerCase();
    const sender = event.params.sender.toLowerCase();
    
    // CRITICAL: These are the actual values
    const wberaAmount = event.params.assets; // WBERA deposited (NOT LP tokens!)
    const lpTokensReceived = event.params.shares; // LP tokens received
    
    // Check if it's a wall contribution
    const txFrom = event.transaction.from.toLowerCase();
    const isWallContribution =
      sender === WALL_CONTRACT_ADDRESS ||
      depositor === WALL_CONTRACT_ADDRESS ||
      txFrom === WALL_CONTRACT_ADDRESS;

    context.log.info(
      `Deposit: ${wberaAmount} WBERA for ${lpTokensReceived} LP tokens from ${txFrom}`
    );

    // Create deposit record with WBERA amount
    const deposit: AquaberaDeposit = {
      id: `${event.transaction.hash}_${event.logIndex}`,
      amount: wberaAmount, // Store WBERA amount, not LP tokens
      shares: lpTokensReceived,
      timestamp: timestamp,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
      from: txFrom,
      isWallContribution: isWallContribution,
      chainId: BERACHAIN_ID,
    };
    context.AquaberaDeposit.set(deposit);

    // Update builder stats with WBERA amounts
    const builderId = isWallContribution ? WALL_CONTRACT_ADDRESS : depositor;
    let builder = await context.AquaberaBuilder.get(builderId);
    
    if (!builder) {
      builder = {
        id: builderId,
        address: builderId,
        totalDeposited: BigInt(0),
        totalWithdrawn: BigInt(0),
        netDeposited: BigInt(0),
        currentShares: BigInt(0),
        depositCount: 0,
        withdrawalCount: 0,
        firstDepositTime: timestamp,
        lastActivityTime: timestamp,
        isWallContract: builderId === WALL_CONTRACT_ADDRESS,
        chainId: BERACHAIN_ID,
      };
    }

    const updatedBuilder = {
      ...builder,
      totalDeposited: builder.totalDeposited + wberaAmount, // Track WBERA
      netDeposited: builder.netDeposited + wberaAmount,
      currentShares: builder.currentShares + lpTokensReceived, // Track LP tokens separately
      depositCount: builder.depositCount + 1,
      lastActivityTime: timestamp,
      isWallContract: builder.isWallContract || (builderId === WALL_CONTRACT_ADDRESS),
    };
    context.AquaberaBuilder.set(updatedBuilder);

    // Update global stats with WBERA amounts
    const statsId = "global";
    let stats = await context.AquaberaStats.get(statsId);
    
    if (!stats) {
      stats = {
        id: statsId,
        totalBera: BigInt(0), // This tracks WBERA, not LP tokens
        totalShares: BigInt(0), // This tracks LP tokens
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

    const uniqueBuildersIncrement = !builder || builder.depositCount === 0 ? 1 : 0;

    const updatedStats = {
      ...stats,
      totalBera: stats.totalBera + wberaAmount, // Add WBERA amount
      totalShares: stats.totalShares + lpTokensReceived, // Track LP tokens separately
      totalDeposited: stats.totalDeposited + wberaAmount,
      uniqueBuilders: stats.uniqueBuilders + uniqueBuildersIncrement,
      depositCount: stats.depositCount + 1,
      wallContributions: isWallContribution
        ? stats.wallContributions + wberaAmount
        : stats.wallContributions,
      wallDepositCount: isWallContribution
        ? stats.wallDepositCount + 1
        : stats.wallDepositCount,
      lastUpdateTime: timestamp,
    };
    context.AquaberaStats.set(updatedStats);

    context.log.info(
      `Updated stats - Total WBERA: ${updatedStats.totalBera}, Total LP: ${updatedStats.totalShares}`
    );
  }
);

/*
 * Handle Withdraw events
 * IMPORTANT: The 'assets' field is WBERA received, NOT LP tokens
 * The 'shares' field is LP tokens burned
 */
export const handleDirectWithdraw = AquaberaVaultDirect.Withdraw.handler(
  async ({ event, context }) => {
    const timestamp = BigInt(event.block.timestamp);
    const owner = event.params.owner.toLowerCase();
    const receiver = event.params.receiver.toLowerCase();
    
    // CRITICAL: These are the actual values
    const wberaReceived = event.params.assets; // WBERA withdrawn (NOT LP tokens!)
    const lpTokensBurned = event.params.shares; // LP tokens burned

    context.log.info(
      `Withdraw: ${wberaReceived} WBERA for ${lpTokensBurned} LP tokens to ${receiver}`
    );

    // Create withdrawal record with WBERA amount
    const withdrawal: AquaberaWithdrawal = {
      id: `${event.transaction.hash}_${event.logIndex}`,
      amount: wberaReceived, // Store WBERA amount, not LP tokens
      shares: lpTokensBurned,
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
      const updatedBuilder = {
        ...builder,
        totalWithdrawn: builder.totalWithdrawn + wberaReceived, // Track WBERA
        netDeposited: builder.netDeposited > wberaReceived
          ? builder.netDeposited - wberaReceived
          : BigInt(0),
        currentShares: builder.currentShares > lpTokensBurned
          ? builder.currentShares - lpTokensBurned
          : BigInt(0),
        withdrawalCount: builder.withdrawalCount + 1,
        lastActivityTime: timestamp,
      };
      context.AquaberaBuilder.set(updatedBuilder);
    }

    // Update global stats - subtract WBERA withdrawn
    const statsId = "global";
    let stats = await context.AquaberaStats.get(statsId);
    
    if (stats) {
      const updatedStats = {
        ...stats,
        totalBera: stats.totalBera > wberaReceived
          ? stats.totalBera - wberaReceived // Subtract WBERA amount
          : BigInt(0),
        totalShares: stats.totalShares > lpTokensBurned
          ? stats.totalShares - lpTokensBurned // Subtract LP tokens
          : BigInt(0),
        totalWithdrawn: stats.totalWithdrawn + wberaReceived,
        withdrawalCount: stats.withdrawalCount + 1,
        lastUpdateTime: timestamp,
      };
      context.AquaberaStats.set(updatedStats);
      
      context.log.info(
        `Updated stats - Total WBERA: ${updatedStats.totalBera}, Total LP: ${updatedStats.totalShares}`
      );
    }
  }
);