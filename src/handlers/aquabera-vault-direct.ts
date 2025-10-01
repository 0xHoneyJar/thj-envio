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

import { recordAction } from "../lib/actions";

const WALL_CONTRACT_ADDRESS = "0x05c98986Fc75D63eF973C648F22687d1a8056CD6".toLowerCase();
const BERACHAIN_ID = 80094;

/*
 * Handle direct Deposit events (Uniswap V3 style pool)
 * Event: Deposit(address indexed sender, address indexed to, uint256 shares, uint256 amount0, uint256 amount1)
 * amount0 = WBERA amount
 * amount1 = HENLO amount (usually 0 for single-sided deposits)
 * shares = LP tokens minted
 */
export const handleDirectDeposit = AquaberaVaultDirect.Deposit.handler(
  async ({ event, context }) => {
    const timestamp = BigInt(event.block.timestamp);
    const sender = event.params.sender.toLowerCase();
    const recipient = event.params.to.toLowerCase();
    
    // IMPORTANT: Skip if this deposit came from the forwarder contract
    // The forwarder already emits DepositForwarded which we track separately
    const FORWARDER_ADDRESS = "0xc0c6d4178410849ec9765b4267a73f4f64241832";
    if (sender === FORWARDER_ADDRESS) {
      context.log.info(
        `⏭️ Skipping deposit from forwarder (already tracked via DepositForwarded event)`
      );
      return; // Don't double-count forwarder deposits
    }
    
    // Map the event parameters from the actual Deposit event
    // Based on the actual events we've seen, the parameters are:
    // Deposit(address indexed sender, address indexed to, uint256 shares, uint256 amount0, uint256 amount1)
    const lpTokensReceived = event.params.shares; // LP tokens minted
    const wberaAmount = event.params.amount0; // WBERA deposited (token0 in the pool)
    const henloAmount = event.params.amount1; // HENLO deposited (token1 in the pool)
    
    // Check if it's a wall contribution - check both sender and recipient
    const txFrom = event.transaction.from ? event.transaction.from.toLowerCase() : null;
    const isWallContribution: boolean =
      sender === WALL_CONTRACT_ADDRESS ||
      recipient === WALL_CONTRACT_ADDRESS ||
      (txFrom !== null && txFrom === WALL_CONTRACT_ADDRESS);

    // Logging for debugging
    context.log.info(
      `📊 Direct Deposit Event:
      - Sender: ${sender}
      - To: ${recipient}
      - Shares (LP tokens): ${lpTokensReceived}
      - Amount0 (WBERA): ${wberaAmount} wei = ${wberaAmount / BigInt(10**18)} WBERA
      - Amount1 (HENLO): ${henloAmount} wei
      - TX From: ${txFrom || 'N/A'}
      - Is Wall: ${isWallContribution}`
    );

    // Create deposit record with WBERA amount
    const id = `${event.transaction.hash}_${event.logIndex}`;
    const chainId = event.chainId;

    const deposit: AquaberaDeposit = {
      id,
      amount: wberaAmount, // Store WBERA amount, not LP tokens
      shares: lpTokensReceived,
      timestamp: timestamp,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
      from: txFrom || sender, // Use sender if txFrom is not available
      isWallContribution: isWallContribution,
      chainId: BERACHAIN_ID,
    };
    context.AquaberaDeposit.set(deposit);

    // Update builder stats with WBERA amounts
    // Use the actual depositor (sender) for builder tracking
    const builderId = sender;
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

    recordAction(context, {
      id,
      actionType: "deposit",
      actor: sender,
      primaryCollection: "henlo_build",
      timestamp,
      chainId,
      txHash: event.transaction.hash,
      logIndex: event.logIndex,
      numeric1: wberaAmount,
      numeric2: lpTokensReceived,
      context: {
        vault: event.srcAddress.toLowerCase(),
        recipient,
        henloAmount: henloAmount.toString(),
        isWallContribution,
        txFrom,
        forwarder: false,
      },
    });
  }
);

/*
 * Handle Withdraw events (Uniswap V3 style pool)
 * Event: Withdraw(address indexed sender, address indexed to, uint256 shares, uint256 amount0, uint256 amount1)
 * amount0 = WBERA amount withdrawn
 * amount1 = HENLO amount withdrawn
 * shares = LP tokens burned
 */
export const handleDirectWithdraw = AquaberaVaultDirect.Withdraw.handler(
  async ({ event, context }) => {
    const timestamp = BigInt(event.block.timestamp);
    const sender = event.params.sender.toLowerCase();
    const recipient = event.params.to.toLowerCase();
    
    // Skip if this withdrawal came from the forwarder contract
    const FORWARDER_ADDRESS = "0xc0c6d4178410849ec9765b4267a73f4f64241832";
    if (sender === FORWARDER_ADDRESS) {
      context.log.info(
        `⏭️ Skipping withdrawal from forwarder (would be tracked via forwarder events if implemented)`
      );
      return;
    }
    
    // Map the event parameters from the actual Withdraw event
    // Withdraw(address indexed sender, address indexed to, uint256 shares, uint256 amount0, uint256 amount1)
    const lpTokensBurned = event.params.shares; // LP tokens burned
    const wberaReceived = event.params.amount0; // WBERA withdrawn (token0)
    const henloReceived = event.params.amount1; // HENLO withdrawn (token1)

    context.log.info(
      `Withdraw: ${wberaReceived} WBERA for ${lpTokensBurned} LP tokens to ${recipient}`
    );

    // Create withdrawal record with WBERA amount
    const id = `${event.transaction.hash}_${event.logIndex}`;
    const chainId = event.chainId;

    const withdrawal: AquaberaWithdrawal = {
      id,
      amount: wberaReceived, // Store WBERA amount, not LP tokens
      shares: lpTokensBurned,
      timestamp: timestamp,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
      from: sender, // Use sender as the withdrawer
      chainId: BERACHAIN_ID,
    };
    context.AquaberaWithdrawal.set(withdrawal);

    // Update builder stats
    const builderId = sender;
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

    recordAction(context, {
      id,
      actionType: "withdraw",
      actor: sender,
      primaryCollection: "henlo_build",
      timestamp,
      chainId,
      txHash: event.transaction.hash,
      logIndex: event.logIndex,
      numeric1: wberaReceived,
      numeric2: lpTokensBurned,
      context: {
        vault: event.srcAddress.toLowerCase(),
        recipient,
        henloReceived: henloReceived.toString(),
      },
    });
  }
);
