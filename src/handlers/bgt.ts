/*
 * BGT queue boost tracking.
 *
 * Captures QueueBoost events emitted when users delegate BGT to validators.
 */

import { Interface } from "ethers";

import { BgtToken, BgtBoostEvent } from "generated";

const QUEUE_BOOST_INTERFACE = new Interface([
  "function queue_boost(bytes pubkey, uint128 amount)",
]);

export const handleBgtQueueBoost = BgtToken.QueueBoost.handler(
  async ({ event, context }) => {
    const { account, pubkey, amount } = event.params;

    if (amount === 0n) {
      return;
    }

    const accountLower = account.toLowerCase();
    let validatorPubkey = pubkey.toLowerCase();
    const transactionFrom = event.transaction.from
      ? event.transaction.from.toLowerCase()
      : accountLower;

    const inputData = event.transaction.input;
    if (inputData) {
      try {
        const decoded = QUEUE_BOOST_INTERFACE.decodeFunctionData(
          "queue_boost",
          inputData
        );
        const decodedPubkey = (decoded as any)?.pubkey ?? decoded[0];
        if (typeof decodedPubkey === "string") {
          validatorPubkey = decodedPubkey.toLowerCase();
        }
      } catch (error) {
        context.log.warn(
          `Failed to decode queue_boost input for ${event.transaction.hash}: ${String(
            error
          )}`
        );
      }
    }

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
