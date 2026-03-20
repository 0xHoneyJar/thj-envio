# PRD: Multi-Model Permission Architecture — Ecosystem-Wide Governance Primitives

**Cycle**: cycle-050
**Created**: 2026-03-19
**Sources**: Bridgebuilder Review (PR #451), Hounfour RFC (loa-finn #31), Freeside Billing RFC (loa-freeside #62), Freeside Economic Proof of Life (loa-freeside #90), Dixie Constitutional Governance (loa-dixie #5), Launch Readiness (loa-finn #66)
**Status**: DRAFT
**Predecessor**: cycle-049 (Upstream Platform Alignment — PR #451)
**Flatline Review**: 3-model (Opus + GPT-5.3-codex + Gemini 2.5 Pro) — 5 HIGH_CONSENSUS integrated, 7 BLOCKERS addressed
**Red Team Review**: 5 attacks analyzed, 4 theoretical, 0 confirmed

## 1. Problem Statement

PR #451 (cycle-049) established Loa's permission layer using Claude Code-native primitives: `allowed-tools` frontmatter on 13 skills, path-scoped `.claude/rules/` files, and an ADVISORY compliance hook. These primitives work within Claude Code but **do not compose across the multi-model, multi-repo ecosystem**.

**Concrete gaps**:

- **Tool names are Claude Code-specific**: `allowed-tools: Read, Grep, Glob, Bash(git diff *)` has no meaning when a skill routes through Hounfour to Kimi-K2-Thinking or Qwen3-Coder-Next. The Hounfour adapter (loa-finn #31, §5.6 "Skill Decomposition for Portability") needs a model-agnostic capability declaration to enforce sandboxing on non-Claude backends.

- **No cost attribution per skill**: Freeside's conservation invariants (`committed + reserved + available = limit`, loa-freeside #90) enforce budget limits at the aggregate level, but cannot differentiate between a lightweight `Read, Grep, Glob` skill and a heavy `Write, Edit, Bash(*)` skill. Without cost profiles, budget enforcement is all-or-nothing.

- **Rule files have no governance lifecycle**: `.claude/rules/zone-system.md` is *de facto* constitutional (governs agent behavior) but has no provenance, version, or amendment process. loa-dixie's 73 constraint files all have `ConstraintOrigin` with `origin`, `version`, and governance metadata. Loa's rules are orphaned from this lifecycle.

- **ADVISORY compliance hook is heuristic-only**: `implement-gate.sh` reads `.run/` state files because the platform doesn't expose which skill is executing. A full implementation with feature detection and dual-mode support (heuristic fallback + authoritative when available) would close this gap properly.

- **Permissions don't propagate across repos**: When Loa mounts onto a downstream project via `/mount`, there's no defined merge semantic for when the project has its own `.claude/rules/` files. No conflict detection, no precedence rules.

- **12 skills remain unannotated**: The 12 skills not touched by cycle-049 (including high-privilege skills like `/implement`, `/run-mode`, `/autonomous`) lack `name`, `description`, `allowed-tools`, or `capabilities` metadata.

> Sources: PR #451 Bridgebuilder Review (BB-049-001 through BB-049-012), loa-finn #31 §5.6, loa-freeside #62 §Current State, loa-freeside #90 §Conservation Invariants, loa-dixie #5 §ConstraintOrigin

## 2. Goals & Success Criteria

| # | Goal | Metric | Source |
|---|------|--------|--------|
| G1 | Model-agnostic capability taxonomy | All 25 skills have `capabilities:` field; validation script confirms consistency with `allowed-tools` | BB-049-007, loa-finn #31 |
| G2 | Rule file lifecycle metadata | All `.claude/rules/` files have `origin`, `version`, `enacted_by` fields | BB-049 review, loa-dixie pattern |
| G3 | Cost-aware skill profiles | All 25 skills have `cost-profile:` field; queryable by external systems | BB-049 review, loa-freeside #62 |
| G4 | Authoritative compliance hook | `implement-gate.sh` supports dual-mode (heuristic + authoritative); feature detection script works | BB-049-008 |
| G5 | Cross-repo permission propagation | `/mount` skill detects and resolves rule file conflicts; merge semantics documented | BB-049 review |
| G6 | Complete skill annotation | All 25 skills have `name`, `description`, `capabilities`, `cost-profile` | BB-049-006 |
| G7 | Cross-repo issues created | Issues filed in loa-hounfour, loa-freeside, loa-dixie with integration context | Phase 2 interview |

**Loa-side acceptance**: All goals are validated within the Loa repo via tests and validation scripts. Cross-repo integration is tracked via issues in respective repos.

## 3. User Context

### Primary Persona: Loa Framework Operator

Runs development cycles across 5+ downstream projects. Needs permission primitives that work regardless of which model backend executes a skill. Pain points from cycle-049: skills consume full tool access on non-Claude backends because `allowed-tools` is Claude-specific.

### Secondary Persona: Hounfour Adapter Developer

Consumes skill frontmatter to enforce sandboxing when routing to non-Claude models. Currently has no portable contract — must parse Claude Code tool names and guess equivalents. Needs a `capabilities:` field with model-agnostic semantics.

### Tertiary Persona: Downstream Project Maintainer

Mounts Loa onto their project. When their project already has `.claude/rules/` files, there's no defined behavior — Loa's rules may conflict with or override project rules silently.

> Sources: Existing PRD cycle-049 §3, loa-finn #31 §Preamble, loa-finn #66 §Launch Readiness

## 4. Functional Requirements

### FR-1: Tool Capability Taxonomy

**Problem**: `allowed-tools: Read, Grep, Glob, Bash(git diff *)` is meaningful only within Claude Code. Non-Claude model backends (via Hounfour) have different tool schemas.

**Solution**: Add a `capabilities:` field to SKILL.md frontmatter as a model-agnostic intermediate representation. `allowed-tools` remains the Claude Code-specific surface; `capabilities` is the portable contract.

**Capability categories**:

| Capability | Description | Maps to (Claude Code) |
|------------|-------------|----------------------|
| `read_files` | Read file contents | `Read` |
| `search_code` | Search file names and content | `Grep`, `Glob` |
| `write_files` | Create or modify files | `Write`, `Edit` |
| `execute_commands` | Run shell commands (with patterns) | `Bash(pattern)` |
| `web_access` | Fetch URLs, search web | `WebFetch`, `WebSearch` |
| `user_interaction` | Ask user questions | `AskUserQuestion` |
| `agent_spawn` | Launch subagents | `Agent` |
| `task_management` | Create/update tasks | `TaskCreate`, `TaskUpdate` |

**Schema** (in SKILL.md frontmatter):
```yaml
capabilities:
  schema_version: 1              # Flatline IMP-001: explicit versioning
  read_files: true
  search_code: true
  write_files: false
  execute_commands:               # Flatline IMP-003/SKP-004: strict grammar
    allowed:
      - command: "git"
        args: ["diff", "*"]
      - command: "git"
        args: ["log", "*"]
    deny_raw_shell: true          # No unstructured shell evaluation
  web_access: false
  user_interaction: false
  agent_spawn: false
  task_management: false
```

**Strict `execute_commands` grammar** (Flatline IMP-003, SKP-004):
- Commands are tokenized: `command` + `args` array, NOT raw shell strings
- `deny_raw_shell: true` prevents unstructured shell evaluation by adapters
- Glob wildcards (`*`) only in the final argument position
- No shell operators (`|`, `&&`, `;`, `` ` ``), subshells, or variable expansion
- Adapters MUST validate against this grammar; raw pattern pass-through is forbidden

**`capabilities: all` is PROHIBITED** (Flatline SKP-003): Unrestricted skills MUST use an explicit expanded map with all capabilities set to `true`. No sentinel values — always structured, always parseable.

**Default for unannotated skills: DENY** (Flatline SKP-001): If a skill's SKILL.md lacks a `capabilities` field, the default is deny-all (no capabilities granted), NOT unbounded. This inverts the fail-open default to fail-closed. Unannotated skills will fail validation and must be annotated before use.

**Taxonomy versioning** (Flatline IMP-001): The `schema_version` field enables backward-compatible evolution. Adapters MUST check `schema_version` and reject unknown versions rather than guessing.

**Validation**: Script that checks every skill's `capabilities` is consistent with its `allowed-tools`. Runs in `--strict` mode by default on CI (warnings are errors). A skill with `write_files: false` must not have `Write` or `Edit` in `allowed-tools`.

**Acceptance criteria**:
- [ ] All 25 skills have `capabilities:` field with `schema_version: 1`
- [ ] No skill uses `capabilities: all` — all use explicit expanded maps
- [ ] `execute_commands` uses tokenized grammar (command + args), not raw patterns
- [ ] Validation script (`validate-skill-capabilities.sh`) passes in `--strict` mode
- [ ] `capabilities` and `allowed-tools` consistency check passes
- [ ] Unannotated skills fail validation (deny-by-default verified)
- [ ] Schema documented in `.claude/loa/reference/` with provider conformance test guidance
- [ ] Taxonomy versioning documented with migration rules

> Sources: BB-049-007, loa-finn #31 §5.6, Flatline IMP-001/IMP-003/SKP-001/SKP-002/SKP-003/SKP-004

### FR-2: Rule File Lifecycle Metadata

**Problem**: `.claude/rules/` files are constitutional constraints without provenance, versioning, or governance metadata. loa-dixie's 73 constraint files all have structured lifecycle metadata.

**Solution**: Add `origin`, `version`, `enacted_by` to all rule file frontmatter, mirroring loa-dixie's `ConstraintOrigin` pattern.

**Schema** (added to existing frontmatter):
```yaml
---
paths:
  - "grimoires/**"
  - ".beads/**"
  - ".ck/**"
  - ".run/**"
origin: enacted        # genesis | enacted | migrated
enacted_by: cycle-049  # which cycle created this rule
version: 1             # monotonically increasing
---
```

**Acceptance criteria**:
- [ ] All `.claude/rules/` files have `origin`, `version`, `enacted_by`
- [ ] Validation script checks required fields
- [ ] Schema matches loa-dixie's `ConstraintOrigin` type
- [ ] Documentation in `.claude/loa/reference/hooks-reference.md`

> Sources: BB-049 review §IV, loa-dixie #5 §ConstraintOrigin

### FR-3: Cost-Aware Skill Profiles

**Problem**: Freeside's conservation guard enforces budget limits at the aggregate level but can't differentiate between skill cost profiles. A `Read, Grep, Glob` skill and a `Write, Edit, Bash(*)` skill consume budget identically.

**Solution**: Add `cost-profile:` field to SKILL.md frontmatter. Four tiers:

| Profile | Description | Typical `capabilities` | Example Skills |
|---------|-------------|----------------------|----------------|
| `lightweight` | Read-only analysis, minimal tokens | `read_files`, `search_code` | `/flatline-knowledge`, `/enhance` |
| `moderate` | Read + limited write, medium tokens | Above + `write_files` (scoped) | `/review-sprint`, `/translate` |
| `heavy` | Full tool access, high token usage | Most capabilities enabled | `/implement`, `/ride`, `/audit` |
| `unbounded` | Autonomous multi-skill orchestration | All capabilities | `/run-bridge`, `/autonomous` |

**Schema** (in SKILL.md):
```yaml
cost-profile: lightweight  # lightweight | moderate | heavy | unbounded
```

**Default**: Unannotated skills default to `denied` — validation fails until a cost-profile is explicitly assigned (Flatline SKP-001: fail-closed, not fail-open). This prevents metadata drift from silently granting maximum cost allowance.

**Acceptance criteria**:
- [ ] All 25 skills have `cost-profile:` field
- [ ] Validation script checks field is one of 4 valid values
- [ ] `cost-profile` correlates with `capabilities` (lightweight skills should not have `write_files: true`)
- [ ] Cross-reference documented for Freeside integration

> Sources: BB-049 review §IV, loa-freeside #62 §Agent Billing, loa-freeside #90 §Conservation Invariants

### FR-4: ADVISORY → AUTHORITATIVE Compliance Hook

**Problem**: `implement-gate.sh` reads `.run/` state files heuristically. When the platform doesn't expose skill execution context, this is the best available approach. But the hook should be ready to use authoritative context when it becomes available.

**Solution**: Full implementation with dual-mode support:

1. **Feature detection script** (`detect-platform-features.sh`): Probes whether Claude Code exposes skill execution context to hooks (e.g., `tool_input.active_skill` field in hook stdin). Uses versioned feature flags with explicit capability handshake — never assumes presence from partial signals (Flatline SKP-006).
2. **Dual-mode hook**: `implement-gate.sh` checks feature detection result at startup:
   - Authoritative mode: reads `active_skill` from hook input — deterministic allow/deny. Trust boundary: `active_skill` is trusted ONLY when feature detection confirms the platform provides it with integrity guarantees (Flatline IMP-004). Mode pinning: once a mode is selected for a session, it does not silently downgrade.
   - Heuristic mode (current): reads `.run/` state files — ADVISORY ask. Fail-closed for high-risk actions (App Zone writes default to ASK when heuristic mode active, even on detection failure). Telemetry: mode downgrades are logged to `.run/audit.jsonl` with operator-visible markers (Flatline SKP-006).
3. **Portable date conversion**: Uses `compat-lib.sh` `_date_to_epoch()` (addressing BB-049-001)
4. **Path normalization**: Normalizes absolute paths relative to `PROJECT_ROOT` before zone classification (addressing BB-049-004)

**Acceptance criteria**:
- [ ] `detect-platform-features.sh` correctly reports feature availability
- [ ] `implement-gate.sh` operates in heuristic mode when feature unavailable
- [ ] `implement-gate.sh` operates in authoritative mode when feature available
- [ ] All existing compliance-hook.bats tests pass
- [ ] New tests for: simstim-state.json scenarios, state.json scenarios, authoritative mode, path normalization
- [ ] Portable date conversion works on GNU and macOS

> Sources: BB-049-001, BB-049-004, BB-049-005, BB-049-008

### FR-5: Cross-Repo Permission Propagation

**Problem**: When Loa mounts onto a downstream project via `/mount`, and the project already has `.claude/rules/` files, there's no defined behavior. Rules may conflict or silently override each other.

**Solution**: Define merge semantics and add conflict detection to `/mount`:

**Precedence** (like CSS specificity):
1. Project-specific rules (highest priority)
2. Loa framework rules
3. Claude Code default behavior (lowest)

**Conflict detection** (Flatline SKP-007: deterministic algorithm): When `/mount` finds existing `.claude/rules/` files in the target project:
1. Parse `paths:` frontmatter from both Loa and project rules
2. Identify overlapping path patterns using deterministic ordering (alphabetical by filename, then by path pattern)
3. For each overlap: determine if directives conflict (different permissions for same path)
4. Report conflicts with dry-run output showing exactly what would happen
5. **Require explicit user confirmation on ambiguous merges** — never auto-merge conflicting rules
6. Non-conflicting rules merged with clear provenance annotations

**Tie-breaking rules** (Flatline SKP-007):
- Same path, different directives → project rule wins (project > Loa > default)
- Same path, same directive → keep project version, log Loa version as superseded
- Multi-file overlap (path appears in 3+ rule files) → hard-fail, require manual resolution
- Transitive mounts (project already has mounted Loa rules from another version) → version check, warn on downgrades

**Documentation**: Reference doc explaining merge semantics, conflict resolution, tie-breaking, and examples.

**Acceptance criteria**:
- [ ] `/mount` detects existing `.claude/rules/` files in target project
- [ ] Overlapping path patterns identified with deterministic ordering
- [ ] Dry-run output shows exact merge result before execution
- [ ] Ambiguous merges require explicit user confirmation
- [ ] Merge semantics documented in `.claude/loa/reference/`
- [ ] Non-conflicting rules merged correctly with provenance
- [ ] Tests for: no existing rules, non-overlapping rules, conflicting rules, multi-file overlap, transitive mount

> Sources: BB-049 review §IV, `/mount` skill

### FR-6: Complete Skill Annotation

**Problem**: 12 skills lack frontmatter metadata. High-privilege skills (`/implement`, `/run-mode`, `/autonomous`) have no explicit `capabilities` or `cost-profile`, making the absence of restrictions invisible rather than intentional.

**Solution**: Annotate all remaining unannotated skills with `name`, `description`, `capabilities`, `cost-profile`, and `allowed-tools` where appropriate. For unrestricted skills, use explicit expanded `capabilities` maps with all fields set to `true` — no `capabilities: all` sentinel (Flatline SKP-003).

**Migration rollout** (Flatline IMP-006): Annotate in two waves:
1. **Wave 1 (low-risk)**: Skills that already have partial frontmatter — add missing fields only
2. **Wave 2 (high-risk)**: Fully unannotated skills (`implementing-tasks`, `autonomous-agent`, `run-mode`, `run-bridge`, `simstim-workflow`) — requires careful capability mapping and regression testing

**Affected skills**: `mounting-framework`, `continuous-learning`, `deploying-infrastructure`, `butterfreezone-gen`, `red-teaming`, `bridgebuilder-review`, `riding-codebase`, `implementing-tasks`, `autonomous-agent`, `simstim-workflow`, `run-mode`, `run-bridge`

**Also update already-annotated skills** (Flatline IMP-006): The 13 skills annotated in cycle-049 need `capabilities` and `cost-profile` fields added. This is a separate migration step from new annotation.

**Acceptance criteria**:
- [ ] All 25 skills have `name`, `description`, `capabilities` (explicit map), `cost-profile`
- [ ] No skill uses `capabilities: all` sentinel — all use expanded maps
- [ ] Validation script passes in `--strict` mode for all 25 skills
- [ ] Migration executed in two waves with regression testing between waves
- [ ] No functional regression — skills load and execute correctly

> Sources: BB-049-006, Flatline IMP-006/SKP-003

## 5. Technical & Non-Functional Requirements

### NFR-1: Backward Compatibility

Existing `allowed-tools` continues to work unchanged. New frontmatter fields (`capabilities`, `cost-profile`) are additive. **Breaking change**: absence of `capabilities` now defaults to deny-all (fail-closed), not unbounded. This is an intentional security posture change (Flatline SKP-001). All 25 skills will be annotated in this cycle, so no skill should be affected by the deny default.

### NFR-2: Frontmatter Safety

Claude Code's SKILL.md parser must not reject unknown frontmatter fields. Verify with canary skill before bulk annotation. If parser rejects unknown fields, use comment-based metadata as fallback.

### NFR-3: Minimum Runtime Enforcement

While `capabilities` and `cost-profile` are primarily consumed at planning/routing time, the compliance hook (`implement-gate.sh`) provides **minimum runtime enforcement at the hook boundary** (Flatline SKP-003/SKP-005). Deny-by-default behavior when metadata is missing or invalid. This is NOT full runtime authorization — it is a defense-in-depth layer that catches the most dangerous cases (App Zone writes without active implementation context).

### NFR-4: Security — Capability/Tool Consistency (Strict Mode)

A skill's `capabilities` must never grant more access than its `allowed-tools`. Validation runs in `--strict` mode on CI by default — warnings are promoted to errors on protected branches (Flatline IMP-002). Explicit exception waivers via `.loa.config.yaml` for skills that intentionally overclaim capabilities.

### NFR-5: Cross-Platform Portability

All new shell scripts must work on GNU/Linux and macOS. Use `compat-lib.sh` for date conversion, flock, and other platform-divergent operations. (Addresses BB-049-001 pattern.)

### NFR-6: Metadata Integrity (Flatline SKP-008 SDD)

Permission-affecting files (`.claude/rules/*.md`, `.claude/skills/*/SKILL.md`) should be protected by CODEOWNERS and require review for changes. CI checks validate that capability/rule changes are authorized by appropriate reviewers. The `enacted_by` field on rules provides audit trail.

## 6. Scope & Prioritization

### In Scope (cycle-050)

| Priority | FR | Description | Effort |
|----------|-----|-------------|--------|
| P0 | — | Cross-repo issue creation (hounfour, freeside, dixie) — before implementation (Flatline SKP-001 SDD) | Low |
| P0 | FR-1 | Tool capability taxonomy (versioned, strict grammar, fail-closed) | Medium |
| P0 | FR-6 | Complete skill annotation (25/25, two-wave rollout) | Medium |
| P1 | FR-2 | Rule file lifecycle metadata | Low |
| P1 | FR-3 | Cost-aware skill profiles (fail-closed defaults) | Low |
| P1 | FR-4 | ADVISORY → AUTHORITATIVE full impl (trust boundaries, mode pinning) | Medium |
| P2 | FR-5 | Cross-repo permission propagation (deterministic merge, dry-run) | Medium |

### Out of Scope

- Hounfour adapter implementation consuming `capabilities` (tracked via issue in loa-hounfour)
- Freeside conservation guard integration with `cost-profile` (tracked via issue in loa-freeside)
- loa-dixie `ConstraintOrigin` schema extension for Loa rules (tracked via issue in loa-dixie)
- Actual multi-model routing (Hounfour RFC implementation)
- Billing activation (loa-freeside #62 — separate cycle)

## 7. Risks & Dependencies

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Claude Code rejects unknown SKILL.md frontmatter fields | All capability/cost annotations break skill loading | Low | Test with canary skill first; fallback to comment metadata |
| `capabilities` and `allowed-tools` drift out of sync | Security — model gets more tools than intended | Medium | CI validation script; both fields in same file |
| Hounfour RFC not yet implemented — capability taxonomy has no consumer | Speculative design | Medium | Ground taxonomy in Hounfour RFC's `ModelPort` interface; field is self-documenting regardless |
| ADVISORY→AUTHORITATIVE migration assumes future Claude Code feature | Hook architecture may need refactoring | Low | Feature detection ensures graceful degradation; heuristic mode always available |
| Cross-repo issues may stall | Interfaces defined but never consumed | Medium | Track in loa-finn #66 launch readiness dashboard |
| Rule lifecycle metadata not consumed by Claude Code | Metadata is dead weight | Low | Useful for Loa governance; Dixie integration is primary consumer |

### Dependencies

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| PR #451 merged | Hard | Open (under review) | Cannot start cycle-050 on same branch |
| Claude Code SKILL.md parser tolerance | Soft | [ASSUMPTION] tolerant | Fallback to comment metadata |
| `compat-lib.sh` portable date function | Soft | Partial (BB-049-001 fix landed) | Extend existing pattern |
| loa-finn #31 Hounfour RFC finalized | Soft | Draft v4 | Capability taxonomy still useful as documentation |

## 8. Cross-Repo Integration Plan

After Loa-side implementation, file issues in downstream repos with integration context:

### loa-hounfour: Consume Skill Capability Taxonomy

- **What**: Hounfour adapters read `capabilities:` from SKILL.md to enforce tool sandboxing on non-Claude backends
- **Interface**: YAML `capabilities` field with boolean flags + execute_commands patterns
- **Context**: Link to Loa's `validate-skill-capabilities.sh` as reference implementation

### loa-freeside: Consume Skill Cost Profiles

- **What**: Conservation guard uses `cost-profile:` to set per-invocation budget limits
- **Interface**: `cost-profile: lightweight | moderate | heavy | unbounded`
- **Context**: Link to Freeside's existing `evaluateEconomicBoundary()` as integration point

### loa-dixie: Rule Lifecycle Governance

- **What**: Loa's `.claude/rules/` files participate in constitutional governance using Dixie's `ConstraintOrigin` pattern
- **Interface**: `origin: genesis | enacted | migrated`, `version: N`, `enacted_by: cycle-NNN`
- **Context**: Link to Dixie's existing constraint lifecycle documentation

> Sources: Phase 2 interview response — "make issues in the respective repos so that they can implement locally"
