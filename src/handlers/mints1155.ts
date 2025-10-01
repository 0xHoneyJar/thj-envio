/*
 * ERC1155 mint tracking for Candies Market collections.
 */

import { CandiesMarket1155, Erc1155MintEvent } from "generated";

import { ZERO_ADDRESS } from "./constants";
import { MINT_COLLECTION_KEYS } from "./mints/constants";

const ZERO = ZERO_ADDRESS.toLowerCase();

const getCollectionKey = (address: string): string => {
  const key = MINT_COLLECTION_KEYS[address.toLowerCase()];
  return key ?? address.toLowerCase();
};

export const handleCandiesMintSingle = CandiesMarket1155.TransferSingle.handler(
  async ({ event, context }) => {
    const { operator, from, to, id, value } = event.params;

    if (from.toLowerCase() !== ZERO) {
      return;
    }

    const contractAddress = event.srcAddress.toLowerCase();
    const collectionKey = getCollectionKey(contractAddress);
    const mintId = `${event.transaction.hash}_${event.logIndex}`;

    const mintEvent: Erc1155MintEvent = {
      id: mintId,
      collectionKey,
      tokenId: BigInt(id.toString()),
      value: BigInt(value.toString()),
      minter: to.toLowerCase(),
      operator: operator.toLowerCase(),
      timestamp: BigInt(event.block.timestamp),
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
      chainId: event.chainId,
    };

    context.Erc1155MintEvent.set(mintEvent);
  }
);

export const handleCandiesMintBatch = CandiesMarket1155.TransferBatch.handler(
  async ({ event, context }) => {
    const { operator, from, to, ids, values } = event.params;

    if (from.toLowerCase() !== ZERO) {
      return;
    }

    const contractAddress = event.srcAddress.toLowerCase();
    const collectionKey = getCollectionKey(contractAddress);
    const operatorLower = operator.toLowerCase();
    const minterLower = to.toLowerCase();

    const idsArray = Array.from(ids);
    const valuesArray = Array.from(values);

    const length = Math.min(idsArray.length, valuesArray.length);

    for (let index = 0; index < length; index += 1) {
      const rawId = idsArray[index];
      const rawValue = valuesArray[index];

      if (rawId === undefined || rawValue === undefined || rawValue === null) {
        continue;
      }

      const quantity = BigInt(rawValue.toString());
      if (quantity === 0n) {
        continue;
      }

      const tokenId = BigInt(rawId.toString());
      const mintId = `${event.transaction.hash}_${event.logIndex}_${index}`;

      const mintEvent: Erc1155MintEvent = {
        id: mintId,
        collectionKey,
        tokenId,
        value: quantity,
        minter: minterLower,
        operator: operatorLower,
        timestamp: BigInt(event.block.timestamp),
        blockNumber: BigInt(event.block.number),
        transactionHash: event.transaction.hash,
        chainId: event.chainId,
      };

      context.Erc1155MintEvent.set(mintEvent);
    }
  }
);
