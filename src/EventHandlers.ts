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
} from "generated";

HoneyJar.Approval.handler(async ({ event, context }) => {
  const entity: HoneyJar_Approval = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    owner: event.params.owner,
    approved: event.params.approved,
    tokenId: event.params.tokenId,
  };

  context.HoneyJar_Approval.set(entity);
});

HoneyJar.ApprovalForAll.handler(async ({ event, context }) => {
  const entity: HoneyJar_ApprovalForAll = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    owner: event.params.owner,
    operator: event.params.operator,
    approved: event.params.approved,
  };

  context.HoneyJar_ApprovalForAll.set(entity);
});

HoneyJar.BaseURISet.handler(async ({ event, context }) => {
  const entity: HoneyJar_BaseURISet = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    uri: event.params.uri,
  };

  context.HoneyJar_BaseURISet.set(entity);
});

HoneyJar.OwnershipTransferred.handler(async ({ event, context }) => {
  const entity: HoneyJar_OwnershipTransferred = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    previousOwner: event.params.previousOwner,
    newOwner: event.params.newOwner,
  };

  context.HoneyJar_OwnershipTransferred.set(entity);
});

HoneyJar.SetGenerated.handler(async ({ event, context }) => {
  const entity: HoneyJar_SetGenerated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    generated: event.params.generated,
  };

  context.HoneyJar_SetGenerated.set(entity);
});

HoneyJar.Transfer.handler(async ({ event, context }) => {
  const entity: HoneyJar_Transfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    from: event.params.from,
    to: event.params.to,
    tokenId: event.params.tokenId,
  };

  context.HoneyJar_Transfer.set(entity);
});
