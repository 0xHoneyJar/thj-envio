/*
 * Crayons ERC721 Collections - Transfer Indexing
 *
 * Indexes Transfer events for Crayons ERC721 Base collections deployed by the Crayons Factory.
 * Stores ownership in Token, movements in Transfer, per-collection Holder balances, and CollectionStat.
 *
 * Collection identifier: the on-chain collection address (lowercase string).
 */

import { ZERO_ADDRESS } from "./constants";
import { Holder, Token, Transfer, CollectionStat, CrayonsCollection } from "generated";

export const handleCrayonsErc721Transfer = CrayonsCollection.Transfer.handler(
  async ({ event, context }) => {
    const { from, to, tokenId } = event.params;
    const collection = event.srcAddress.toLowerCase();
    const chainId = event.chainId;
    const ts = BigInt(event.block.timestamp);

    // Transfer entity
    const id = `${event.transaction.hash}_${event.logIndex}`;
    const transfer: Transfer = {
      id,
      tokenId: BigInt(tokenId.toString()),
      from: from.toLowerCase(),
      to: to.toLowerCase(),
      timestamp: ts,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
      collection,
      chainId,
    };
    context.Transfer.set(transfer);

    // Token upsert
    const tokenKey = `${collection}_${chainId}_${tokenId}`;
    let token = await context.Token.get(tokenKey);
    if (!token) {
      token = {
        id: tokenKey,
        collection,
        chainId,
        tokenId: BigInt(tokenId.toString()),
        owner: to.toLowerCase(),
        isBurned: to.toLowerCase() === ZERO_ADDRESS.toLowerCase(),
        mintedAt: from.toLowerCase() === ZERO_ADDRESS.toLowerCase() ? ts : BigInt(0),
        lastTransferTime: ts,
      } as Token;
    } else {
      token = {
        ...token,
        owner: to.toLowerCase(),
        isBurned: to.toLowerCase() === ZERO_ADDRESS.toLowerCase(),
        lastTransferTime: ts,
      } as Token;
    }
    context.Token.set(token);

    // Holder balances
    await updateHolder(context, collection, chainId, from.toLowerCase(), -1, ts);
    await updateHolder(context, collection, chainId, to.toLowerCase(), +1, ts, from.toLowerCase() === ZERO_ADDRESS.toLowerCase());

    // Collection stats
    await updateCollectionStats(context, collection, chainId, from.toLowerCase(), to.toLowerCase(), ts);
  }
);

async function updateHolder(
  context: any,
  collection: string,
  chainId: number,
  address: string,
  delta: number,
  ts: bigint,
  isMint: boolean = false,
) {
  if (address === ZERO_ADDRESS.toLowerCase()) return;
  const id = `${collection}_${chainId}_${address}`;
  let holder = await context.Holder.get(id);
  if (!holder) {
    holder = {
      id,
      address,
      balance: 0,
      totalMinted: 0,
      lastActivityTime: ts,
      firstMintTime: isMint ? ts : undefined,
      collection,
      chainId,
    } as Holder;
  }
  const updated: Holder = {
    ...holder,
    balance: Math.max(0, holder.balance + delta),
    totalMinted: isMint ? holder.totalMinted + 1 : holder.totalMinted,
    lastActivityTime: ts,
    firstMintTime: holder.firstMintTime ?? (isMint ? ts : undefined),
  };
  context.Holder.set(updated);
}

async function updateCollectionStats(
  context: any,
  collection: string,
  chainId: number,
  from: string,
  to: string,
  ts: bigint,
) {
  const id = `${collection}_${chainId}`;
  let stats = await context.CollectionStat.get(id);
  if (!stats) {
    stats = {
      id,
      collection,
      totalSupply: 0,
      totalMinted: 0,
      totalBurned: 0,
      uniqueHolders: 0,
      lastMintTime: undefined,
      chainId,
    } as CollectionStat;
  }

  let uniqueAdj = 0;
  if (to !== ZERO_ADDRESS.toLowerCase()) {
    const toHolder = await context.Holder.get(`${collection}_${chainId}_${to}`);
    if (!toHolder || toHolder.balance === 0) uniqueAdj += 1;
  }
  if (from !== ZERO_ADDRESS.toLowerCase()) {
    const fromHolder = await context.Holder.get(`${collection}_${chainId}_${from}`);
    if (fromHolder && fromHolder.balance === 1) uniqueAdj -= 1;
  }

  const updated: CollectionStat = {
    ...stats,
    totalSupply:
      from === ZERO_ADDRESS.toLowerCase()
        ? stats.totalSupply + 1
        : to === ZERO_ADDRESS.toLowerCase()
        ? stats.totalSupply - 1
        : stats.totalSupply,
    totalMinted: from === ZERO_ADDRESS.toLowerCase() ? stats.totalMinted + 1 : stats.totalMinted,
    totalBurned: to === ZERO_ADDRESS.toLowerCase() ? stats.totalBurned + 1 : stats.totalBurned,
    lastMintTime: from === ZERO_ADDRESS.toLowerCase() ? ts : stats.lastMintTime,
    uniqueHolders: Math.max(0, stats.uniqueHolders + uniqueAdj),
  } as CollectionStat;

  context.CollectionStat.set(updated);
}

