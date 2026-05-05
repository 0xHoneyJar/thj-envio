# Indexer Deployment Guide

> Last updated: 2026-05-04
> Companion docs: [SCALE.md](./SCALE.md), [FAST_TESTING_GUIDE.md](./FAST_TESTING_GUIDE.md)

---

## Active Deployments

The indexer runs as a managed Envio HyperIndex deployment at `hyperindex.xyz`.
There are currently **two parallel mirror deployments** with effectively identical sync state:

| Deployment ID | Endpoint | Notes |
|---|---|---|
| `b5da47c` | `https://indexer.hyperindex.xyz/b5da47c/v1/graphql` | Active. Most consumers point here. |
| `914708e` | `https://indexer.hyperindex.xyz/914708e/v1/graphql` | Active mirror. Older doc references. |

Both are HyperSync-backed across all 6 chains and use HyperIndex V3 (`envio: 3.0.0-alpha.14`).

**Open operator decision (`SCALE.md` D1)**: Should one be deprecated, or kept as a blue-green pair?

### Probe Active Deployment Sync State

```bash
DEPLOYMENT_ID=b5da47c
curl -s -X POST "https://indexer.hyperindex.xyz/$DEPLOYMENT_ID/v1/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ chain_metadata(order_by: {chain_id: asc}) { chain_id is_hyper_sync start_block latest_processed_block block_height num_events_processed timestamp_caught_up_to_head_or_endblock } }"}' \
  | jq
```

(Schema field is `is_hyper_sync` in V3 — older probe scripts may use the V2 name `is_hyper_sync_indexer` and return null.)

---

## Indexed Chains

| Chain | ID | start_block | Notes |
|---|---|---|---|
| Ethereum Mainnet | 1 | 13,090,020 | Milady deployment era |
| Optimism | 10 | 107,558,369 | Mirror Observability deployment |
| Arbitrum | 42161 | 102,894,033 | HoneyJar2 deployment |
| Base | 8453 | 2,430,439 | friend.tech deployment |
| **Berachain Mainnet** | 80094 | 8,221 | BgtToken deployment (earliest contract on chain) |
| Zora | 7777777 | 18,071,873 | HoneyJar3 deployment |

Berachain is the primary chain (most contracts, most consumers).

---

## Adding a New Contract Source

**ALWAYS read [SCALE.md](./SCALE.md) first.** The Source-Addition Checklist (Guardrail 3) is mandatory.

### TL;DR

1. Look up the contract creation block via the chain's explorer.
2. Add to `config.yaml` with `start_block:` set to the creation block (NOT the chain default — see [SCALE.md Guardrail 3](./SCALE.md)).
3. Update handler constants (e.g., `src/handlers/tracked-erc721/constants.ts`).
4. `pnpm codegen`.
5. Local 5-minute smoke test via [FAST_TESTING_GUIDE.md](./FAST_TESTING_GUIDE.md).
6. Compute backfill estimate. If >30 min, plan blue-green rollout ([SCALE.md Guardrail 1](./SCALE.md)).
7. Open PR with the SCALE.md checklist filled in.

### Resetting the Indexer

When a new contract is added (or `schema.graphql` changes), the deployment must be reset to reprocess from `start_block`. **Adding a contract does not retroactively backfill historical events without a reset.**

#### Steps

1. Sign in to `https://hosted.envio.dev` (operator: zerker).
2. Locate the deployment ID (`b5da47c` or `914708e`).
3. **Preferred path (blue-green)**: Click "Deploy from branch" — produces a NEW deployment ID. See [SCALE.md Guardrail 1](./SCALE.md).
4. **In-place path** (only if backfill estimate <30 min): Click "Reset" or "Redeploy from Start Block."
5. Wait for catch-up. Probe `chain_metadata.timestamp_caught_up_to_head_or_endblock`.

#### Catch-up timing (V3 chunking, 25k events/s typical)

