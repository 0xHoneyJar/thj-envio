/**
 * Seaport Handler - Tracks marketplace trades for activity feed
 *
 * Creates MintActivity records for both SALE and PURCHASE events
 * Used to track secondary market activity contributing to liquid backing
 */

import { Seaport } from "generated";
import type { MintActivity } from "generated";

const BERACHAIN_ID = 80094;
const MIBERA_CONTRACT = "0x6666397dfe9a8c469bf65dc744cb1c733416c420";
const WBERA_CONTRACT = "0x6969696969696969696969696969696969696969";

// Tuple indices for offer: [itemType, token, identifier, amount]
const OFFER_ITEM_TYPE = 0;
const OFFER_TOKEN = 1;
const OFFER_IDENTIFIER = 2;
const OFFER_AMOUNT = 3;

// Tuple indices for consideration: [itemType, token, identifier, amount, recipient]
const CONS_ITEM_TYPE = 0;
const CONS_TOKEN = 1;
const CONS_IDENTIFIER = 2;
const CONS_AMOUNT = 3;

/**
 * Handle OrderFulfilled - Track Seaport marketplace trades
 * Creates both SALE (for seller) and PURCHASE (for buyer) activity records
 */
export const handleSeaportOrderFulfilled = Seaport.OrderFulfilled.handler(
  async ({ event, context }) => {
    const { offerer, recipient, offer, consideration } = event.params;
    const timestamp = BigInt(event.block.timestamp);
    const blockNumber = BigInt(event.block.number);
    const txHash = event.transaction.hash;

    const offererLower = offerer.toLowerCase();
    const recipientLower = recipient.toLowerCase();

    // Skip if offerer and recipient are the same (self-trade)
    if (offererLower === recipientLower) {
      return;
    }

    // Check if offer array has items
    if (!offer || offer.length === 0) {
      return;
    }

    const firstOffer = offer[0];
    const firstOfferToken = String(firstOffer[OFFER_TOKEN]).toLowerCase();

    let amountPaid = 0n;
    let tokenId: bigint | undefined;
    let seller: string | undefined;
    let buyer: string | undefined;

    // Scenario 1: WBERA offered (offerer is buyer paying BERA, recipient is seller)
    if (firstOfferToken === WBERA_CONTRACT) {
      amountPaid = BigInt(firstOffer[OFFER_AMOUNT].toString());

      // Check if Mibera NFT is in consideration
      if (
        consideration &&
        consideration.length > 0 &&
        String(consideration[0][CONS_TOKEN]).toLowerCase() === MIBERA_CONTRACT
      ) {
        tokenId = BigInt(consideration[0][CONS_IDENTIFIER].toString());
        buyer = offererLower;
        seller = recipientLower;
      }
    }
    // Scenario 2: Mibera NFT offered (offerer is seller, recipient is buyer)
    else if (firstOfferToken === MIBERA_CONTRACT) {
      tokenId = BigInt(firstOffer[OFFER_IDENTIFIER].toString());
      seller = offererLower;
      buyer = recipientLower;

      // Sum up native token payments from consideration (itemType 0 = native ETH/BERA)
      for (const item of consideration) {
        if (Number(item[CONS_ITEM_TYPE]) === 0) {
          amountPaid += BigInt(item[CONS_AMOUNT].toString());
        }
      }
    }

    // If we found a valid Mibera trade, create activity records
    if (tokenId !== undefined && seller && buyer && amountPaid > 0n) {
      // Create SALE record for seller
      const saleId = `${txHash}_${tokenId}_${seller}_SALE`;
      const saleActivity: MintActivity = {
        id: saleId,
        user: seller,
        contract: MIBERA_CONTRACT,
        tokenStandard: "ERC721",
        tokenId,
        quantity: 1n,
        amountPaid,
        activityType: "SALE",
        timestamp,
        blockNumber,
        transactionHash: txHash,
        operator: undefined,
        chainId: BERACHAIN_ID,
      };
      context.MintActivity.set(saleActivity);

      // Create PURCHASE record for buyer
      const purchaseId = `${txHash}_${tokenId}_${buyer}_PURCHASE`;
      const purchaseActivity: MintActivity = {
        id: purchaseId,
        user: buyer,
        contract: MIBERA_CONTRACT,
        tokenStandard: "ERC721",
        tokenId,
        quantity: 1n,
        amountPaid,
        activityType: "PURCHASE",
        timestamp,
        blockNumber,
        transactionHash: txHash,
        operator: undefined,
        chainId: BERACHAIN_ID,
      };
      context.MintActivity.set(purchaseActivity);
    }
  }
);
