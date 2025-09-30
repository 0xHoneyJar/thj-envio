/*
 * BGT queue boost tracking.
 *
 * Captures QueueBoost events emitted when users delegate BGT to validators.
 */

import { BgtToken, BgtBoostEvent } from "generated";

export const handleBgtQueueBoost = BgtToken.QueueBoost.handler(
  async ({ event, context }) => {
    const { account, pubkey, amount } = event.params;

    if (amount === 0n) {
      return;
    }

    const accountLower = account.toLowerCase();
    const validatorPubkey = pubkey.toLowerCase();
    const transactionFrom = event.transaction.from
      ? event.transaction.from.toLowerCase()
      : accountLower;

    const boostEvent: BgtBoostEvent = {
      id: `${event.transaction.hash}_${event.logIndex}`,
      account: accountLower,
      validatorPubkey,
      amount,
      transactionFrom,
      timestamp: BigInt(event.block.timestamp),
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
      chainId: event.chainId,
    };

    context.BgtBoostEvent.set(boostEvent);
  }
);
