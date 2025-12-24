/*
 * VM Minted Event Handler
 *
 * Captures Minted(user, tokenId, traits) events from the VM contract.
 * Enriches MintEvent entities with encoded trait data needed for metadata recovery.
 *
 * This handler captures the custom Minted event that includes the encoded_traits string,
 * which is critical for regenerating VM metadata if it fails during the initial mint.
 *
 * NOTE: This handler does NOT create new MintEvent entities. It only enriches
 * existing MintEvent entities created by the Transfer handler in mints.ts.
 * The Transfer event and Minted event have different logIndexes, so we look up
 * by txHash + tokenId pattern to find the correct MintEvent to update.
 */

import { GeneralMints, MintEvent } from "generated";

export const handleVmMinted = GeneralMints.Minted.handler(
  async ({ event, context }) => {
    const { user, tokenId, traits } = event.params;
    const txHash = event.transaction.hash;

    // Find the MintEvent created by the Transfer handler
    // The Transfer handler creates MintEvents with id = `${txHash}_${logIndex}`
    // We need to find it by querying, but Envio doesn't support queries in handlers.
    // Instead, we'll use a predictable ID pattern: the Transfer event typically
    // fires right before the Minted event, so its logIndex is event.logIndex - 1
    const transferLogIndex = event.logIndex - 1;
    const transferEventId = `${txHash}_${transferLogIndex}`;

    const existingMintEvent = await context.MintEvent.get(transferEventId);

    if (existingMintEvent) {
      // Update the existing MintEvent with encoded traits
      context.MintEvent.set({
        ...existingMintEvent,
        encodedTraits: traits,
      });
      console.log(`[VM Minted] Updated traits for tokenId ${tokenId}: ${traits}`);
    } else {
      // Log warning - the Transfer handler should have created this already
      console.warn(
        `[VM Minted] No existing MintEvent found for txHash ${txHash}, tokenId ${tokenId}. ` +
        `Expected at logIndex ${transferLogIndex}, but MintEvent was not found.`
      );
      // Do NOT create a new MintEvent here - let the Transfer handler handle creation
    }
  }
);
