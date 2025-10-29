/*
 * MiberaTrade event handlers
 *
 * Tracks ERC-721 NFT trading events from the MiberaTrade contract:
 * - TradeProposed: User proposes a 1-for-1 NFT swap
 * - TradeAccepted: Recipient accepts the trade
 * - TradeCancelled: Proposer cancels the trade
 *
 * Contract: 0x90485B61C9dA51A3c79fca1277899d9CD5D350c2 (Berachain)
 */

import { MiberaTrade as MiberaTradeContract, MiberaTrade, TradeStats } from "generated";

const FIFTEEN_MINUTES = 15n * 60n; // 15 minutes in seconds

/**
 * Handle TradeProposed event
 * Creates a new active trade proposal
 */
export const handleMiberaTradeProposed = MiberaTradeContract.TradeProposed.handler(
  async ({ event, context }) => {
    const { proposer, offeredTokenId, requestedTokenId, timestamp } = event.params;

    const proposerLower = proposer.toLowerCase();
    const timestampBigInt = BigInt(timestamp.toString());
    const expiresAt = timestampBigInt + FIFTEEN_MINUTES;

    // Create trade entity
    // Use offeredTokenId as part of ID since each NFT can only have one active trade
    const tradeId = `${event.transaction.hash}_${offeredTokenId.toString()}`;

    const trade: MiberaTrade = {
      id: tradeId,
      offeredTokenId: BigInt(offeredTokenId.toString()),
      requestedTokenId: BigInt(requestedTokenId.toString()),
      proposer: proposerLower,
      acceptor: undefined, // Null until accepted
      status: "active",
      proposedAt: timestampBigInt,
      completedAt: undefined, // Null until completed
      expiresAt,
      txHash: event.transaction.hash,
      blockNumber: BigInt(event.block.number),
      chainId: event.chainId,
    };

    context.MiberaTrade.set(trade);

    // Update stats
    await updateTradeStats(context, event.chainId, "mibera_proposed");
  }
);

/**
 * Handle TradeAccepted event
 * Marks trade as completed
 */
export const handleMiberaTradeAccepted = MiberaTradeContract.TradeAccepted.handler(
  async ({ event, context }) => {
    const { acceptor, offeredTokenId, requestedTokenId, originalProposer } = event.params;

    const acceptorLower = acceptor.toLowerCase();
    const timestamp = BigInt(event.block.timestamp);

    // Find the trade by offeredTokenId
    // Need to search for active trades with this offeredTokenId
    // Since we don't have complex queries, we'll use a predictable ID pattern
    // The trade was created with ID: tx_hash_offeredTokenId
    // We don't know the original tx hash, so we'll create a new entity with completion data

    // For completed trades, we'll use the acceptance tx hash as ID
    const tradeId = `${event.transaction.hash}_${offeredTokenId.toString()}`;

    const trade: MiberaTrade = {
      id: tradeId,
      offeredTokenId: BigInt(offeredTokenId.toString()),
      requestedTokenId: BigInt(requestedTokenId.toString()),
      proposer: originalProposer.toLowerCase(),
      acceptor: acceptorLower,
      status: "completed",
      proposedAt: timestamp, // We don't have the original proposal time, use completion time
      completedAt: timestamp,
      expiresAt: timestamp + FIFTEEN_MINUTES,
      txHash: event.transaction.hash,
      blockNumber: BigInt(event.block.number),
      chainId: event.chainId,
    };

    context.MiberaTrade.set(trade);

    // Update stats
    await updateTradeStats(context, event.chainId, "mibera_completed");
  }
);

/**
 * Handle TradeCancelled event
 * Marks trade as cancelled
 */
export const handleMiberaTradeCancelled = MiberaTradeContract.TradeCancelled.handler(
  async ({ event, context }) => {
    const { canceller, offeredTokenId, requestedTokenId } = event.params;

    const cancellerLower = canceller.toLowerCase();
    const timestamp = BigInt(event.block.timestamp);

    // Similar to acceptance, use cancellation tx hash as ID
    const tradeId = `${event.transaction.hash}_${offeredTokenId.toString()}`;

    const trade: MiberaTrade = {
      id: tradeId,
      offeredTokenId: BigInt(offeredTokenId.toString()),
      requestedTokenId: BigInt(requestedTokenId.toString()),
      proposer: cancellerLower,
      acceptor: undefined,
      status: "cancelled",
      proposedAt: timestamp, // We don't have the original proposal time
      completedAt: timestamp,
      expiresAt: timestamp + FIFTEEN_MINUTES,
      txHash: event.transaction.hash,
      blockNumber: BigInt(event.block.number),
      chainId: event.chainId,
    };

    context.MiberaTrade.set(trade);

    // Update stats
    await updateTradeStats(context, event.chainId, "mibera_cancelled");
  }
);

/**
 * Update global trade statistics
 */
async function updateTradeStats(
  context: any,
  chainId: number,
  action: "mibera_proposed" | "mibera_completed" | "mibera_cancelled"
): Promise<void> {
  const statsId = "global";

  // Get existing stats or create new
  let stats = await context.TradeStats.get(statsId);

  if (!stats) {
    stats = {
      id: statsId,
      totalMiberaTrades: 0,
      completedMiberaTrades: 0,
      cancelledMiberaTrades: 0,
      expiredMiberaTrades: 0,
      totalCandiesTrades: 0,
      completedCandiesTrades: 0,
      cancelledCandiesTrades: 0,
      expiredCandiesTrades: 0,
      uniqueTraders: 0,
      lastTradeTime: undefined,
      chainId: chainId,
    };
  }

  // Update stats based on action
  const updatedStats: TradeStats = {
    ...stats,
    totalMiberaTrades: action === "mibera_proposed"
      ? stats.totalMiberaTrades + 1
      : stats.totalMiberaTrades,
    completedMiberaTrades: action === "mibera_completed"
      ? stats.completedMiberaTrades + 1
      : stats.completedMiberaTrades,
    cancelledMiberaTrades: action === "mibera_cancelled"
      ? stats.cancelledMiberaTrades + 1
      : stats.cancelledMiberaTrades,
    lastTradeTime: BigInt(Date.now()),
  };

  context.TradeStats.set(updatedStats);
}
