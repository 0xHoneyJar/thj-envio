import { TrackedErc721 } from "generated";
import type { HandlerContext, TrackedHolder as TrackedHolderEntity } from "generated";

import { ZERO_ADDRESS } from "./constants";
import { TRACKED_ERC721_COLLECTION_KEYS } from "./tracked-erc721/constants";
import { recordAction } from "../lib/actions";

const ZERO = ZERO_ADDRESS.toLowerCase();

export const handleTrackedErc721Transfer = TrackedErc721.Transfer.handler(
  async ({ event, context }) => {
    const contractAddress = event.srcAddress.toLowerCase();
    const collectionKey =
      TRACKED_ERC721_COLLECTION_KEYS[contractAddress] ?? contractAddress;
    const from = event.params.from.toLowerCase();
    const to = event.params.to.toLowerCase();
    const chainId = event.chainId;
    const txHash = event.transaction.hash;
    const logIndex = Number(event.logIndex);
    const timestamp = BigInt(event.block.timestamp);

    await adjustHolder({
      context,
      contractAddress,
      collectionKey,
      chainId,
      holderAddress: from,
      delta: -1,
      txHash,
      logIndex,
      timestamp,
      direction: "out",
    });

    await adjustHolder({
      context,
      contractAddress,
      collectionKey,
      chainId,
      holderAddress: to,
      delta: 1,
      txHash,
      logIndex,
      timestamp,
      direction: "in",
    });
  }
);

interface AdjustHolderArgs {
  context: HandlerContext;
  contractAddress: string;
  collectionKey: string;
  chainId: number;
  holderAddress: string;
  delta: number;
  txHash: string;
  logIndex: number;
  timestamp: bigint;
  direction: "in" | "out";
}

async function adjustHolder({
  context,
  contractAddress,
  collectionKey,
  chainId,
  holderAddress,
  delta,
  txHash,
  logIndex,
  timestamp,
  direction,
}: AdjustHolderArgs) {
  if (delta === 0) {
    return;
  }

  const address = holderAddress.toLowerCase();
  if (address === ZERO) {
    return;
  }

  const id = `${contractAddress}_${chainId}_${address}`;
  const existing = await context.TrackedHolder.get(id);
  const currentCount = existing?.tokenCount ?? 0;
  const nextCount = currentCount + delta;

  const actionId = `${txHash}_${logIndex}_${direction}`;
  const normalizedCollection = collectionKey.toLowerCase();
  const tokenCount = Math.max(0, nextCount);

  recordAction(context, {
    id: actionId,
    actionType: "hold721",
    actor: address,
    primaryCollection: normalizedCollection,
    timestamp,
    chainId,
    txHash,
    logIndex,
    numeric1: BigInt(tokenCount),
    context: {
      contract: contractAddress,
      collectionKey: normalizedCollection,
      tokenCount,
      direction,
    },
  });

  if (nextCount <= 0) {
    if (existing) {
      context.TrackedHolder.deleteUnsafe(id);
    }
    return;
  }

  const holder: TrackedHolderEntity = {
    id,
    contract: contractAddress,
    collectionKey,
    chainId,
    address,
    tokenCount: nextCount,
  };

  context.TrackedHolder.set(holder);
}
