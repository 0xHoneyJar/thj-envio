/*
 * ERC1155 mint tracking for Candies Market collections.
 */

import { CandiesMarket1155, Erc1155MintEvent, CandiesInventory } from "generated";

import { ZERO_ADDRESS } from "./constants";
import { MINT_COLLECTION_KEYS } from "./mints/constants";
import { recordAction } from "../lib/actions";

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

    const timestamp = BigInt(event.block.timestamp);
    const chainId = event.chainId;
    const minter = to.toLowerCase();
    const operatorLower = operator.toLowerCase();
    const tokenId = BigInt(id.toString());
    const quantity = BigInt(value.toString());

    const mintEvent: Erc1155MintEvent = {
      id: mintId,
      collectionKey,
      tokenId,
      value: quantity,
      minter,
      operator: operatorLower,
      timestamp,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
      chainId,
    };

    context.Erc1155MintEvent.set(mintEvent);

    // Update CandiesInventory tracking
    const inventoryId = `${contractAddress}_${tokenId}`;
    const existingInventory = await context.CandiesInventory.get(inventoryId);

    const inventoryUpdate: CandiesInventory = {
      id: inventoryId,
      contract: contractAddress,
      tokenId,
      currentSupply: existingInventory
        ? existingInventory.currentSupply + quantity
        : quantity,
      mintCount: existingInventory ? existingInventory.mintCount + 1 : 1,
      lastMintTime: timestamp,
      chainId,
    };

    context.CandiesInventory.set(inventoryUpdate);

    recordAction(context, {
      id: mintId,
      actionType: "mint1155",
      actor: minter,
      primaryCollection: collectionKey,
      timestamp,
      chainId,
      txHash: event.transaction.hash,
      logIndex: event.logIndex,
      numeric1: quantity,
      context: {
        tokenId: tokenId.toString(),
        operator: operatorLower,
        contract: contractAddress,
      },
    });
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
    const timestamp = BigInt(event.block.timestamp);
    const chainId = event.chainId;
    const txHash = event.transaction.hash;

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
        timestamp,
        blockNumber: BigInt(event.block.number),
        transactionHash: txHash,
        chainId,
      };

      context.Erc1155MintEvent.set(mintEvent);

      // Update CandiesInventory tracking
      const inventoryId = `${contractAddress}_${tokenId}`;
      const existingInventory = await context.CandiesInventory.get(inventoryId);

      const inventoryUpdate: CandiesInventory = {
        id: inventoryId,
        contract: contractAddress,
        tokenId,
        currentSupply: existingInventory
          ? existingInventory.currentSupply + quantity
          : quantity,
        mintCount: existingInventory ? existingInventory.mintCount + 1 : 1,
        lastMintTime: timestamp,
        chainId,
      };

      context.CandiesInventory.set(inventoryUpdate);

      recordAction(context, {
        id: mintId,
        actionType: "mint1155",
        actor: minterLower,
        primaryCollection: collectionKey,
        timestamp,
        chainId,
        txHash,
        logIndex: event.logIndex,
        numeric1: quantity,
        context: {
          tokenId: tokenId.toString(),
          operator: operatorLower,
          contract: contractAddress,
          batchIndex: index,
        },
      });
    }
  }
);
