/*
 * Mibera Zora ERC-1155 tracking on Optimism.
 *
 * Tracks:
 * - Mints: transfers from zero address
 * - Transfers: all other transfers between users
 *
 * This is a Zora platform ERC-1155 collection.
 */

import { MiberaZora1155, Erc1155MintEvent } from "generated";

import { recordAction } from "../lib/actions";

// Zero address for mint detection
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Collection key for action tracking
const COLLECTION_KEY = "mibera_zora";

/**
 * Check if this is a mint (from zero address)
 */
function isMint(fromAddress: string): boolean {
  return fromAddress === ZERO_ADDRESS;
}

/**
 * Handle TransferSingle events
 * Tracks mints (from zero) and transfers (between users)
 */
export const handleMiberaZoraSingle = MiberaZora1155.TransferSingle.handler(
  async ({ event, context }) => {
    const { operator, from, to, id, value } = event.params;
    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();

    const tokenId = BigInt(id.toString());
    const quantity = BigInt(value.toString());

    if (quantity === 0n) {
      return;
    }

    const contractAddress = event.srcAddress.toLowerCase();
    const operatorLower = operator.toLowerCase();
    const timestamp = BigInt(event.block.timestamp);
    const chainId = event.chainId;
    const eventId = `${event.transaction.hash}_${event.logIndex}`;

    // Check if this is a mint or a transfer
    const isMintEvent = isMint(fromLower);

    if (isMintEvent) {
      // Create mint event record
      const mintEvent: Erc1155MintEvent = {
        id: eventId,
        collectionKey: COLLECTION_KEY,
        tokenId,
        value: quantity,
        minter: toLower,
        operator: operatorLower,
        timestamp,
        blockNumber: BigInt(event.block.number),
        transactionHash: event.transaction.hash,
        chainId,
      };

      context.Erc1155MintEvent.set(mintEvent);

      // Record mint action
      recordAction(context, {
        id: eventId,
        actionType: "mint1155",
        actor: toLower,
        primaryCollection: COLLECTION_KEY,
        timestamp,
        chainId,
        txHash: event.transaction.hash,
        logIndex: event.logIndex,
        numeric1: quantity,
        numeric2: tokenId,
        context: {
          tokenId: tokenId.toString(),
          operator: operatorLower,
          contract: contractAddress,
          from: fromLower,
        },
      });
    } else {
      // Record transfer action (secondary market / user-to-user)
      recordAction(context, {
        id: eventId,
        actionType: "transfer1155",
        actor: toLower,
        primaryCollection: COLLECTION_KEY,
        timestamp,
        chainId,
        txHash: event.transaction.hash,
        logIndex: event.logIndex,
        numeric1: quantity,
        numeric2: tokenId,
        context: {
          tokenId: tokenId.toString(),
          from: fromLower,
          to: toLower,
          operator: operatorLower,
          contract: contractAddress,
        },
      });
    }
  }
);

/**
 * Handle TransferBatch events
 * Tracks mints (from zero) and transfers (between users)
 */
export const handleMiberaZoraBatch = MiberaZora1155.TransferBatch.handler(
  async ({ event, context }) => {
    const { operator, from, to, ids, values } = event.params;
    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();

    const contractAddress = event.srcAddress.toLowerCase();
    const operatorLower = operator.toLowerCase();
    const timestamp = BigInt(event.block.timestamp);
    const chainId = event.chainId;
    const txHash = event.transaction.hash;

    const idsArray = Array.from(ids);
    const valuesArray = Array.from(values);
    const length = Math.min(idsArray.length, valuesArray.length);

    // Check if this is a mint or a transfer
    const isMintEvent = isMint(fromLower);

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
      const eventId = `${txHash}_${event.logIndex}_${index}`;

      if (isMintEvent) {
        // Create mint event record
        const mintEvent: Erc1155MintEvent = {
          id: eventId,
          collectionKey: COLLECTION_KEY,
          tokenId,
          value: quantity,
          minter: toLower,
          operator: operatorLower,
          timestamp,
          blockNumber: BigInt(event.block.number),
          transactionHash: txHash,
          chainId,
        };

        context.Erc1155MintEvent.set(mintEvent);

        // Record mint action
        recordAction(context, {
          id: eventId,
          actionType: "mint1155",
          actor: toLower,
          primaryCollection: COLLECTION_KEY,
          timestamp,
          chainId,
          txHash,
          logIndex: event.logIndex,
          numeric1: quantity,
          numeric2: tokenId,
          context: {
            tokenId: tokenId.toString(),
            operator: operatorLower,
            contract: contractAddress,
            from: fromLower,
            batchIndex: index,
          },
        });
      } else {
        // Record transfer action (secondary market / user-to-user)
        recordAction(context, {
          id: eventId,
          actionType: "transfer1155",
          actor: toLower,
          primaryCollection: COLLECTION_KEY,
          timestamp,
          chainId,
          txHash,
          logIndex: event.logIndex,
          numeric1: quantity,
          numeric2: tokenId,
          context: {
            tokenId: tokenId.toString(),
            from: fromLower,
            to: toLower,
            operator: operatorLower,
            contract: contractAddress,
            batchIndex: index,
          },
        });
      }
    }
  }
);
