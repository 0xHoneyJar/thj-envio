# SCALE.md — Indexer Operator Playbook

> Operational guardrails for managing `0xHoneyJar/thj-envio` (alias: freeside-sonar) so contract additions don't take prod offline for hours.

**Audience**: zerker (primary maintainer), and anyone proposing config changes.
**Last updated**: 2026-05-04
**Companion docs**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md), [FAST_TESTING_GUIDE.md](./FAST_TESTING_GUIDE.md)

---

## Why This Doc Exists

When a new contract source is added to `config.yaml`, **the entire indexer must be reset and reindex from each chain's `start_block`**. With 6 chains and ~5M events on Berachain alone, this can take 30 minutes to several hours. During the reindex, consumers (`apdao-auction-house`, `score-mibera`, `mibera-codex`, `dimensions`) see stale or missing data.

This playbook captures the 5 guardrails that prevent the most common failure modes.

---

## Current Sync Posture (probe yourself before each cycle)

```bash
for did in b5da47c 914708e; do
  echo "=== deployment $did ==="
  curl -s -X POST "https://indexer.hyperindex.xyz/$did/v1/graphql" \
    -H "Content-Type: application/json" \
    -d '{"query":"{ chain_metadata(order_by: {chain_id: asc}) { chain_id is_hyper_sync start_block latest_processed_block block_height num_events_processed timestamp_caught_up_to_head_or_endblock } }"}' \
    | jq -c '.data.chain_metadata[] | {chain_id, is_hyper_sync, start: .start_block, processed: .latest_processed_block, head: .block_height, events: .num_events_processed, caught_up: .timestamp_caught_up_to_head_or_endblock}'
done
```

**Note (schema drift)**: HyperIndex v3 renamed `is_hyper_sync_indexer` → `is_hyper_sync`. Older docs/probes may use the old name and return null. Use the schema introspection above if a field returns null.

---

## Guardrail 1 — Blue-Green Schema Rollout

**Rule**: When adding a new contract source, deploy to a fresh deployment ID first. Watch backfill complete. **Then** swap consumer endpoints. Do NOT redeploy in place if backfill estimate exceeds 30 minutes.

### When to use blue-green

- Adding any new `contracts:` block to `config.yaml`
- Adding any new address to an existing `contracts:` block whose `start_block` predates the new address (= would re-scan history)
- Schema (`schema.graphql`) changes that affect indexed entities
- Handler logic changes that produce different aggregates from the same events

### When in-place is acceptable

- Adding a new address whose deployment block is *after* the deployment's `latest_processed_block` (i.e., zero historical scan needed)
- Bug fixes in handler logic that don't change aggregate shape (read-side patches)
- Doc-only changes

### Blue-green steps

1. Open PR with config change.
2. Run estimate (Guardrail 3 step 4) — confirm backfill >30 min.
3. Operator (zerker) at `hosted.envio.dev`:
   - Click "Deploy from branch" — produces a NEW deployment ID (e.g., `abc1234`).
   - DO NOT swap the existing prod deployment.
4. Wait for `chain_metadata.timestamp_caught_up_to_head_or_endblock` on the new deployment to populate for all 6 chains.
5. Smoke-test new deployment with consumer queries:
   ```bash
   curl -s -X POST "https://indexer.hyperindex.xyz/abc1234/v1/graphql" \
     -H "Content-Type: application/json" \
     -d '{"query":"{ TrackedHolder(where: {collectionKey: {_eq: \"NEW_KEY\"}}, limit: 3) { address tokenCount }}"}'
   ```
6. Update consumer env vars (`NEXT_PUBLIC_ENVIO_ENDPOINT` or equivalent) to point at new deployment.
7. Verify consumer apps render correctly.
8. Mark old deployment as deprecated in operator dashboard (don't delete — it's the rollback path for ~7 days).
9. After 7 days of stable operation, operator may delete old deployment.

### Why not auto-swap

