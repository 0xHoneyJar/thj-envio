# V3 Deployment Testing Plan

> After merging `perf/v3-migration-and-optimizations` to main

## What Changed

- **Envio 2.32.2 → 3.0.0-alpha.14** (3x faster historical backfills)
- **22 Berachain contracts** now have per-contract start_blocks (~300M+ block scans eliminated)
- **Schema indexes** on SFVaultStrategy (vault, strategy, multiRewards)
- **Config migrated** to V3 format (chains, removed deprecated flags)
- **Seaport handler** refactored for multi-chain (but Base Seaport deferred — see NOTES.md)

## Step 1: Deploy

```bash
# Ensure ENVIO_API_TOKEN is set
echo $ENVIO_API_TOKEN

# Deploy to HyperIndex (creates new endpoint, old stays live)
pnpm deploy
```

Save the **new endpoint URL** — it will have a different hash than `914708e`.

## Step 2: Monitor Sync Progress

The new deployment should sync significantly faster than the old one. Track progress:

```bash
# Check sync status (replace NEW_HASH with your new deployment hash)
curl -s https://indexer.hyperindex.xyz/NEW_HASH/v1/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ _metadata { lastProcessedBlock } }"}' | jq
```

**Expected:** Full sync in <8 hours (down from 1-2 days).

## Step 3: Compare Entity Counts

Once the new deployment is fully synced, compare against the old prod endpoint.

**Old prod:** `https://indexer.hyperindex.xyz/914708e/v1/graphql`
**New:** `https://indexer.hyperindex.xyz/NEW_HASH/v1/graphql`

### Core Entity Counts (new should be >= old)

```graphql
{ MintActivity_aggregate { aggregate { count } } }
{ Transfer_aggregate { aggregate { count } } }
{ SFPosition_aggregate { aggregate { count } } }
{ SFVaultStats_aggregate { aggregate { count } } }
{ Action_aggregate { aggregate { count } } }
{ TrackedHolder_aggregate { aggregate { count } } }
{ Holder_aggregate { aggregate { count } } }
{ Token_aggregate { aggregate { count } } }
{ CollectionStat_aggregate { aggregate { count } } }
{ UserBalance_aggregate { aggregate { count } } }
```

### Mibera-Specific (must match exactly)

```graphql
# Mibera MintActivity by type
{ MintActivity_aggregate(where: { contract: { _eq: "0x6666397dfe9a8c469bf65dc744cb1c733416c420" } }) { aggregate { count } } }
{ MintActivity_aggregate(where: { contract: { _eq: "0x6666397dfe9a8c469bf65dc744cb1c733416c420" }, activityType: { _eq: "SALE" } }) { aggregate { count } } }
{ MintActivity_aggregate(where: { contract: { _eq: "0x6666397dfe9a8c469bf65dc744cb1c733416c420" }, activityType: { _eq: "MINT" } }) { aggregate { count } } }
```

### SF Vault Data (must match)

```graphql
{ SFPosition_aggregate { aggregate { count } } }
{ SFVaultStrategy_aggregate { aggregate { count } } }
{ SFMultiRewardsPosition_aggregate { aggregate { count } } }
```

### FatBera Data (must match)

```graphql
{ ValidatorDeposits_aggregate { aggregate { count } } }
{ ValidatorBlockRewards_aggregate { aggregate { count } } }
{ WithdrawalBatch_aggregate { aggregate { count } } }
```

## Step 4: Validate Results

| Check | Expected | Action if Failed |
|-------|----------|------------------|
| All counts match or new > old | Exact match or slightly more (bug fix in Seaport consideration scanning) | Investigate which entities differ |
| New deployment synced faster | <8 hours | Check HyperSync logs for fallback to RPC |
| No new chainId=8453 MintActivity | Zero Base records | Base Seaport is commented out, should be impossible |
| SF positions correct | Same count | Verify start_block didn't skip any events |

## Step 5: Swap Endpoints

Once validated, update downstream repos to use the new endpoint:

### Score API
**File:** `score-api/.env`
```
ENVIO_GRAPHQL_URL=https://indexer.hyperindex.xyz/NEW_HASH/v1/graphql
```

### Mibera Interface
**File:** `mibera-interface/.env` (or `constants/api.ts`)
```
NEXT_PUBLIC_ENVIO_URL=https://indexer.hyperindex.xyz/NEW_HASH/v1/graphql
```

## Rollback

If anything is wrong, switch back to the old endpoint (`914708e`). No code changes needed — just revert the env var.

## Follow-Up Work (After Validation)

See `grimoires/loa/NOTES.md` for deferred items:
1. Add `chainId` filters to Score API and Mibera interface queries
2. Re-enable Base Seaport in config.yaml
3. Verify Purupuru secondary sales tracking works end-to-end
