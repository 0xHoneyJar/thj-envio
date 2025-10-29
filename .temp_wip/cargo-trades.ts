/*
 * CandiesTrade event handlers
 *
 * Tracks ERC-1155 cargo/drug trading events from the CandiesTrade contract:
 * - TradeProposed: User proposes a targeted trade (specific amounts of tokens)
 * - TradeAccepted: Target user accepts the trade
 * - TradeCancelled: Proposer cancels the trade
 *
 * Contract: TBD (will be deployed from /mibera-contracts/honey-road)
 */

import { CandiesTrade as CandiesTradeContract, CandiesTrade, TradeStats } from "generated";

const FIFTEEN_MINUTES = 15n * 60n; // 15 minutes in seconds

/**
 * Handle TradeProposed event
 * Creates a new active cargo trade proposal
 */
export const handleCandiesTradeProposed = CandiesTradeContract.TradeProposed.handler(
  async ({ event, context }) => {
    const {
      proposer,
      tradeId,
      offeredTokenId,
      offeredAmount,
      requestedTokenId,
      requestedAmount,
      requestedFrom,
      timestamp,
    } = event.params;

    const proposerLower = proposer.toLowerCase();
    const requestedFromLower = requestedFrom.toLowerCase();
    const timestampBigInt = BigInt(timestamp.toString());
    const expiresAt = timestampBigInt + FIFTEEN_MINUTES;

    // Create trade entity
    // Use tx hash + log index for unique ID
    const id = `${event.transaction.hash}_${event.logIndex}`;

    const trade: CandiesTrade = {
      id,
      tradeId: BigInt(tradeId.toString()),
      offeredTokenId: BigInt(offeredTokenId.toString()),
      offeredAmount: BigInt(offeredAmount.toString()),
      requestedTokenId: BigInt(requestedTokenId.toString()),
      requestedAmount: BigInt(requestedAmount.toString()),
      proposer: proposerLower,
      requestedFrom: requestedFromLower,
      acceptor: undefined, // Null until accepted
      status: "active",
      proposedAt: timestampBigInt,
      completedAt: undefined, // Null until completed
      expiresAt,
      txHash: event.transaction.hash,
      blockNumber: BigInt(event.block.number),
      chainId: event.chainId,
    };

    context.CandiesTrade.set(trade);

    // Update stats
    await updateTradeStats(context, event.chainId, "candies_proposed");
  }
);

/**
 * Handle TradeAccepted event
 * Marks cargo trade as completed
 */
export const handleCandiesTradeAccepted = CandiesTradeContract.TradeAccepted.handler(
  async ({ event, context }) => {
    const {
      acceptor,
      tradeId,
      offeredTokenId,
      offeredAmount,
      requestedTokenId,
      requestedAmount,
      originalProposer,
    } = event.params;

    const acceptorLower = acceptor.toLowerCase();
    const proposerLower = originalProposer.toLowerCase();
    const timestamp = BigInt(event.block.timestamp);

    // Use tx hash + log index for unique ID
    const id = `${event.transaction.hash}_${event.logIndex}`;

    const trade: CandiesTrade = {
      id,
      tradeId: BigInt(tradeId.toString()),
      offeredTokenId: BigInt(offeredTokenId.toString()),
      offeredAmount: BigInt(offeredAmount.toString()),
      requestedTokenId: BigInt(requestedTokenId.toString()),
      requestedAmount: BigInt(requestedAmount.toString()),
      proposer: proposerLower,
      requestedFrom: acceptorLower, // The acceptor was the requested recipient
      acceptor: acceptorLower,
      status: "completed",
      proposedAt: timestamp, // We don't have the original proposal time
      completedAt: timestamp,
      expiresAt: timestamp + FIFTEEN_MINUTES,
      txHash: event.transaction.hash,
      blockNumber: BigInt(event.block.number),
      chainId: event.chainId,
    };

    context.CandiesTrade.set(trade);

    // Update stats
    await updateTradeStats(context, event.chainId, "candies_completed");
  }
);

/**
 * Handle TradeCancelled event
 * Marks cargo trade as cancelled
 */
export const handleCandiesTradeCancelled = CandiesTradeContract.TradeCancelled.handler(
  async ({ event, context }) => {
    const {
      canceller,
      tradeId,
      offeredTokenId,
      offeredAmount,
      requestedTokenId,
      requestedAmount,
    } = event.params;

    const cancellerLower = canceller.toLowerCase();
    const timestamp = BigInt(event.block.timestamp);

    // Use tx hash + log index for unique ID
    const id = `${event.transaction.hash}_${event.logIndex}`;

    const trade: CandiesTrade = {
      id,
      tradeId: BigInt(tradeId.toString()),
      offeredTokenId: BigInt(offeredTokenId.toString()),
      offeredAmount: BigInt(offeredAmount.toString()),
      requestedTokenId: BigInt(requestedTokenId.toString()),
      requestedAmount: BigInt(requestedAmount.toString()),
      proposer: cancellerLower,
      requestedFrom: cancellerLower, // Proposer is cancelling
      acceptor: undefined,
      status: "cancelled",
      proposedAt: timestamp, // We don't have the original proposal time
      completedAt: timestamp,
      expiresAt: timestamp + FIFTEEN_MINUTES,
      txHash: event.transaction.hash,
      blockNumber: BigInt(event.block.number),
      chainId: event.chainId,
    };

    context.CandiesTrade.set(trade);

    // Update stats
    await updateTradeStats(context, event.chainId, "candies_cancelled");
  }
);

/**
 * Update global trade statistics
 */
async function updateTradeStats(
  context: any,
  chainId: number,
  action: "candies_proposed" | "candies_completed" | "candies_cancelled"
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
    totalCandiesTrades: action === "candies_proposed"
      ? stats.totalCandiesTrades + 1
      : stats.totalCandiesTrades,
    completedCandiesTrades: action === "candies_completed"
      ? stats.completedCandiesTrades + 1
      : stats.completedCandiesTrades,
    cancelledCandiesTrades: action === "candies_cancelled"
      ? stats.cancelledCandiesTrades + 1
      : stats.cancelledCandiesTrades,
    lastTradeTime: BigInt(Date.now()),
  };

  context.TradeStats.set(updatedStats);
}
