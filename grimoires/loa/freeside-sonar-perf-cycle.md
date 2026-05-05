# Freeside-Sonar Performance Cycle — Design Memo

**Date**: 2026-05-04
**Author**: agent (parallel-cycle, Bonfire-side)
**Status**: draft
**Repo**: 0xHoneyJar/thj-envio (alias: freeside-sonar)
**Trigger**: apdao-auction-house migration unblock — PR #5 (apdao_seat) backfill ran 2+ hours, blocked governance restoration

---

## TL;DR — The Reframe

The original handoff hypothesized:
1. Berachain HyperSync was missing → biggest win
2. V3 migration was the lever → 3× speedup
3. Network-level start_blocks were loose → second-biggest win
4. Per-source start_block drift was rampant
5. `914708e` was a stale duplicate deployment

**Empirical probes refuted four of five:**

| Hypothesis | Reality |
|---|---|
| Berachain HyperSync missing | All 6 chains have HyperSync ✅ |
| V3 migration lever | V3 done (`envio: 3.0.0-alpha.14`, ESM, Node 22+) ✅ |
| Network-level start_blocks loose | Berachain network drift = **6 blocks** (essentially perfect) |
| Per-source drift rampant | ~5 sources with material drift, mostly on minor chains |
| `914708e` is stale | Both deployments have *identical* sync state — they're parallel mirrors |

**The actual remaining levers are operational, not config-tightening:**

1. Adding a contract source still requires full reindex of all 6 chains (~10–60 min each).
2. There's no blue-green rollout — operators redeploy in-place, taking prod offline during reset.
3. Consumers (apdao, score-mibera, mibera-codex, dimensions) hardcode deployment IDs.
4. Doc surfaces (DEPLOYMENT_GUIDE, FAST_TESTING_GUIDE) reference V2 patterns + a single "prod" deployment ID.
5. ~5 per-source `start_block` overrides missing on Optimism + Base + ETH.

---

## Goals

- **G1**: Document what's actually true about the indexer's current sync posture so future contract-add cycles don't repeat the same hypothesis-refutation cycle.
- **G2**: Ship a `SCALE.md` operator playbook covering the 5 guardrails the handoff specified (blue-green, sync-lag SLO, source-add checklist, per-source health probe, stable consumer alias).
- **G3**: Refresh `DEPLOYMENT_GUIDE.md` so it matches reality (parallel deployments, V3 chunking, manual reset still required for new contract sources).
- **G4**: Tighten the ~5 per-source `start_block` overrides where chain-default inheritance produces real drift.
- **G5**: Architectural recommendation (deferred, separate cycle): per-chain deployment split so adding a Berachain contract doesn't trigger ETH/Optimism/Base/Arbitrum/Zora reindex.

## Non-Goals

- **N1**: Not migrating to V3 (already done).
- **N2**: Not enabling HyperSync (already on for all chains).
- **N3**: Not adding new contract sources beyond what already exists.
- **N4**: Not touching `apdao-auction-house`, `score-mibera`, `mibera-codex`, `dimensions` (consumers).
- **N5**: Not implementing per-chain deployment split this cycle (separate kickoff).
- **N6**: Not deprecating `914708e` formally — operator decision, separate cycle.

---

## Empirical State (probed 2026-05-04)

### Per-Chain Sync State

| Chain | ID | start_block | first_event | latest_processed | hypersync | drift |
|---|---|---|---|---|---|---|
| ETH | 1 | 13,090,020 | 13,090,452 | 25,026,378 | ✅ | 432 |
| Optimism | 10 | 107,558,369 | 107,558,369 | 151,178,058 | ✅ | **0** |
| Base | 8453 | 2,430,439 | 2,431,200 | 45,582,773 | ✅ | 761 |
| Arbitrum | 42161 | 102,894,033 | 103,234,426 | 459,520,202 | ✅ | 340,393 |
| **Berachain** | 80094 | 866,405 | 866,411 | 20,470,088 | ✅ | **6** |
| Zora | 7777777 | 18,071,873 | 18,090,868 | 45,630,526 | ✅ | 18,995 |

