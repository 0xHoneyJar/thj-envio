/*
 * FatBera native deposit tracking.
 *
 * Captures Deposit events emitted by the fatBERA contract to record
 * on-chain native BERA deposits and their minted share amount.
 */

import { FatBera, FatBeraDeposit } from "generated";

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

    const deposit: FatBeraDeposit = {
      id: `${event.transaction.hash}_${event.logIndex}`,
      collectionKey: COLLECTION_KEY,
      depositor,
      recipient,
      amount,
      shares,
      transactionFrom,
      timestamp: BigInt(event.block.timestamp),
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
      chainId: event.chainId,
    };

    context.FatBeraDeposit.set(deposit);
  }
);
