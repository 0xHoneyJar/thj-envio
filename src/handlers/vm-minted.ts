/*
 * VM Minted Event Handler
 *
 * Captures Minted(user, tokenId, traits) events from the VM contract.
 * Enriches MintEvent entities with encoded trait data needed for metadata recovery.
 *
 * This handler captures the custom Minted event that includes the encoded_traits string,
 * which is critical for regenerating VM metadata if it fails during the initial mint.
 */

import { GeneralMints, MintEvent } from "generated";

export const handleVmMinted = GeneralMints.Minted.handler(
  async ({ event, context }) => {
    const { user, tokenId, traits } = event.params;

    const contractAddress = event.srcAddress.toLowerCase();
    const minter = user.toLowerCase();
    const id = `${event.transaction.hash}_${event.logIndex}`;
    const timestamp = BigInt(event.block.timestamp);
    const chainId = event.chainId;

    // Check if MintEvent already exists (from Transfer handler)
    const existingMintEvent = await context.MintEvent.get(id);

    // Create new MintEvent with encoded traits
    // If it already exists, spread its properties; otherwise create new
    const mintEvent = {
      ...(existingMintEvent || {
        id,
        collectionKey: "mibera_vm", // VM contract collection key
        tokenId: BigInt(tokenId.toString()),
        minter,
        timestamp,
        blockNumber: BigInt(event.block.number),
        transactionHash: event.transaction.hash,
        chainId,
      }),
      encodedTraits: traits, // Add or update encoded traits
    };

    context.MintEvent.set(mintEvent);

    console.log(`[VM Minted] Stored traits for tokenId ${tokenId}: ${traits}`);
  }
);
