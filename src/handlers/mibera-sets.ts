/*
 * Mibera Sets ERC-1155 tracking on Optimism.
 *
 * Tracks transfers from the distribution wallet as "mints" (airdrops).
 * Token IDs:
 *   - 8, 9, 10, 11: Strong Set
 *   - 12: Super Set
 */

import { MiberaSets, Erc1155MintEvent } from "generated";

import { recordAction } from "../lib/actions";

// Distribution wallet that airdropped Sets (transfers FROM this address = mints)
const DISTRIBUTION_WALLET = "0x4a8c9a29b23c4eac0d235729d5e0d035258cdfa7";

// Collection key for action tracking
const COLLECTION_KEY = "mibera_sets";

// Token ID classifications
const STRONG_SET_TOKEN_IDS = [8n, 9n, 10n, 11n];
const SUPER_SET_TOKEN_ID = 12n;

/**
 * Get the set tier based on token ID
 */
function getSetTier(tokenId: bigint): string {
  if (STRONG_SET_TOKEN_IDS.includes(tokenId)) {
    return "strong";
  }
  if (tokenId === SUPER_SET_TOKEN_ID) {
    return "super";
  }
  return "unknown";
}

/**
 * Handle TransferSingle events
 * Treats transfers FROM distribution wallet as mints
 */
export const handleMiberaSetsSingle = MiberaSets.TransferSingle.handler(
  async ({ event, context }) => {
    const { operator, from, to, id, value } = event.params;
    const fromLower = from.toLowerCase();

    // Only track transfers FROM the distribution wallet (airdrops = mints)
    if (fromLower !== DISTRIBUTION_WALLET) {
      return;
    }

    const tokenId = BigInt(id.toString());
    const quantity = BigInt(value.toString());

    if (quantity === 0n) {
      return;
    }

    const contractAddress = event.srcAddress.toLowerCase();
    const minter = to.toLowerCase();
    const operatorLower = operator.toLowerCase();
    const timestamp = BigInt(event.block.timestamp);
    const chainId = event.chainId;
    const mintId = `${event.transaction.hash}_${event.logIndex}`;
    const setTier = getSetTier(tokenId);

    // Create mint event record
    const mintEvent: Erc1155MintEvent = {
      id: mintId,
      collectionKey: COLLECTION_KEY,
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

    // Record action for activity feed/missions
    recordAction(context, {
      id: mintId,
      actionType: "mint1155",
      actor: minter,
      primaryCollection: COLLECTION_KEY,
      timestamp,
      chainId,
      txHash: event.transaction.hash,
      logIndex: event.logIndex,
      numeric1: quantity,
      numeric2: tokenId,
      context: {
        tokenId: tokenId.toString(),
        setTier,
        operator: operatorLower,
        contract: contractAddress,
        distributionWallet: DISTRIBUTION_WALLET,
      },
    });
  }
);

/**
 * Handle TransferBatch events
 * Treats transfers FROM distribution wallet as mints
 */
export const handleMiberaSetsBatch = MiberaSets.TransferBatch.handler(
  async ({ event, context }) => {
    const { operator, from, to, ids, values } = event.params;
    const fromLower = from.toLowerCase();

    // Only track transfers FROM the distribution wallet (airdrops = mints)
    if (fromLower !== DISTRIBUTION_WALLET) {
      return;
    }

    const contractAddress = event.srcAddress.toLowerCase();
    const operatorLower = operator.toLowerCase();
    const minter = to.toLowerCase();
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
      const mintId = `${txHash}_${event.logIndex}_${index}`;
      const setTier = getSetTier(tokenId);

      // Create mint event record
      const mintEvent: Erc1155MintEvent = {
        id: mintId,
        collectionKey: COLLECTION_KEY,
        tokenId,
        value: quantity,
        minter,
        operator: operatorLower,
        timestamp,
        blockNumber: BigInt(event.block.number),
        transactionHash: txHash,
        chainId,
      };

      context.Erc1155MintEvent.set(mintEvent);

      // Record action for activity feed/missions
      recordAction(context, {
        id: mintId,
        actionType: "mint1155",
        actor: minter,
        primaryCollection: COLLECTION_KEY,
        timestamp,
        chainId,
        txHash,
        logIndex: event.logIndex,
        numeric1: quantity,
        numeric2: tokenId,
        context: {
          tokenId: tokenId.toString(),
          setTier,
          operator: operatorLower,
          contract: contractAddress,
          distributionWallet: DISTRIBUTION_WALLET,
          batchIndex: index,
        },
      });
    }
  }
);
