# Sprint Plan: V3 Migration & Base Secondary Sales

> PRD: `grimoires/loa/prd.md`
> Branch: `perf/v3-migration-and-optimizations`
> Created: 2026-03-18

## Sprint Overview

**Duration:** Single sprint (estimated 4-6 hours agent work)
**Goal:** Migrate to HyperIndex V3 for 3x faster backfills + add Base secondary sales tracking
**Pre-commit already done:** Per-contract start_block optimization (commit `33a8ddf`)

---

## Task 1: V3 Package & Config Migration

**Priority:** P0 (foundation — all other tasks depend on this)
**Files:** `package.json`, `tsconfig.json`, `config.yaml`, `.env`

### 1.1 Update package.json
- Add `"type": "module"`
- Update `envio` from `2.32.2` to `3.0.0-alpha.14`
- Update `typescript` from `5.2.2` to `^5.7.3`
- Add `"engines": { "node": ">=22.0.0" }`
- Remove mocha/chai devDeps: `@types/chai`, `@types/mocha`, `chai`, `mocha`, `ts-mocha`
- Add `vitest` as devDep (optional, can defer test migration)

### 1.2 Update tsconfig.json
- Change `module` from `CommonJS` to `ESNext`
- Change `target` from `es2020` to `es2022`
- Add `moduleResolution: "bundler"`
- Add `verbatimModuleSyntax: true`
- Add `moduleDetection: "force"`
- Add `isolatedModules: true`
- Update `lib` to `["es2022"]`

### 1.3 Update config.yaml
- Rename `networks:` → `chains:`
- Remove `unordered_multichain_mode: true`
- Remove `preload_handlers: true`
- Keep all contract definitions, start_blocks, and event configs unchanged

### 1.4 Set up HyperSync API token
- Add `ENVIO_API_TOKEN` to `.env` (obtain from envio.dev/app/api-tokens)
- Add `ENVIO_API_TOKEN` to `.env.example`

### Acceptance Criteria
- [ ] `pnpm install` succeeds with new deps
- [ ] `pnpm codegen` completes without errors
- [ ] Config parses correctly (no YAML errors)

---

## Task 2: Handler API Migration (V2 → V3)

**Priority:** P0 (required for V3 compatibility)
**Files:** `src/handlers/sf-vaults.ts`, `src/handlers/fatbera.ts`
**Depends on:** Task 1

### 2.1 Migrate experimental_createEffect → createEffect
File: `src/handlers/sf-vaults.ts`
- Line 21: Change import from `experimental_createEffect` to `createEffect`
- Line 127: `getMultiRewardsAddress = experimental_createEffect(` → `createEffect(`
- Line 193: `getVaultAddressFromMultiRewards = experimental_createEffect(` → `createEffect(`
- Remove comment about experimental context types (line 139-141) if no longer needed

### 2.2 Migrate getWhere syntax (7 calls total)

**sf-vaults.ts (4 calls):**
```
Line 158: .getWhere.strategy.eq(strategyLower)
  → .getWhere({ strategy: { _eq: strategyLower } })

Line 232: .getWhere.multiRewards.eq(multiRewardsAddress)
  → .getWhere({ multiRewards: { _eq: multiRewardsAddress } })

Line 278: .getWhere.strategy.eq(strategyAddress)
  → .getWhere({ strategy: { _eq: strategyAddress } })

Line 351: .getWhere.vault.eq(vaultAddress)
  → .getWhere({ vault: { _eq: vaultAddress } })
```

**fatbera.ts (3 calls):**
```
Line 48: .getWhere.pubkey.eq(pubkey)
  → .getWhere({ pubkey: { _eq: pubkey } })

Line 61: .getWhere.pubkey.eq(pubkey)
  → .getWhere({ pubkey: { _eq: pubkey } })

Line 74: .getWhere.batch_id.eq(batchId)
  → .getWhere({ batch_id: { _eq: batchId } })
```

### 2.3 Address type compatibility
- Check if V3 changes address types from `string` to `0x${string}`
- If so, update `.toLowerCase()` calls that may need type assertions
- Run `pnpm tsc --noEmit` to find any type mismatches

### Acceptance Criteria
- [ ] Zero `experimental_createEffect` references remain
- [ ] Zero `.getWhere.field.eq()` patterns remain
- [ ] `pnpm tsc --noEmit` passes with zero errors
- [ ] `pnpm codegen` succeeds

---

