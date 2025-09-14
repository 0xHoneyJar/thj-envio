import { Address, EthChainId, HexString } from "@envio-dev/hyper-sync";
import { DB } from "../generated";

// Skeleton handler for Crayons Factory emits. This records the discovery event.
// Follow-up work will add dynamic tracking of ERC721 Base collection transfers
// and populate Token/Transfer entities for holders/stats.

export async function handleCrayonsFactoryNewBase(
  db: DB,
  chainId: EthChainId,
  event: {
    params: { owner: Address; erc721Base: Address };
    transaction: { hash: HexString };
    block: { number: bigint; timestamp: bigint };
  },
) {
  // For now, just log discovered collections to the DB as a generic event log.
  // When a Crayons Collection model is added to schema.graphql, insert it here.
  await db.insert("Transfer", {
    id: `${event.transaction.hash}_crayons_factory_${event.params.erc721Base.toLowerCase()}`,
    tokenId: 0n,
    from: event.params.owner.toLowerCase(),
    to: event.params.erc721Base.toLowerCase(),
    timestamp: Number(event.block.timestamp),
    blockNumber: Number(event.block.number),
    transactionHash: event.transaction.hash.toLowerCase(),
    collection: "crayons_factory",
    chainId: Number(chainId),
  });
}

