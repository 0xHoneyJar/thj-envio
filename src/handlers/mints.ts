/*
 * Generalized ERC721 mint tracking handler.
 *
 * Captures Transfer events where the token is minted (from zero address)
 * and stores normalized MintEvent entities for downstream consumers.
 */

import { GeneralMints, MintEvent } from "generated";

import { recordAction } from "../lib/actions";

import { ZERO_ADDRESS } from "./constants";
import { MINT_COLLECTION_KEYS } from "./mints/constants";

const ZERO = ZERO_ADDRESS.toLowerCase();

export const handleGeneralMintTransfer = GeneralMints.Transfer.handler(
  async ({ event, context }) => {
    const { from, to, tokenId } = event.params;

    const fromLower = from.toLowerCase();
    if (fromLower !== ZERO) {
      return; // Skip non-mint transfers
    }

    const contractAddress = event.srcAddress.toLowerCase();
    const collectionKey =
      MINT_COLLECTION_KEYS[contractAddress] ?? contractAddress;

    const id = `${event.transaction.hash}_${event.logIndex}`;
    const timestamp = BigInt(event.block.timestamp);
    const chainId = event.chainId;
    const minter = to.toLowerCase();
    const mintEvent: MintEvent = {
      id,
      collectionKey,
      tokenId: BigInt(tokenId.toString()),
      minter,
      timestamp,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
      chainId,
      encodedTraits: undefined, // Will be populated by VM Minted handler if applicable
    };

    context.MintEvent.set(mintEvent);

    recordAction(context, {
      id,
      actionType: "mint",
      actor: minter,
      primaryCollection: collectionKey,
      timestamp,
      chainId,
      txHash: event.transaction.hash,
      logIndex: event.logIndex,
      numeric1: 1n,
      context: {
        tokenId: tokenId.toString(),
        contract: contractAddress,
      },
    });
  }
);
