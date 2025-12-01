/**
 * Mibera Collection Transfer Handler
 *
 * Tracks NFT transfers (including mints) for activity feeds
 * Used to replace /api/activity endpoint that fetches from mibera-squid
 */

import { MiberaCollection } from "generated";
import type { MiberaTransfer } from "generated";
import { recordAction } from "../lib/actions";

const BERACHAIN_ID = 80094;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const MIBERA_COLLECTION_ADDRESS = "0x6666397dfe9a8c469bf65dc744cb1c733416c420";

/**
 * Handle Transfer - Track all NFT transfers including mints
 * Event: Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
 */
export const handleMiberaCollectionTransfer = MiberaCollection.Transfer.handler(
  async ({ event, context }) => {
    const timestamp = BigInt(event.block.timestamp);
    const from = event.params.from.toLowerCase();
    const to = event.params.to.toLowerCase();
    const tokenId = event.params.tokenId;
    const txHash = event.transaction.hash;

    const isMint = from === ZERO_ADDRESS;

    // Create transfer record
    const transferId = `${txHash}_${event.logIndex}`;
    const transfer: MiberaTransfer = {
      id: transferId,
      from,
      to,
      tokenId,
      isMint,
      timestamp,
      blockNumber: BigInt(event.block.number),
      transactionHash: txHash,
      chainId: BERACHAIN_ID,
    };
    context.MiberaTransfer.set(transfer);

    // Record action for activity feeds
    if (isMint) {
      recordAction(context, {
        actionType: "mibera_mint",
        actor: to,
        primaryCollection: MIBERA_COLLECTION_ADDRESS,
        timestamp,
        chainId: BERACHAIN_ID,
        txHash,
        logIndex: event.logIndex,
        numeric1: tokenId,
      });
    } else {
      recordAction(context, {
        actionType: "mibera_transfer",
        actor: from,
        primaryCollection: MIBERA_COLLECTION_ADDRESS,
        timestamp,
        chainId: BERACHAIN_ID,
        txHash,
        logIndex: event.logIndex,
        numeric1: tokenId,
        context: { to },
      });
    }
  }
);
