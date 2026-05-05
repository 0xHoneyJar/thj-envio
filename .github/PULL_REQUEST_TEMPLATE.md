## Summary

Brief description of what this PR does.

## Related Issues

Closes #(issue number)

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] CI/Infrastructure change
- [ ] **Indexer change** — touches `config.yaml`, `schema.graphql`, or `src/handlers/` (complete the section below)

---

## Indexer Change Checklist (DELETE THIS SECTION if PR doesn't touch `config.yaml` / `schema.graphql` / `src/handlers/`)

> See [SCALE.md](../SCALE.md) Guardrail 3 for full context.

### Source-Addition Checklist (REQUIRED when adding/modifying `contracts:` in `config.yaml`)

- [ ] **Contract creation block looked up** via the chain's official explorer
      Source: <explorer URL>
      Creation block: <number>
      Creation tx: <hash>
- [ ] **`start_block:` ≥ creation block** — verified per chain (no cross-chain inheritance assumed)
- [ ] **Local 5-min smoke test** ran via [FAST_TESTING_GUIDE.md](../FAST_TESTING_GUIDE.md); handler fires on at least one event
- [ ] **Per-source backfill estimate** computed via SCALE.md Guardrail 3 formula:
      `events_expected = (current_block - start_block) × historical_event_rate_per_block_for_source`
      `estimated_minutes = ceil(events_expected / 25_000 / 60) × 1.3` (V3 chunking + 30% margin)
      Estimated reindex time: <minutes>
- [ ] **CUMULATIVE backfill estimate** across all affected chains/sources:
      <list each chain × source × estimated minutes>
      Total: <minutes>
      Method: blue-green (Guardrail 1) OR in-place (only if cumulative <30 min AND in-place safety verified)
- [ ] **RPC capacity pre-flight** — verified (Guardrail 1 pre-flight section)
- [ ] **Per-source health probe template prepared** (Guardrail 4): pass criteria for verifying source goes live
- [ ] **Downstream consumers identified**: <list of repos>
- [ ] **Consumer migration plan** — see Guardrail 1 ordered cutover sequence

### Schema Change Checklist (REQUIRED when modifying `schema.graphql`)

- [ ] **Backward-compatible**: no removed/renamed fields that consumers depend on, OR consumer migration PRs filed first
- [ ] **`@index` directives** added for any new fields used in consumer `where` clauses
- [ ] **Aggregate counts** verified to match prior deployment for stable collections
- [ ] **Blue-green required** (schema changes always trigger reset) — see [Guardrail 1](../SCALE.md#guardrail-1--blue-green-schema-rollout)

### Handler Change Checklist (REQUIRED when modifying `src/handlers/`)

- [ ] **Preload pattern** preserved (`isPreload` guard before writes; `Promise.all` reads up front)
- [ ] **No new RPC calls** in hot paths (per `perf/sync-optimization` lessons)
- [ ] **Aggregate shape unchanged**, OR explicit blue-green required
- [ ] **Test plan for affected entity types**

---

## Changes Made

- Change 1
- Change 2
- Change 3

## Testing

Describe how you tested these changes:

- [ ] Tested with Claude Code locally
- [ ] Ran relevant commands (`/setup`, `/plan-and-analyze`, etc.)
- [ ] Added/updated tests
- [ ] All existing tests pass

## Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have made corresponding changes to documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing tests pass locally

## Documentation

- [ ] README.md updated (if applicable)
- [ ] CLAUDE.md updated (if applicable)
- [ ] PROCESS.md updated (if applicable)
- [ ] CHANGELOG.md updated (maintainers will review)

## Screenshots (if applicable)

Add screenshots to help explain your changes.

## Additional Notes

Any additional information reviewers should know.
