/**
 * Mibera Collection Transfer Handler
 *
 * Tracks NFT transfers (including mints and burns) for activity feeds
 * Used to replace /api/activity endpoint that fetches from mibera-squid
 */

import { MiberaCollection } from "generated";
import type { MiberaTransfer, MintActivity, NftBurn, NftBurnStats } from "generated";
import { recordAction } from "../lib/actions";
import { isMintFromZero, isBurnTransfer } from "../lib/mint-detection";
import { BERACHAIN_ID } from "./constants";

const MIBERA_COLLECTION_ADDRESS = "0x6666397dfe9a8c469bf65dc744cb1c733416c420";
const MIBERA_COLLECTION_KEY = "mibera";

/**
 * Handle Transfer - Track all NFT transfers including mints and burns
 * Event: Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
 */
export const handleMiberaCollectionTransfer = MiberaCollection.Transfer.handler(
  async ({ event, context }) => {
    const timestamp = BigInt(event.block.timestamp);
    const from = event.params.from.toLowerCase();
    const to = event.params.to.toLowerCase();
    const tokenId = event.params.tokenId;
    const txHash = event.transaction.hash;
    const blockNumber = BigInt(event.block.number);

    const isMint = isMintFromZero(from);
    const isBurn = isBurnTransfer(from, to);

    // Get transaction value (BERA paid) for mints
    // Note: transaction.value is available because we added it to field_selection in config
    const txValue = (event.transaction as any).value;
    const amountPaid = txValue ? BigInt(txValue.toString()) : 0n;

    // Create transfer record
    const transferId = `${txHash}_${event.logIndex}`;
    const transfer: MiberaTransfer = {
      id: transferId,
      from,
      to,
      tokenId,
      isMint,
      timestamp,
      blockNumber,
      transactionHash: txHash,
      chainId: BERACHAIN_ID,
    };
    context.MiberaTransfer.set(transfer);

    // Create MintActivity record for mints (for unified activity feed)
    if (isMint) {
      const mintActivityId = `${txHash}_${tokenId}_${to}_MINT`;
      const mintActivity: MintActivity = {
        id: mintActivityId,
        user: to,
        contract: MIBERA_COLLECTION_ADDRESS,
        tokenStandard: "ERC721",
        tokenId,
        quantity: 1n,
        amountPaid,
        activityType: "MINT",
        timestamp,
        blockNumber,
        transactionHash: txHash,
        operator: undefined,
        chainId: BERACHAIN_ID,
      };
      context.MintActivity.set(mintActivity);

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
    } else if (isBurn) {
      // Record burn event
      const burnId = `${txHash}_${event.logIndex}`;
      const burn: NftBurn = {
        id: burnId,
        collectionKey: MIBERA_COLLECTION_KEY,
        tokenId,
        from,
        timestamp,
        blockNumber: BigInt(event.block.number),
        transactionHash: txHash,
        chainId: BERACHAIN_ID,
      };
      context.NftBurn.set(burn);

      // Update burn stats
      const statsId = `${BERACHAIN_ID}_${MIBERA_COLLECTION_KEY}`;
      const existingStats = await context.NftBurnStats.get(statsId);

      const stats: NftBurnStats = {
        id: statsId,
        chainId: BERACHAIN_ID,
        collectionKey: MIBERA_COLLECTION_KEY,
        totalBurned: (existingStats?.totalBurned ?? 0) + 1,
        uniqueBurners: existingStats?.uniqueBurners ?? 1, // TODO: Track unique burners properly
        lastBurnTime: timestamp,
        firstBurnTime: existingStats?.firstBurnTime ?? timestamp,
      };
      context.NftBurnStats.set(stats);

      // Record action for activity feeds
      recordAction(context, {
        actionType: "mibera_burn",
        actor: from,
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
