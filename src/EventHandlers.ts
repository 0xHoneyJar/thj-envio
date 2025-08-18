/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import {
  HoneyJar,
  HoneyJar_Approval,
  HoneyJar_ApprovalForAll,
  HoneyJar_BaseURISet,
  HoneyJar_OwnershipTransferred,
  HoneyJar_SetGenerated,
  HoneyJar_Transfer,
  Transfer,
  Holder,
  CollectionStat,
} from "generated";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ADDRESS_TO_COLLECTION: Record<string, string> = {
  // mainnet
  "0xa20cf9b0874c3e46b344deaaea9c2e0c3e1db37d": "HoneyJar1",
  "0x98dc31a9648f04e23e4e36b0456d1951531c2a05": "HoneyJar6",
  // arbitrum
  "0x1b2751328f41d1a0b91f3710edcd33e996591b72": "HoneyJar2",
  // zora
  "0xe798c4d40bc050bc93c7f3b149a0dfe5cfc49fb0": "HoneyJar3",
  // optimism
  "0xe1d16cc75c9f39a2e0f5131eb39d4b634b23f301": "HoneyJar4",
  // base
  "0xbad7b49d985bbfd3a22706c447fb625a28f048b4": "HoneyJar5",
};

HoneyJar.Transfer.handler(async ({ event, context }) => {
  // Keep the original simple event entity for reference/testing
  const basic: HoneyJar_Transfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    from: event.params.from,
    to: event.params.to,
    tokenId: event.params.tokenId,
  };
  context.HoneyJar_Transfer.set(basic);

  const from = event.params.from.toLowerCase();
  const to = event.params.to.toLowerCase();
  const tokenId = event.params.tokenId;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  const chainId = event.chainId;
  const txHash = event.transaction.hash;
  const isMint = from === ZERO_ADDRESS;

  const contractAddress = event.srcAddress.toLowerCase();
  const collection = ADDRESS_TO_COLLECTION[contractAddress] ?? "unknown";

  const transferId = `${collection}-${txHash}-${event.logIndex}`;
  const transferEntity: Transfer = {
    id: transferId,
    tokenId,
    from,
    to,
    timestamp,
    blockNumber,
    transactionHash: txHash,
    collection,
    chainId,
  };
  context.Transfer.set(transferEntity);

  // Update holders
  if (!isMint) {
    const fromHolderId = `${from}-${collection}`;
    const fromHolder = await context.Holder.get(fromHolderId);
    if (fromHolder) {
      const updatedFrom: Holder = {
        ...fromHolder,
        balance: Math.max(0, fromHolder.balance - 1),
        lastActivityTime: timestamp,
      };
      context.Holder.set(updatedFrom);
    }
  }

  let isNewToHolder = false;
  if (to !== ZERO_ADDRESS) {
    const toHolderId = `${to}-${collection}`;
    const existingTo = await context.Holder.get(toHolderId);
    if (existingTo) {
      const updatedTo: Holder = {
        ...existingTo,
        balance: existingTo.balance + 1,
        totalMinted: isMint
          ? existingTo.totalMinted + 1
          : existingTo.totalMinted,
        lastActivityTime: timestamp,
      };
      context.Holder.set(updatedTo);
    } else {
      isNewToHolder = true;
      const newTo: Holder = {
        id: toHolderId,
        address: to,
        balance: 1,
        totalMinted: isMint ? 1 : 0,
        lastActivityTime: timestamp,
        firstMintTime: isMint ? timestamp : undefined,
        collection,
        chainId,
      };
      context.Holder.set(newTo);
    }
  }

  // Update collection stats
  const statsId = collection;
  const existingStats = await context.CollectionStat.get(statsId);
  const currentTokenId = Number(tokenId);

  if (existingStats) {
    const shouldUpdateSupply =
      currentTokenId > (existingStats.totalSupply || 0);
    const updatedStats: CollectionStat = {
      ...existingStats,
      totalSupply: shouldUpdateSupply
        ? currentTokenId
        : existingStats.totalSupply,
      lastMintTime: isMint ? timestamp : existingStats.lastMintTime,
      uniqueHolders:
        to !== ZERO_ADDRESS && isNewToHolder
          ? existingStats.uniqueHolders + 1
          : existingStats.uniqueHolders,
    };
    context.CollectionStat.set(updatedStats);
  } else {
    const initialStats: CollectionStat = {
      id: statsId,
      collection,
      totalSupply: currentTokenId,
      uniqueHolders: to !== ZERO_ADDRESS ? 1 : 0,
      lastMintTime: isMint ? timestamp : undefined,
      chainId,
    };
    context.CollectionStat.set(initialStats);
  }
});
