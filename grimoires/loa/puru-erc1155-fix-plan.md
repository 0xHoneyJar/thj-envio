# Change Plan: Puru ERC-1155 Handler Fix

## Problem Statement

Three Purupuru ERC-721-assumed contracts on Base (chain 8453) are registered under the `TrackedErc721` handler, which listens for `Transfer(address indexed from, address indexed to, uint256 indexed tokenId)`. On-chain verification via `supportsInterface` confirms all three are **ERC-1155 contracts** that emit `TransferSingle`/`TransferBatch` events. The handler never fires because the event signature doesn't match.

### Evidence

| Contract | Address | ERC-721 | ERC-1155 | totalSupply | Token IDs |
|----------|---------|---------|----------|-------------|-----------|
| Elemental Jani | 0xcd3ab1B6...335B21 | false | true | 33,606 | 1-13 |
| Boarding Passes | 0x154a563a...2f5fa0 | false | true | 11,678 | 1-4 |
| Introducing Kizuna | 0x85A72EEe...0DcCB | false | true | 19,146 | 1-11 |

Verified on-chain: events at block ~20600000 show topic0 `0xc3d58168...` (TransferSingle), not `0xddf252ad...` (ERC-721 Transfer).

### What Works vs What Doesn't

- `PuruApiculture1155` (same commit, same chain, unique handler name) = **works** (7,028+ events)
- `TrackedErc20` on Base = **works**
- `TrackedErc721` on Optimism (lore articles) = **works**
- `TrackedErc721` on Berachain (tarot, fractures) = **works**
- `TrackedErc721` on Base (puru contracts) = **zero events** (wrong event signature)

## Proposed Changes

### 1. config.yaml — Move 3 addresses from TrackedErc721 to PuruApiculture1155

**Remove** from Base TrackedErc721 (line 642-647):
```yaml
# REMOVE this entire block:
- name: TrackedErc721
  address:
    - 0xcd3ab1B6E95cdB40A19286d863690Eb407335B21
    - 0x154a563ab6c037bd0f041ac91600ffa9fe2f5fa0
    - 0x85A72EEe14dcaA1CCC5616DF39AcdE212280DcCB
  start_block: 20521993
```

**Add** to existing PuruApiculture1155 (line 648-652):
```yaml
- name: PuruApiculture1155
  address:
    - 0x6cfb9280767a3596ee6af887d900014a755ffc75 # Apiculture Szn 0
    - 0xcd3ab1B6E95cdB40A19286d863690Eb407335B21 # puru_elemental_jani
    - 0x154a563ab6c037bd0f041ac91600ffa9fe2f5fa0 # puru_boarding_passes
    - 0x85A72EEe14dcaA1CCC5616DF39AcdE212280DcCB # puru_introducing_kizuna
  start_block: 13803165 # Must use earliest (Apiculture Szn 0 deployment)
```

**Trade-off**: All 4 addresses share `start_block: 13803165`. The 3 new contracts don't emit events until block ~20521993, so ~6.7M blocks are scanned with no matches. This is wasted sync time but functionally correct. Envio does not support per-address start_blocks within the same contract entry.

### 2. src/handlers/puru-apiculture1155.ts — Add collection key mapping + holder tracking

**Current**: Hardcoded `COLLECTION_KEY = "puru_apiculture"`, no holder tracking.

**Proposed**:
- Replace hardcoded key with address-to-key mapping:
  ```typescript
  const PURU_COLLECTION_KEYS: Record<string, string> = {
    "0x6cfb9280767a3596ee6af887d900014a755ffc75": "puru_apiculture",
    "0xcd3ab1b6e95cdb40a19286d863690eb407335b21": "puru_elemental_jani",
    "0x154a563ab6c037bd0f041ac91600ffa9fe2f5fa0": "puru_boarding_passes",
    "0x85a72eee14dcaa1ccc5616df39acde212280dccb": "puru_introducing_kizuna",
  };
  ```
- Add `adjustHolder1155` function (modeled on `adjustHolder` from tracked-erc721.ts):
  - Uses `bigint` delta (ERC-1155 values can exceed Number.MAX_SAFE_INTEGER)
  - Creates `TrackedHolder` entity with aggregate tokenCount across all token IDs
  - Records `hold1155` action (same pattern used by badges1155.ts)
  - Deletes TrackedHolder when count reaches 0
- Add burn detection (`isBurnAddress(to)`) with `burn1155` action

### 3. src/handlers/tracked-erc721/constants.ts — Remove puru entries

**Remove** from `TRACKED_ERC721_COLLECTION_KEYS`:
```
"0xcd3ab1b6e95cdb40a19286d863690eb407335b21": "puru_elemental_jani",
"0x154a563ab6c037bd0f041ac91600ffa9fe2f5fa0": "puru_boarding_passes",
"0x85a72eee14dcaa1ccc5616df39acde212280dccb": "puru_introducing_kizuna",
```

**Remove** from `TRANSFER_TRACKED_COLLECTIONS`:
```
"puru_elemental_jani",
"puru_boarding_passes",
"puru_introducing_kizuna",
```

### 4. No changes to EventHandlers.ts or schema.graphql

- `PuruApiculture1155` handler is already registered in EventHandlers.ts
- `TrackedHolder` entity already exists in schema
- `Erc1155MintEvent` entity already exists
- `hold1155` action type already used by badges1155.ts

## Risk Assessment

### What could break

1. **Existing puru_apiculture data**: LOW RISK. The existing Apiculture Szn 0 contract keeps the same address and handler. Collection key mapping must correctly return `"puru_apiculture"` for the existing address (replacing the hardcoded constant).

2. **TrackedErc721 on other chains**: NO RISK. Removing puru addresses from Base TrackedErc721 does not affect Optimism (lore articles) or Berachain (tarot, fractures). Those remain unchanged.

3. **start_block regression**: LOW RISK. Using 13803165 instead of 20521993 adds ~6.7M empty blocks to scan. This is a sync time cost (~minutes), not a correctness issue.

4. **TrackedHolder ID collisions**: NO RISK. ID format is `{contract}_{chainId}_{address}`. Different contracts produce different IDs.

5. **Downstream consumers (Score API, CubQuests, Set&Forgetti)**: MEDIUM RISK. These apps query the GraphQL endpoint. New action types (`hold1155`, `burn1155`) and `TrackedHolder` entries for puru collections are additive — they don't modify existing data. However, if any consumer queries by `actionType: "hold721"` expecting puru data, they won't find it (it'll be `hold1155` instead). This should be verified.

### What we're NOT changing

- No schema.graphql changes (no migration needed)
- No EventHandlers.ts changes (no new exports)
- No changes to any other handler file
- No changes to any other chain's config
- No changes to the TrackedErc721 handler logic itself

## Validation Plan

1. `pnpm codegen` — regenerate types after config change
2. `pnpm tsc --noEmit` — verify no TypeScript errors
3. Local test with targeted block range (blocks 20600000-20610000 on Base) to verify TransferSingle events fire for puru contracts
4. Query staging endpoint for `puru_elemental_jani` actions after deployment
5. Verify `puru_apiculture` data still present (no regression)
