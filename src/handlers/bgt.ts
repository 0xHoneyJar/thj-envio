/*
 * BGT queue boost tracking.
 *
 * Captures QueueBoost events emitted when users delegate BGT to validators.
 */

import { Interface, hexlify } from "ethers";

import { BgtToken, BgtBoostEvent } from "generated";

const QUEUE_BOOST_INTERFACE = new Interface([
  "function queueBoost(bytes pubkey, uint128 amount)",
  "function queue_boost(bytes pubkey, uint128 amount)",
]);

const normalizePubkey = (raw: unknown): string | undefined => {
  if (typeof raw === "string") {
    return raw.toLowerCase();
  }

  if (raw instanceof Uint8Array) {
    try {
      return hexlify(raw).toLowerCase();
    } catch (_err) {
      return undefined;
    }
  }

  if (Array.isArray(raw)) {
    try {
      return hexlify(Uint8Array.from(raw as number[])).toLowerCase();
    } catch (_err) {
      return undefined;
    }
  }

  return undefined;
};

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
    if (inputData && inputData !== "0x") {
      try {
        const parsed = QUEUE_BOOST_INTERFACE.parseTransaction({
          data: inputData,
        });

        if (parsed) {
          const decodedPubkey = normalizePubkey(
            (parsed.args as any)?.pubkey ?? parsed.args?.[0]
          );

          if (decodedPubkey) {
            validatorPubkey = decodedPubkey;
          }
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
