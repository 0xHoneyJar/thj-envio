import { CubBadges1155 } from "generated";
import type {
  HandlerContext,
  BadgeHolder as BadgeHolderEntity,
  BadgeBalance as BadgeBalanceEntity,
} from "generated";

import { ZERO_ADDRESS } from "./constants";

const ZERO = ZERO_ADDRESS.toLowerCase();

interface BalanceAdjustmentArgs {
  context: HandlerContext;
  holderAddress: string;
  contractAddress: string;
  tokenId: bigint;
  amountDelta: bigint;
  timestamp: bigint;
  chainId: number;
}

const makeHolderId = (chainId: number, address: string) =>
  `${chainId}-${address}`;

const makeBalanceId = (
  chainId: number,
  address: string,
  contract: string,
  tokenId: bigint
) => `${chainId}-${address}-${contract}-${tokenId.toString()}`;

async function adjustBadgeBalances({
  context,
  holderAddress,
  contractAddress,
  tokenId,
  amountDelta,
  timestamp,
  chainId,
}: BalanceAdjustmentArgs): Promise<void> {
  if (amountDelta === 0n) {
    return;
  }

  const normalizedAddress = holderAddress.toLowerCase();
  if (normalizedAddress === ZERO) {
    return;
  }

  const normalizedContract = contractAddress.toLowerCase();
  const holderId = makeHolderId(chainId, normalizedAddress);
  const balanceId = makeBalanceId(
    chainId,
    normalizedAddress,
    normalizedContract,
    tokenId
  );

  const existingBalance = await context.BadgeBalance.get(balanceId);
  const currentBalance = existingBalance?.amount ?? 0n;

  let appliedDelta = amountDelta;
  let nextBalance = currentBalance + amountDelta;

  if (amountDelta < 0n) {
    const removeAmount =
      currentBalance < -amountDelta ? currentBalance : -amountDelta;

    if (removeAmount === 0n) {
      return;
    }

    appliedDelta = -removeAmount;
    nextBalance = currentBalance - removeAmount;
  }

  if (nextBalance <= 0n) {
    if (existingBalance) {
      context.BadgeBalance.deleteUnsafe(balanceId);
    }
  } else {
    const balance: BadgeBalanceEntity = {
      id: balanceId,
      holder_id: holderId,
      contract: normalizedContract,
      tokenId,
      chainId,
      amount: nextBalance,
      updatedAt: timestamp,
    };

    context.BadgeBalance.set(balance);
  }

  if (appliedDelta === 0n) {
    return;
  }

  const existingHolder = await context.BadgeHolder.get(holderId);
  const holderAddressField =
    existingHolder?.address ?? normalizedAddress;
  const currentTotal = existingHolder?.totalBadges ?? 0n;
  let nextTotal = currentTotal + appliedDelta;

  if (nextTotal < 0n) {
    nextTotal = 0n;
  }

  const holder: BadgeHolderEntity = {
    id: holderId,
    address: holderAddressField,
    chainId,
    totalBadges: nextTotal,
    updatedAt: timestamp,
  };

  context.BadgeHolder.set(holder);
}

export const handleCubBadgesTransferSingle =
  CubBadges1155.TransferSingle.handler(async ({ event, context }) => {
    const { from, to, id, value } = event.params;
    const chainId = event.chainId;
    const timestamp = BigInt(event.block.timestamp);
    const contractAddress = event.srcAddress.toLowerCase();
    const tokenId = BigInt(id.toString());
    const quantity = BigInt(value.toString());

    if (quantity === 0n) {
      return;
    }

    await adjustBadgeBalances({
      context,
      holderAddress: from,
      contractAddress,
      tokenId,
      amountDelta: -quantity,
      timestamp,
      chainId,
    });

    await adjustBadgeBalances({
      context,
      holderAddress: to,
      contractAddress,
      tokenId,
      amountDelta: quantity,
      timestamp,
      chainId,
    });
  });

export const handleCubBadgesTransferBatch =
  CubBadges1155.TransferBatch.handler(async ({ event, context }) => {
    const { from, to, ids, values } = event.params;
    const chainId = event.chainId;
    const timestamp = BigInt(event.block.timestamp);
    const contractAddress = event.srcAddress.toLowerCase();

    const idsArray = Array.from(ids);
    const valuesArray = Array.from(values);
    const length = Math.min(idsArray.length, valuesArray.length);

    for (let index = 0; index < length; index += 1) {
      const rawId = idsArray[index];
      const rawValue = valuesArray[index];

      if (rawId === undefined || rawValue === undefined || rawValue === null) {
        continue;
      }

      const tokenId = BigInt(rawId.toString());
      const quantity = BigInt(rawValue.toString());

      if (quantity === 0n) {
        continue;
      }

      await adjustBadgeBalances({
        context,
        holderAddress: from,
        contractAddress,
        tokenId,
        amountDelta: -quantity,
        timestamp,
        chainId,
      });

      await adjustBadgeBalances({
        context,
        holderAddress: to,
        contractAddress,
        tokenId,
        amountDelta: quantity,
        timestamp,
        chainId,
      });
    }
  });
