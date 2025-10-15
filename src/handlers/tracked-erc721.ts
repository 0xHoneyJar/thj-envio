import { TrackedErc721 } from "generated";
import type { HandlerContext, TrackedHolder as TrackedHolderEntity } from "generated";

import { ZERO_ADDRESS } from "./constants";
import { TRACKED_ERC721_COLLECTION_KEYS } from "./tracked-erc721/constants";

const ZERO = ZERO_ADDRESS.toLowerCase();

export const handleTrackedErc721Transfer = TrackedErc721.Transfer.handler(
  async ({ event, context }) => {
    const contractAddress = event.srcAddress.toLowerCase();
    const collectionKey =
      TRACKED_ERC721_COLLECTION_KEYS[contractAddress] ?? contractAddress;
    const from = event.params.from.toLowerCase();
    const to = event.params.to.toLowerCase();
    const chainId = event.chainId;

    await adjustHolder({
      context,
      contractAddress,
      collectionKey,
      chainId,
      holderAddress: from,
      delta: -1,
    });

    await adjustHolder({
      context,
      contractAddress,
      collectionKey,
      chainId,
      holderAddress: to,
      delta: 1,
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
}

async function adjustHolder({
  context,
  contractAddress,
  collectionKey,
  chainId,
  holderAddress,
  delta,
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
