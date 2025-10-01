/*
 * FatBera native deposit tracking.
 *
 * Captures Deposit events emitted by the fatBERA contract to record
 * on-chain native BERA deposits and their minted share amount.
 */

import { FatBera, FatBeraDeposit } from "generated";

import { recordAction } from "../lib/actions";

const COLLECTION_KEY = "fatbera_deposit";

export const handleFatBeraDeposit = FatBera.Deposit.handler(
  async ({ event, context }) => {
    const { from, to, amount, shares } = event.params;

    if (amount === 0n && shares === 0n) {
      return; // skip zero-value deposits
    }

    const depositor = from.toLowerCase();
    const recipient = to.toLowerCase();
    const transactionFrom = event.transaction.from
      ? event.transaction.from.toLowerCase()
      : undefined;

    const id = `${event.transaction.hash}_${event.logIndex}`;
    const timestamp = BigInt(event.block.timestamp);
    const chainId = event.chainId;

    const deposit: FatBeraDeposit = {
      id,
      collectionKey: COLLECTION_KEY,
      depositor,
      recipient,
      amount,
      shares,
      transactionFrom,
      timestamp,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
      chainId,
    };

    context.FatBeraDeposit.set(deposit);

    recordAction(context, {
      id,
      actionType: "deposit",
      actor: depositor,
      primaryCollection: COLLECTION_KEY,
      timestamp,
      chainId,
      txHash: event.transaction.hash,
      logIndex: event.logIndex,
      numeric1: amount,
      numeric2: shares,
      context: {
        recipient,
        transactionFrom,
        contract: event.srcAddress.toLowerCase(),
      },
    });
  }
);