Envio managed deployments don't have built-in alias swap. Until a stable consumer alias is wired up (Guardrail 5), env-var swap is the operator-controlled cutover.

---

## Guardrail 2 — Sync-Lag SLO

**Rule**: Per-chain block-lag must stay below the SLO threshold. Operator alert fires when threshold exceeded.

### SLO Targets (proposed — adjust to traffic patterns)

| Chain | Block time | Lag SLO | Reasoning |
|---|---|---|---|
| ETH (1) | ~12s | < 50 blocks (~10 min) | Settled chain, low velocity |
| Optimism (10) | ~2s | < 600 blocks (~20 min) | OP rollup, moderate event rate |
| Arbitrum (42161) | ~0.25s | < 2,400 blocks (~10 min) | High block rate, low event count for THJ |
| Base (8453) | ~2s | < 600 blocks (~20 min) | OP rollup |
| **Berachain (80094)** | ~2s | < 300 blocks (~10 min) | Primary chain — strictest SLO |
| Zora (7777777) | ~2s | < 1,800 blocks (~60 min) | Low velocity, less critical |

### Lag check command

```bash
DEPLOYMENT_ID=b5da47c  # or current prod alias
curl -s -X POST "https://indexer.hyperindex.xyz/$DEPLOYMENT_ID/v1/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ chain_metadata(order_by: {chain_id: asc}) { chain_id latest_processed_block block_height } }"}' \
  | jq '.data.chain_metadata | map({chain_id, lag: (.block_height - .latest_processed_block)})'
```

### Alert wiring (TODO — operator to choose channel)

Recommend: Discord webhook or PagerDuty. Cron once per 5 min, fires when any chain's lag exceeds its SLO threshold for two consecutive checks.

Sample crontab entry:
```cron
*/5 * * * * /Users/zerker/scripts/check-envio-lag.sh
```

---

## Guardrail 3 — Source-Addition Checklist

**Rule**: Before opening a PR that adds or modifies `config.yaml` contract sources, the author must complete this checklist in the PR description.

### Checklist

```markdown
- [ ] **Contract creation block looked up** via the chain's official explorer
      Source: <explorer URL>
      Creation block: <number>
      Creation tx: <hash>
- [ ] **`start_block:` ≥ creation block** (verify in diff)
- [ ] **Local 5-min smoke test** ran via FAST_TESTING_GUIDE pattern; handler fires on at least one event
- [ ] **Backfill estimate computed**:
      Blocks since deployment: <number>
      Estimated reindex time: <minutes>
      Method: blue-green (Guardrail 1) OR in-place (only if estimate <30 min)
- [ ] **CollectionStat row produced** within 100 blocks (or N events) of new source going live (Guardrail 4)
- [ ] **Downstream consumers identified**: <list of repos>
- [ ] **Consumer migration plan**: env-var swap timeline OR no consumer change needed
```

### Block-lookup commands

For Berachain (chain_id 80094):
```bash
ADDRESS=0xFc2D7eBFEB2714fCE13CaF234A95dB129ecC43Da
curl "https://api.routescan.io/v2/network/mainnet/evm/80094/etherscan/api?module=contract&action=getcontractcreation&contractaddresses=$ADDRESS" | jq '.result[0]'
```

For ETH/Optimism/Base/Arbitrum: use the corresponding chain's Etherscan-family API. The `getcontractcreation` action is consistent across them.

### Why this exists

PR #5 (apdao_seat, merged 2026-05-05) blocked governance restoration in `apdao-auction-house` for ~2 hours because the reindex hadn't been planned. The checklist forces the time estimate up-front so operators can choose blue-green vs in-place with eyes open.

---

## Guardrail 4 — Per-Source Health Probe

**Rule**: Every newly added contract source must produce a `CollectionStat` (or equivalent aggregate) row within N blocks of its first event. Probe must be runnable locally.

### Probe template