All chains caught up to head as of 2026-02-16. Network-level start_blocks are tight; the worst (Arbitrum) is 340k blocks of pre-event scan, which under V3's 25k events/s is sub-minute.

### Deployment Topology

| ID | Endpoint | State | Notes |
|---|---|---|---|
| `b5da47c` | `https://indexer.hyperindex.xyz/b5da47c/v1/graphql` | Active, current | apdao-auction-house, score-mibera, dimensions consume this |
| `914708e` | `https://indexer.hyperindex.xyz/914708e/v1/graphql` | Active, mirror | DEPLOYMENT_GUIDE labels as prod; consumers may still target |

`num_events_processed` matches between both within 1 batch. They're parallel mirror deployments, not generational. Operator choice required: deprecate one or formalize blue-green pair.

### apdao_seat Verification

```graphql
{ TrackedHolder(where: {collectionKey: {_eq: "apdao_seat"}}, limit: 3) { address tokenCount } }
```

Both deployments return `[]`. PR #5 was merged 2026-05-05T02:24:21Z but the deployment redeploy hasn't completed (or hasn't been triggered). This is consistent with "any new contract source requires manual indexer reset" per existing DEPLOYMENT_GUIDE.

---

## Per-Source Start Block Drift Audit (verified)

Creation blocks looked up via Routescan / Base Blockscout / cloudflare-eth RPC:

| Chain | Source | Was (inherits) | Now (deployment) | Drift saved |
|---|---|---|---|---|
| ETH (1) | MiladyCollection | 13,090,020 | 13,090,020 | **0 — chain default already correct** |
| Arbitrum (42161) | HoneyJar2 | 102,894,033 | ~chain default | None — chain default ≈ deployment block |
| Zora (7777777) | HoneyJar3 | 18,071,873 | ~chain default | None — chain default ≈ deployment block |
| **Optimism (10)** | **HoneyJar4** | 107,558,369 | **125,752,663** | **18,194,294** |
| **Optimism (10)** | **MiberaSets** | 107,558,369 | **125,031,052** | **17,472,683** |
| **Optimism (10)** | **MiberaZora1155** | 107,558,369 | **112,614,910** | **5,056,541** |
| Optimism (10) | MirrorObservability | 107,558,369 | 107,558,369 | None — chain default = its deployment |
| Optimism (10) | TrackedErc721 (lore_*) | 107,558,369 | ≈chain default | Negligible — lore articles created via Mirror Obs |
| **Base (8453)** | **HoneyJar5** | 2,430,439 | **23,252,723** | **20,822,284** |
| Base (8453) | FriendtechShares | 2,430,439 | 2,430,439 | None — chain default = its deployment |

**Total tightening: ~61.5M blocks of pre-event scan eliminated** (4 sources, all on Optimism + Base).

Under V3 chunking at 25k events/s, the absolute time saved is small (a few seconds to ~minute per source on a cold backfill). The bigger value is **correctness** — `start_block` should match deployment block as a matter of indexer hygiene, so future audits don't have to rediscover this drift.

Source citations (creation tx hashes):
- HoneyJar4 OP: `0x5eb3189dde342e71a33549a2c1bf7918b021a0f0be4aa3dfd12fa91e852e851b`
- MiberaSets OP: `0xa85e00a64e68e3aaece1565f88728389ccceb3e914566c91be3468f820ea412b`
- MiberaZora1155 OP: `0xdb83bc94ee35fd79da4538507ae9ff1ba15dd1f85c0b61ee6e99b39ebc2a940f`
- HoneyJar5 Base: lookup via Base Blockscout → block `23,252,723`

---

## Scope (this cycle)

### In Scope

1. **`SCALE.md`** — operator playbook with the 5 guardrails.
2. **`DEPLOYMENT_GUIDE.md` refresh** — replace V2 references, document parallel deployments, document V3 reset behavior, link to SCALE.md for new-source cycles.
3. **Per-source `start_block` overrides** for the 5 drift candidates (after explorer lookups).
4. **`grimoires/loa/freeside-sonar-perf-cycle.md`** (this doc) — design memo capturing reframe.