## Task 3: Seaport Handler Multi-Chain Refactor

**Priority:** P1 (feature addition)
**Files:** `src/handlers/seaport.ts`, `config.yaml`
**Depends on:** Task 1 (for V3 chain detection API)

### 3.1 Refactor seaport.ts for multi-chain support
Current hardcoded constants to replace:
```typescript
const BERACHAIN_ID = 80094;
const MIBERA_CONTRACT = "0x6666397dfe9a8c469bf65dc744cb1c733416c420";
const WBERA_CONTRACT = "0x6969696969696969696969696969696969696969";
```

Replace with configurable mapping:
```typescript
interface TrackedCollection {
  address: string;
  chainId: number;
  paymentTokens: string[]; // WBERA, WETH, ETH (native = itemType 0)
}

const TRACKED_COLLECTIONS: Record<string, TrackedCollection> = {
  // Berachain - Mibera
  "0x6666397dfe9a8c469bf65dc744cb1c733416c420": {
    address: "0x6666397dfe9a8c469bf65dc744cb1c733416c420",
    chainId: 80094,
    paymentTokens: ["0x6969696969696969696969696969696969696969"], // WBERA
  },
  // Base - Purupuru collections
  "0xcd3ab1b6e95cdb40a19286d863690eb407335b21": {
    address: "0xcd3ab1b6e95cdb40a19286d863690eb407335b21",
    chainId: 8453,
    paymentTokens: [], // native ETH (itemType 0)
  },
  "0x154a563ab6c037bd0f041ac91600ffa9fe2f5fa0": { ... },
  "0x85a72eee14dcaa1ccc5616df39acde212280dccb": { ... },
};
```

### 3.2 Update handler logic
- Detect chain via `context.chain.id` (V3) instead of hardcoded constant
- Check both offer AND consideration arrays for ANY tracked collection address
- Support native ETH payments (itemType 0) in addition to WETH/WBERA (itemType 1)
- Set correct `chainId` on MintActivity based on actual chain, not hardcoded

### 3.3 Add Base Seaport to config.yaml
```yaml
# Under Base chain (id: 8453), add:
- name: Seaport
  address:
    - "0x0000000000000068F116a894984e2DB1123eB395"
  start_block: 20521993 # puru_boarding_passes deployment (earliest tracked collection)
```

### Acceptance Criteria
- [ ] Seaport handler processes events from both Berachain and Base
- [ ] MintActivity records created with correct chainId per chain
- [ ] Mibera trades on Berachain still tracked (no regression)
- [ ] Purupuru trades on Base create SALE/PURCHASE MintActivity records
- [ ] Non-tracked collections are still filtered out (no noise)
- [ ] `pnpm tsc --noEmit` passes

---

## Task 4: Verification & Deploy

**Priority:** P0 (gate)
**Depends on:** Tasks 1-3

### 4.1 Local validation with test config
- Create `config.test-v3.yaml` with narrow block ranges for each feature:
  - Berachain Seaport: pick a block range with known Mibera trades
  - Base Seaport: pick a block range with known Purupuru trades
- Run `TUI_OFF=true pnpm dev --config config.test-v3.yaml`
- Verify MintActivity records created correctly for both chains

### 4.2 Full codegen + type check
- `pnpm codegen` — must complete cleanly
- `pnpm tsc --noEmit` — must pass with zero errors

### 4.3 Push and create PR
- Push branch `perf/v3-migration-and-optimizations`
- Create PR with summary of all changes (start_block optimization + V3 + Base sales)

### Acceptance Criteria
- [ ] Test config runs in <60 seconds
- [ ] Both Berachain and Base Seaport events produce correct MintActivity
- [ ] No TypeScript errors
- [ ] PR created and ready for review

---

## Execution Order

```
Task 1 (config/package) → Task 2 (handler API) → Task 3 (Seaport refactor) → Task 4 (verify)
```

Tasks 1 and 2 are sequential (2 depends on 1). Task 3 depends on Task 1 but can be developed in parallel with Task 2 if using separate agents. Task 4 is the final gate.

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| V3 alpha breaks codegen | Pin to exact version `3.0.0-alpha.14`, test codegen first |
| getWhere syntax missed | `grep -r "getWhere\." src/` after migration to verify zero remaining |
| Base Seaport volume too high | start_block at collection deployment (20521993), not Seaport deployment |
| ESM import breaks | Run `pnpm dev` immediately after package.json change to catch early |
