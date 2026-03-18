# PRD: Indexer V3 Migration & Base Secondary Sales Tracking

> Branch: `perf/v3-migration-and-optimizations`
> Created: 2026-03-18
> Status: Draft

## 1. Problem Statement

The THJ Envio indexer currently takes **1-2 days** to fully sync across 6 chains and 50 contracts. This severely impacts developer iteration speed when adding new events or fixing handlers. Additionally, secondary marketplace sales of THJ APAC / Purupuru NFTs on Base are not being tracked, leaving a gap in the activity feed and quest attribution system.

> Sources: codebase analysis, k-hole dig (envio optimization), zerker interview

## 2. Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| G-1: Reduce sync time | Historical backfill duration | <8 hours (from 1-2 days) |
| G-2: Track Base secondary sales | MintActivity records for Puru NFTs on Base | 100% coverage of Seaport trades |
| G-3: Modernize stack | HyperIndex version | V3 stable (3.0.0-alpha.14+) |
| G-4: No data regression | Entity count comparison | All existing entities preserved |

## 3. Scope

### In Scope

**Feature 1: HyperIndex V3 Migration**
- Migrate from Envio 2.32.2 → 3.0.0-alpha.14
- ESM migration (`"type": "module"` in package.json)
- Config changes (`networks` → `chains`, remove deprecated options)
- Handler API updates (`experimental_createEffect` → `createEffect`, `getWhere` GraphQL syntax)
- Node.js 22+ requirement
- HyperSync API token setup
- 3x faster historical backfills

**Feature 2: Base Secondary Sales Tracking**
- Refactor Seaport handler from single-chain/single-collection to multi-chain/multi-collection
- Add Base Seaport contract back to config with proper start_block
- Track sales of Purupuru NFT collections on Base:
  - `0xcd3ab1B6E95cdB40A19286d863690Eb407335B21` (puru_elemental_jani)
  - `0x154a563ab6c037bd0f041ac91600ffa9fe2f5fa0` (puru_boarding_passes)
  - `0x85A72EEe14dcaA1CCC5616DF39AcdE212280DcCB` (puru_introducing_kizuna)
- Use ETH/WETH as payment token on Base (not WBERA)

### Out of Scope
- Indexer splitting into multiple services (future PR)
- Reservoir/Relay protocol integration (overkill for current volume)
- Party.app-specific tracking (platform deprecating March 2026)
- ClickHouse sink (experimental V3 feature, not needed yet)

## 4. Technical Requirements

### Feature 1: V3 Migration

#### Config Changes (config.yaml)
- Rename `networks` → `chains`
- Remove `unordered_multichain_mode: true` (now default)
- Remove `preload_handlers: true` (now default)
- Rename `confirmed_block_threshold` → `max_reorg_depth` (if used)
- Remove deprecated `rpc_config` → use `rpc` array

#### Package Changes (package.json)
- Add `"type": "module"`
- Update `envio` to `3.0.0-alpha.14`
- Update `engines.node` to `>=22.0.0`
- Update TypeScript to `^5.7.3`

#### tsconfig.json
- Update `module` to `ESNext`
- Update `moduleResolution` to `bundler`
- Add `verbatimModuleSyntax: true`

#### Handler Code Changes
- `experimental_createEffect` → `createEffect` (sf-vaults.ts)
- `getWhere.field.eq(val)` → `getWhere({ field: { _eq: val } })` (all handlers using getWhere)
- `block.chainId` / `transaction.chainId` → `context.chain.id` (if used)
- Address type may change from `string` to `` `0x${string}` ``

#### Environment
- Set `ENVIO_API_TOKEN` in `.env` (free from envio.dev/app/api-tokens)

### Feature 2: Base Secondary Sales

#### Seaport Handler Refactor
Current state (seaport.ts):
- Hardcoded to `BERACHAIN_ID = 80094`
- Hardcoded to `MIBERA_CONTRACT` only
- Hardcoded to `WBERA_CONTRACT` as payment token

Required changes:
- Support configurable collection → chain → payment token mappings
- Add Base (8453) with ETH/WETH as payment tokens
- Add Purupuru collection addresses
- Use `context.chain.id` (V3) or `event.chainId` for chain detection
- Create MintActivity with correct `chainId`

#### Config Addition
```yaml
# Under Base chain
- name: Seaport
  address:
    - "0x0000000000000068F116a894984e2DB1123eB395" # Seaport v1.6
  start_block: 20521993 # puru_boarding_passes deployment (earliest tracked collection)
```

## 5. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| V3 alpha instability | Broken indexer | Test thoroughly with block ranges before full deploy |
| getWhere syntax migration | Missed conversions | grep all `.getWhere.` patterns, convert systematically |
| Address type change | Type errors | Run `pnpm tsc --noEmit` after each change |
| Base Seaport volume | Performance regression | Use start_block at collection deployment, not Seaport deployment |
| ESM migration breaks | Import failures | Test with `pnpm dev` after package.json change |

## 6. Dependencies

- HyperSync API token (free, from envio.dev/app/api-tokens)
- Node.js 22+ installed
- Envio V3 alpha package published to npm
- Seaport v1.6 deployed on Base (confirmed: `0x0000000000000068F116a894984e2DB1123eB395`)
