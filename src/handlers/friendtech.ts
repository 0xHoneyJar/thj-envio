/*
 * friend.tech key trading tracking on Base.
 *
 * Tracks Trade events for Mibera-related subjects (jani key, charlotte fang key).
 * Only indexes trades for the specified subject addresses.
 */

import {
  FriendtechShares,
  FriendtechTrade,
  FriendtechHolder,
  FriendtechSubjectStats,
} from "generated";

import { recordAction } from "../lib/actions";
import {
  MIBERA_SUBJECTS,
  FRIENDTECH_COLLECTION_KEY,
} from "./friendtech/constants";

const COLLECTION_KEY = FRIENDTECH_COLLECTION_KEY;

/**
 * Handle Trade events from friend.tech
 * Only tracks trades for Mibera-related subjects
 */
export const handleFriendtechTrade = FriendtechShares.Trade.handler(
  async ({ event, context }) => {
    const {
      trader,
      subject,
      isBuy,
      shareAmount,
      ethAmount,
      supply,
    } = event.params;

    const subjectLower = subject.toLowerCase();
    const subjectKey = MIBERA_SUBJECTS[subjectLower];

    // Only track Mibera-related subjects
    if (!subjectKey) {
      return;
    }

    const traderLower = trader.toLowerCase();
    const timestamp = BigInt(event.block.timestamp);
    const chainId = event.chainId;
    const tradeId = `${event.transaction.hash}_${event.logIndex}`;
    const shareAmountBigInt = BigInt(shareAmount.toString());
    const ethAmountBigInt = BigInt(ethAmount.toString());
    const supplyBigInt = BigInt(supply.toString());

    // Record individual trade event
    const trade: FriendtechTrade = {
      id: tradeId,
      trader: traderLower,
      subject: subjectLower,
      subjectKey,
      isBuy,
      shareAmount: shareAmountBigInt,
      ethAmount: ethAmountBigInt,
      supply: supplyBigInt,
      timestamp,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
      chainId,
    };

    context.FriendtechTrade.set(trade);

    // Update holder balance
    const holderId = `${subjectLower}_${traderLower}_${chainId}`;
    const existingHolder = await context.FriendtechHolder.get(holderId);
    const shareAmountInt = Number(shareAmountBigInt);

    const balanceDelta = isBuy ? shareAmountInt : -shareAmountInt;
    const newBalance = (existingHolder?.balance ?? 0) + balanceDelta;

    const holder: FriendtechHolder = {
      id: holderId,
      subject: subjectLower,
      subjectKey,
      holder: traderLower,
      balance: Math.max(0, newBalance), // Ensure non-negative
      totalBought: (existingHolder?.totalBought ?? 0) + (isBuy ? shareAmountInt : 0),
      totalSold: (existingHolder?.totalSold ?? 0) + (isBuy ? 0 : shareAmountInt),
      firstTradeTime: existingHolder?.firstTradeTime ?? timestamp,
      lastTradeTime: timestamp,
      chainId,
    };

    context.FriendtechHolder.set(holder);

    // Update subject stats
    const statsId = `${subjectLower}_${chainId}`;
    const existingStats = await context.FriendtechSubjectStats.get(statsId);

    // Track unique holders (approximate - increment on first buy, decrement when balance goes to 0)
    let uniqueHoldersDelta = 0;
    if (isBuy && !existingHolder) {
      uniqueHoldersDelta = 1; // New holder
    } else if (!isBuy && existingHolder && existingHolder.balance > 0 && newBalance <= 0) {
      uniqueHoldersDelta = -1; // Holder sold all
    }

    const stats: FriendtechSubjectStats = {
      id: statsId,
      subject: subjectLower,
      subjectKey,
      totalSupply: supplyBigInt,
      uniqueHolders: Math.max(0, (existingStats?.uniqueHolders ?? 0) + uniqueHoldersDelta),
      totalTrades: (existingStats?.totalTrades ?? 0) + 1,
      totalBuys: (existingStats?.totalBuys ?? 0) + (isBuy ? 1 : 0),
      totalSells: (existingStats?.totalSells ?? 0) + (isBuy ? 0 : 1),
      totalVolumeEth: (existingStats?.totalVolumeEth ?? 0n) + ethAmountBigInt,
      lastTradeTime: timestamp,
      chainId,
    };

    context.FriendtechSubjectStats.set(stats);

    // Record action for activity feed/missions
    recordAction(context, {
      id: tradeId,
      actionType: isBuy ? "friendtech_buy" : "friendtech_sell",
      actor: traderLower,
      primaryCollection: COLLECTION_KEY,
      timestamp,
      chainId,
      txHash: event.transaction.hash,
      logIndex: event.logIndex,
      numeric1: shareAmountBigInt,
      numeric2: ethAmountBigInt,
      context: {
        subject: subjectLower,
        subjectKey,
        supply: supplyBigInt.toString(),
        newBalance,
      },
    });
  }
);