```bash
# Replace SOURCE_KEY with the new collection key (e.g., "apdao_seat")
SOURCE_KEY="apdao_seat"
DEPLOYMENT_ID=b5da47c

curl -s -X POST "https://indexer.hyperindex.xyz/$DEPLOYMENT_ID/v1/graphql" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ TrackedHolder(where: {collectionKey: {_eq: \\\"$SOURCE_KEY\\\"}}, limit: 1) { address tokenCount } CollectionStat(where: {collectionKey: {_eq: \\\"$SOURCE_KEY\\\"}}, limit: 1) { holderCount totalSupply } }\"}" \
  | jq
```

### Pass criteria

- `TrackedHolder` returns at least one row OR
- `CollectionStat` returns one row with `holderCount > 0` and `totalSupply > 0`

If both are empty after the deployment has caught up to head, the handler is not firing for this source. Diagnose:

1. Verify address is lowercase in `tracked-erc721/constants.ts` collection-key map (handler matches lowercase).
2. Verify event signature matches the contract's actual ABI.
3. Verify deployment caught up past the contract's creation block.
4. Run local FAST_TESTING_GUIDE pattern with a known event to isolate.

---

## Guardrail 5 — Stable Consumer Alias

**Rule**: Consumers should never hardcode `https://indexer.hyperindex.xyz/<DID>/...`. Use a stable alias the operator controls.

### Current state (2026-05-04)

Consumers hardcode `b5da47c` or `914708e`:
- `apdao-auction-house` — `b5da47c` (verified — Slice A retro)
- `score-mibera` — `b5da47c` (likely; verify in their repo)
- `mibera-codex` — `b5da47c` (likely)
- `dimensions` — `b5da47c` (likely)

When operator wants to swap to a new deployment ID, every consumer must be redeployed with new env vars in lockstep. **This is the root cause of "blue-green is hard."**

### Proposed fix

Operator-controlled DNS alias:
- `indexer.honeyjar.xyz` → CNAME → `indexer.hyperindex.xyz/<active-DID>` (path rewrite via Cloudflare Worker)
- Or: subdomain per environment: `indexer-prod.honeyjar.xyz`, `indexer-staging.honeyjar.xyz`

When operator swaps the active deployment, only the DNS/Worker config changes — consumers don't redeploy.

### Alternative (lower-effort)

Consumers read the active deployment ID from a small JSON file the operator publishes:
```bash
# At https://indexer.honeyjar.xyz/active.json
{ "deployment_id": "b5da47c", "endpoint": "https://indexer.hyperindex.xyz/b5da47c/v1/graphql", "as_of": "2026-05-04T..." }
```
Each consumer fetches this on boot (or every N minutes) and uses the resulting endpoint. Operator updates `active.json` to flip.

**This is deferred to a separate cycle** — operator owns the DNS provider + decides on Worker vs JSON approach.

---

## Decision Log (operator pair-points)

These need explicit operator answers before they're closed:

- [ ] **D1**: Should `914708e` be formally deprecated, kept as blue-green pair, or unified with `b5da47c`?
- [ ] **D2**: Choose Guardrail 5 implementation: DNS+CNAME, Cloudflare Worker, or `active.json` file pattern?
- [ ] **D3**: Wire alert channel for Guardrail 2 SLO breaches — Discord webhook? PagerDuty?
- [ ] **D4**: Decide on per-chain deployment split (architectural — separate cycle). Tradeoff: operational complexity (6 deployments instead of 1) vs blast-radius reduction (Berachain contract addition only triggers Berachain reindex).
- [ ] **D5**: Should `CODEOWNERS` enforce zerker review on `config.yaml`?

---

## Related Cycles

- **`grimoires/loa/freeside-sonar-perf-cycle.md`** — design memo for this playbook + the per-source `start_block` tightening that ships in the same PR.
- **`perf/sync-optimization` branch** — sf-vaults RPC removal + parallel await (3 commits, separate PR candidate).
- **Future kickoff: per-chain deployment split** — Guardrail 5's architectural sibling.