### Deferred (Separate Cycle)

- **D1**: Per-chain deployment split — adding a Berachain contract → only Berachain redeploy. Requires architecture work (handler routing, multi-deployment manifest, downstream consumer migration to per-chain endpoints).
- **D2**: Stable consumer alias (DNS/CNAME or subdomain) — operator owns the registration; needs DNS provider work.
- **D3**: `914708e` deprecation decision — operator choice; if kept, blue-green protocol; if dropped, consumer migration first.
- **D4**: Cherry-pick `perf/sync-optimization` (sf-vaults parallel-await wins, 3 commits) — narrow scope, separate review.

### Out of Scope (Hard Cuts)

- V3 migration (done), HyperSync enablement (done), apdao-auction-house route migration, score-mibera integrations, new contract sources.

---

## Risks

- **R1 — Tightening start_blocks requires reindex**: Per-source `start_block` changes don't automatically take effect; deployment must be reset. So this PR's start_block tightening only benefits the *next* full reindex, not the current sync.
- **R2 — Block lookup accuracy**: Hand-look-ups via explorers are tedious and error-prone. Mitigation: use multiple sources (RPC + Etherscan-family + Routescan) and document deployment block in code comment so future audits can verify.
- **R3 — Doc drift**: SCALE.md becomes stale if operators don't follow it. Mitigation: link from CONTRIBUTING.md / CLAUDE.md, reference from PR template.
- **R4 — Operator may not be the only one merging**: Without a CODEOWNERS file enforcing zerker review on `config.yaml`, a future contributor might add a contract without consulting the playbook.

## Acceptance Criteria

- AC-1: `SCALE.md` exists at repo root with 5 guardrails enumerated, each with concrete command-level steps.
- AC-2: `DEPLOYMENT_GUIDE.md` no longer claims `914708e` is "the prod deployment" — describes the parallel mirror state honestly.
- AC-3: `config.yaml` has explicit `start_block:` for the 5 identified drift sources (or explicit comment justifying chain-default inheritance if lookup proves drift was negligible).
- AC-4: PR description includes:
  - Before/after per-chain backfill summary table
  - Per-source start_block tightening list with creation-block source citations
  - Decision status on blue-green / per-chain split (deferred with kickoff link)
  - Reference to this design memo
- AC-5: Zero changes to `src/` handlers (this is config + docs only, with one exception: if cherry-picking sync-optimization commits, that goes in a separate follow-up PR).
- AC-6: Zero changes to consuming repos (apdao, score-mibera, mibera-codex, dimensions).

## Verification

- V-1: `pnpm codegen` succeeds with the modified config.
- V-2: `pnpm dev` against a 100-block range from each tightened source's new start_block detects events (FAST_TESTING_GUIDE pattern).
- V-3: Manual review of SCALE.md by zerker; revisions before merge.

## Hand-Back Signal

Comment on the PR with the impact summary table. Operator merges + triggers redeploy via `hosted.envio.dev`.

**Operator-paced. Don't push to prod without explicit go.**

---

## References

- Handoff context (parallel-cycle agent): `~/bonfire/grimoires/freeside/cultivations/apdao-supabase-flip-2026-05-04.retro.md` (sibling cycle)
- DIG findings: `~/.claude/projects/-Users-zksoju-bonfire/memory/project_apdao_handoff_dig_2026_05_04.md`
- Envio V3 migration doc: `https://docs.envio.dev/docs/HyperIndex/migrate-to-v3`
- thj-envio PR #5 (apdao_seat, merged): `https://github.com/0xHoneyJar/thj-envio/pull/5`
- Existing optimization branches:
  - `perf/sync-optimization` — 3 commits, sf-vaults narrow scope, candidate for separate PR
  - `perf/v3-migration-and-optimizations` — already merged into main (285 commits absorbed)
  - `fix/ENG-4432-handler-optimizations` — 3 unique commits, scope unverified