| Chain | Events processed (current) | Cold-start backfill estimate |
|---|---|---|
| Ethereum | ~351k | ~14 sec |
| Optimism | ~197k | ~8 sec |
| Arbitrum | ~29k | ~1 sec |
| Base | ~8.4M | ~6 min |
| **Berachain** | ~5M | ~3-4 min |
| Zora | ~24k | ~1 sec |

Cold-start total: roughly 10-15 min event processing under V3 chunking. Real-world reindex time observed at 30 min - 2 hours due to deployment provisioning, RPC fallback latency, and any handler-side RPC calls (see `perf/sync-optimization` branch for sf-vaults RPC reduction).

---

## Verifying a New Contract Indexed Successfully

Use the per-source health probe from [SCALE.md Guardrail 4](./SCALE.md):

```bash
SOURCE_KEY="apdao_seat"  # replace with new collection key
DEPLOYMENT_ID=b5da47c

curl -s -X POST "https://indexer.hyperindex.xyz/$DEPLOYMENT_ID/v1/graphql" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ TrackedHolder(where: {collectionKey: {_eq: \\\"$SOURCE_KEY\\\"}}, limit: 3) { address tokenCount } }\"}" \
  | jq
```

Empty `[]` after catch-up means the handler isn't firing — see SCALE.md Guardrail 4 diagnostic steps.

---

## Local Testing Before Production Reset

### 1. Start Local Indexer

```bash
TUI_OFF=true pnpm dev
```

This starts the local indexer at `http://localhost:8080/v1/graphql`.

### 2. Quick Validation

```bash
curl -X POST 'http://localhost:8080/v1/graphql' \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ Action(order_by: {timestamp: desc}, limit: 1) { timestamp } }"}' | jq
```

### 3. Targeted Block Range

For fast iteration on a new handler, use a 10-block range. See [FAST_TESTING_GUIDE.md](./FAST_TESTING_GUIDE.md) for the full pattern.

---

## Historical Incidents

### Tarot Mints (RESOLVED)

The tarot contract (`0x4B08a069381EfbB9f08C73D6B2e975C9BE3c4684`) was added to handler logic AFTER users had already minted. Historical mints required an indexer reset. Resolved via reset from `start_block: 866,405` (Berachain era).

**Lesson**: any contract added after initial deployment requires a full reset. This is what [SCALE.md](./SCALE.md) is designed to prevent the next time.

### apdao_seat Backfill (2026-05-04)

PR #5 added `apdao_seat` (`0xFc2D7eBFEB2714fCE13CaF234A95dB129ecC43Da`) to TrackedErc721. Merged 2026-05-05T02:24:21Z. Backfill blocked apdao governance restoration for ~2 hours pending operator-triggered redeploy. **Triggered the SCALE.md playbook authoring**.

---

## Required Environment

- Node.js >= 22 (V3 requirement)
- ESM-only (`"type": "module"` in package.json) — V3 requirement
- `ENVIO_API_TOKEN` — required by V3 HyperSync API

For development:
```bash
pnpm install
pnpm codegen
TUI_OFF=true pnpm dev
```

---

## Reference Queries

```bash
# Top 10 most active contracts (by events processed) — diagnostic for noise sources
curl -s -X POST 'https://indexer.hyperindex.xyz/b5da47c/v1/graphql' \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ chain_metadata(order_by: {num_events_processed: desc}) { chain_id num_events_processed num_batches_fetched } }"}' | jq

# Holder count for a specific tracked collection
curl -X POST 'https://indexer.hyperindex.xyz/b5da47c/v1/graphql' \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ TrackedHolder_aggregate(where: {collectionKey: {_eq: \"mibera_tarot\"}}) { aggregate { count } } }"}' | jq
```

---

## See Also

- **[SCALE.md](./SCALE.md)** — operator playbook (5 guardrails)
- **[FAST_TESTING_GUIDE.md](./FAST_TESTING_GUIDE.md)** — local-dev block-range patterns
- **[grimoires/loa/freeside-sonar-perf-cycle.md](./grimoires/loa/freeside-sonar-perf-cycle.md)** — design memo for the SCALE.md cycle
- **Envio V3 migration**: https://docs.envio.dev/docs/HyperIndex/migrate-to-v3
