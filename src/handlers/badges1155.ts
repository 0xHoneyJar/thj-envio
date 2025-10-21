import { CubBadges1155 } from "generated";
import type {
  HandlerContext,
  BadgeHolder as BadgeHolderEntity,
  BadgeBalance as BadgeBalanceEntity,
  BadgeAmount as BadgeAmountEntity,
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

const makeHolderId = (address: string) => address;

const makeBalanceId = (
  chainId: number,
  address: string,
  contract: string,
  tokenId: bigint
) => `${chainId}-${address}-${contract}-${tokenId.toString()}`;

const makeBadgeAmountId = (address: string, tokenId: bigint) =>
  `${address}-${tokenId.toString()}`;

const cloneHoldings = (
  rawHoldings: unknown,
): Record<string, string> => {
  if (!rawHoldings || typeof rawHoldings !== "object") {
    return {};
  }

  const entries = Object.entries(
    rawHoldings as Record<string, unknown>,
  );

  const result: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (typeof value === "string") {
      result[key] = value;
    } else if (typeof value === "number") {
      result[key] = Math.trunc(value).toString();
    } else if (typeof value === "bigint") {
      result[key] = value.toString();
    }
  }

  return result;
};

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
  const holderId = makeHolderId(normalizedAddress);
  const balanceId = makeBalanceId(
    chainId,
    normalizedAddress,
    normalizedContract,
    tokenId
  );
  const badgeAmountId = makeBadgeAmountId(holderId, tokenId);

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

  if (appliedDelta === 0n) {
    return;
  }

  const tokenKey = tokenId.toString();
  const existingHolder = await context.BadgeHolder.get(holderId);
  const holderAddressField = existingHolder?.address ?? normalizedAddress;
  const currentHoldings = cloneHoldings(existingHolder?.holdings);
  const previousHoldingAmount = BigInt(
    currentHoldings[tokenKey] ?? "0",
  );
  let nextHoldingAmount = previousHoldingAmount + appliedDelta;
  if (nextHoldingAmount < 0n) {
    nextHoldingAmount = 0n;
  }

  if (nextHoldingAmount === 0n) {
    delete currentHoldings[tokenKey];
  } else {
    currentHoldings[tokenKey] = nextHoldingAmount.toString();
  }

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
    totalAmount: nextTotal,
    holdings: currentHoldings,
    updatedAt: timestamp,
  };

  context.BadgeHolder.set(holder);

  const existingBadgeAmount = await context.BadgeAmount.get(badgeAmountId);
  if (nextHoldingAmount === 0n) {
    if (existingBadgeAmount) {
      context.BadgeAmount.deleteUnsafe(badgeAmountId);
    }
  } else {
    const badgeAmount: BadgeAmountEntity = {
      id: badgeAmountId,
      holder_id: holderId,
      badgeId: tokenKey,
      amount: nextHoldingAmount,
      updatedAt: timestamp,
    };
    context.BadgeAmount.set(badgeAmount);
  }

  if (nextBalance <= 0n) {
    if (existingBalance) {
      context.BadgeBalance.deleteUnsafe(balanceId);
    }
    return;
  }

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
