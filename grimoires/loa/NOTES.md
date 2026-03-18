# Agent Working Notes

## Downstream Changes Required Before Enabling Base Seaport

**Context:** Base Seaport tracking is ready in the indexer (handler supports multi-chain) but is commented out in config.yaml until these downstream repos are patched.

### 1. Score API (`score-api`)
**File:** `trigger/utils/envio-client.ts:197-211`
**Fix:** Add `chainId: { _eq: 80094 }` to the `MIBERA_SALES` GraphQL query WHERE clause:
```graphql
MintActivity(
  where: {
    contract: { _eq: $contract }
    activityType: { _eq: "SALE" }
    chainId: { _eq: 80094 }  # ADD THIS
  }
)
```
**Risk without fix:** LOW (contract filter already scopes to Mibera address), but fragile.

### 2. Mibera Interface (`mibera-interface`)
**File:** `app/api/activity/route.ts:27-49`
**Fix:** Add `chainId: { _eq: 80094 }` to the activity feed query:
```graphql
MintActivity(
  where: {
    activityType: { _neq: "SALE" }
    blockNumber: { _lt: $blockCutoff }
    chainId: { _eq: 80094 }  # ADD THIS
  }
)
```
**Risk without fix:** HIGH — Base PURCHASE records would appear in Mibera activity feed with broken MagicEden links (hardcoded to `berachain` at `components/activity/Activity.tsx:154`).

### 3. Re-enable Base Seaport
After both repos are patched, uncomment in `config.yaml` under Base chain (id: 8453):
```yaml
- name: Seaport
  address:
    - "0x0000000000000068F116a894984e2DB1123eB395"
  start_block: 20521993
```

## V3 Deployment Testing Strategy

**Old prod endpoint:** `https://indexer.hyperindex.xyz/914708e/v1/graphql`
**New endpoint:** Will be assigned after `pnpm deploy` on the V3 branch

### Comparison queries to run against both endpoints:
```graphql
# 1. Entity counts (should match or new > old)
{ MintActivity_aggregate { aggregate { count } } }
{ Transfer_aggregate { aggregate { count } } }
{ SFPosition_aggregate { aggregate { count } } }
{ Action_aggregate { aggregate { count } } }
{ TrackedHolder_aggregate { aggregate { count } } }

# 2. Mibera-specific (must match exactly)
{ MintActivity_aggregate(where: { chainId: { _eq: 80094 } }) { aggregate { count } } }

# 3. Latest block per chain (new should be >= old)
{ Transfer(limit: 1, order_by: { blockNumber: desc }, where: { chainId: { _eq: 80094 } }) { blockNumber } }
```
