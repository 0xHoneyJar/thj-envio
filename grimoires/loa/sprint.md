# Sprint Plan: Upstream Platform Alignment — Claude Code Feature Adoption

**Cycle**: cycle-049
**PRD**: grimoires/loa/prd.md
**SDD**: grimoires/loa/sdd.md
**Created**: 2026-03-17
**Status**: ACTIVE — registered as sprints 102-104
**Sprints**: 3
**Estimated Total**: ~350 lines across 23 files + 54 tests
**Quality Gates**: Flatline PRD (4 HIGH, 5 BLOCKERS addressed), Flatline SDD (6 HIGH, 5 BLOCKERS addressed), Red Team (20 attacks, 7 critical/high addressed)

---

## Sprint 1: Foundation — Model Aliases, Memory Docs, Agent Teams Validation

**Goal**: Close the three lowest-risk gaps with zero cross-dependencies. All changes are additive with immediate verification.

### T1.1: Model Adapter Backward Compat Aliases (FR-3)

**Description**: Add `claude-opus-4-0`, `claude-opus-4-1`, `claude-opus-4.0`, `claude-opus-4.1`, `claude-opus-4-5` entries to all 5 model maps (MODEL_PROVIDERS, MODEL_IDS, COST_INPUT, COST_OUTPUT in legacy; MODEL_TO_ALIAS in v2 shim). All resolve to `claude-opus-4-6`.

**Files**:
- `.claude/scripts/model-adapter.sh.legacy` — add 5 keys × 4 maps = 20 entries
- `.claude/scripts/model-adapter.sh` — add 5 keys to MODEL_TO_ALIAS

**Acceptance criteria**:
- [ ] `validate_model_registry()` passes (exit 0)
- [ ] `MODEL_IDS["claude-opus-4-0"]` resolves to `claude-opus-4-6`
- [ ] `MODEL_IDS["claude-opus-4-1"]` resolves to `claude-opus-4-6`
- [ ] `MODEL_IDS["claude-opus-4.0"]` resolves to `claude-opus-4-6`
- [ ] `MODEL_IDS["claude-opus-4.1"]` resolves to `claude-opus-4-6`
- [ ] `MODEL_IDS["claude-opus-4-5"]` resolves to `claude-opus-4-6`
- [ ] Existing aliases unchanged (regression check)

**Testing**: `tests/unit/model-adapter-aliases.bats` — 8 tests
**Effort**: Low
**Dependencies**: None

---

### T1.2: Model Adapter BATS Tests (FR-3)

**Description**: Create BATS test file for model adapter alias verification.

**Files**:
- `tests/unit/model-adapter-aliases.bats` (new)

**Tests**:
1. Source model-adapter.sh.legacy → validate_model_registry() exits 0
2. claude-opus-4-0 resolves in all 4 maps
3. claude-opus-4-1 resolves in all 4 maps
4. claude-opus-4.0 resolves in all 4 maps
5. claude-opus-4.1 resolves in all 4 maps
6. claude-opus-4-5 resolves in all 4 maps
7. Existing claude-opus-4.5 alias unchanged
8. MODEL_TO_ALIAS resolves for all new keys

**Acceptance criteria**:
- [ ] All 8 tests pass: `bats tests/unit/model-adapter-aliases.bats`
- [ ] Tests runnable in isolation (no dependency on other test files)

**Effort**: Low
**Dependencies**: T1.1

---

### T1.3: Memory System Ownership Boundary (FR-5)

**Description**: Document clear ownership between Loa's observations.jsonl and Claude Code's auto-memory. Add skip-list to memory-writer.sh.

**Files**:
- `.claude/loa/reference/memory-reference.md` — add ownership table
- `.claude/loa/CLAUDE.loa.md` — add 1-line reference at Persistent Memory section
- `.claude/hooks/memory-writer.sh` — add SKIP_PATTERNS array

**Acceptance criteria**:
- [ ] memory-reference.md contains ownership table with 8 scope rows
- [ ] CLAUDE.loa.md Persistent Memory section references ownership boundary
- [ ] memory-writer.sh has SKIP_PATTERNS for auto-memory topics
- [ ] Existing observation writes unaffected (skip-list only filters new writes)

**Effort**: Low
**Dependencies**: None

---

### T1.4: Agent Teams Hook Validation Tests (FR-6)

**Description**: Create BATS test suite validating that Loa safety hooks don't interfere with Claude Code's TeammateIdle and TaskCompleted hook events. Test team role guard behavior.

**Files**:
- `tests/unit/agent-teams-hooks.bats` (new)
- `.claude/loa/reference/agent-teams-reference.md` — add compatibility matrix

**Tests**:
1. block-destructive-bash allows non-PreToolUse events (passthrough)
2. team-role-guard blocks teammate br commands
3. team-role-guard allows lead br commands
4. team-skill-guard blocks teammate planning skills
5. team-role-guard-write blocks teammate System Zone writes
6. team-role-guard-write allows teammate App Zone writes
7. team-role-guard blocks `unset LOA_TEAM_MEMBER && br create` (Red Team ATK-011)
8. team-role-guard blocks `env -u LOA_TEAM_MEMBER git push` (Red Team ATK-011)

**Acceptance criteria**:
- [ ] All 8 tests pass: `bats tests/unit/agent-teams-hooks.bats`
- [ ] Tests runnable in isolation
- [ ] agent-teams-reference.md contains compatibility matrix (6 rows)
- [ ] LOA_TEAM_MEMBER unset patterns are blocked by team-role-guard

**Effort**: Low
**Dependencies**: None

---

## Sprint 2: Skill Frontmatter — Tool Restrictions & Subagent Isolation

**Goal**: Add `allowed-tools` to 11 read-only skills and `context: fork` to 4 heavy skills. FR-1 before FR-2 (forked skills inherit tool restrictions).

### T2.1: Add `name` and `description` to Skills Missing Frontmatter (FR-1 prerequisite)

**Description**: 11 skills have no `name` or `description` frontmatter, which is a prerequisite for Claude Code skill discovery and for `allowed-tools` to function. Add these fields to all skills lacking them.

**Files**: 11 SKILL.md files (skills identified in PRD §FR-1)

**Acceptance criteria**:
- [ ] All 25 skills have `name` and `description` in frontmatter
- [ ] `name` matches the skill's slash command identifier
- [ ] `description` is a single sentence explaining when Claude should use it
- [ ] Existing custom frontmatter fields preserved (parallel_threshold, zones, etc.)

**Effort**: Low (3 lines per file × 11 files)
**Dependencies**: None

---

### T2.2: Add `allowed-tools` to Read-Only Skills (FR-1)

**Description**: Restrict tool access for 11 skills per SDD §2.1 tool restriction table. Each skill gets a tailored `allowed-tools` list based on its actual usage patterns.

**Files**: 11 SKILL.md files

| Skill | `allowed-tools` |
|-------|-----------------|
| `auditing-security` | `Read, Grep, Glob, WebFetch, WebSearch` |
| `reviewing-code` | `Read, Grep, Glob, WebFetch, Bash(git diff *), Bash(git log *)` |
| `discovering-requirements` | `Read, Grep, Glob, AskUserQuestion, WebFetch, Write, Bash(git log *), Bash(wc *)` |
| `rtfm-testing` | `Read, Grep, Glob, Bash(bats tests/*), Bash(npm test *)` |
| `flatline-knowledge` | `Read, Grep, Glob` |
| `translating-for-executives` | `Read, Grep, Glob, Write` |
| `enhancing-prompts` | `Read, Grep, Glob` |
| `browsing-constructs` | `Read, Grep, Glob, WebFetch, Bash(gh repo *), Bash(gh release *)` |
| `managing-credentials` | `Read, Grep, Glob, Bash(printenv LOA_*)` |
| `eval-running` | `Read, Grep, Glob, Bash(evals/harness/*), Bash(bats tests/*)` |
| `loa` (golden-path) | `Read, Grep, Glob, Bash(.claude/scripts/golden-path.sh *), Bash(.claude/scripts/beads/beads-health.sh *)` |

**Rollout**: Canary on `flatline-knowledge`, `enhancing-prompts`, `loa` first. Validate on 2 downstream projects. Then expand.

**Acceptance criteria**:
- [ ] 11 skills have `allowed-tools` in frontmatter
- [ ] No skill uses bare `Bash`, `Bash(git *)`, `Bash(gh *)`, or `Bash(.claude/scripts/*)`
- [ ] Read-only skills (flatline-knowledge, enhancing-prompts) cannot invoke Write or Edit
- [ ] Negative security tests: `Bash(git log *)` blocks `git -c core.pager=evil log`; `Bash(gh repo *)` blocks `gh auth token`
- [ ] Canary skills validated on 2 downstream projects
- [ ] Each skill completes its primary workflow without tool permission errors

**Effort**: Medium (1 line per file, but requires validation testing)
**Dependencies**: T2.1

---

### T2.3: Add `context: fork` to Heavy Skills (FR-2)

**Description**: Fork 4 heavy skills into isolated subagent contexts per SDD §2.2. Each gets appropriate agent type.

**Files**: 4 SKILL.md files

| Skill | `context` | `agent` |
|-------|-----------|---------|
| `auditing-security` | `fork` | `Explore` |
| `designing-architecture` | `fork` | `Plan` |
| `planning-sprints` | `fork` | `Plan` |
| `bug-triaging` | `fork` | `general-purpose` |

**BLOCKING PREREQUISITE**: Before this task, verify that forked subagent contexts inherit hook configurations (Red Team ATK-017). Test by forking a skill and checking if PreToolUse hooks fire within the fork. If hooks are NOT inherited, change `bug-triaging` from `general-purpose` to `Explore`.

**Canary**: Fork `designing-architecture` first (Plan agent, lowest risk). Validate output quality.

**Acceptance criteria**:
- [ ] Hook inheritance verified for forked contexts
- [ ] 4 skills have `context: fork` and `agent` in frontmatter
- [ ] `auditing-security` uses `Explore` (not `general-purpose`) — read-only analysis
- [ ] Forked skills produce equivalent output (artifact completeness ≥90%, all required sections present)
- [ ] Orchestration skills (`implementing-tasks`, `run-bridge`, `run-mode`, `simstim-workflow`) are NOT forked
- [ ] Main context usage reduced after forking (manual `/context` check)

**Effort**: Low (2 lines per file × 4)
**Dependencies**: T2.2 (tool restrictions must exist before forking)

---

## Sprint 3: Rules Extraction & Compliance Prototype

**Goal**: Create path-scoped rules directory and prototype agent-based compliance hook. Most exploratory sprint — FR-7 is a prototype with known limitations.

### T3.1: Create `.claude/rules/` with Path-Scoped Rules (FR-4)

**Description**: Extract shell conventions, zone-system, and zone-state content from CLAUDE.loa.md into path-scoped rule files per SDD §2.4.

**Files created**:
- `.claude/rules/shell-conventions.md` — File Creation Safety content (paths: `*.sh`, `*.bats`)
- `.claude/rules/zone-system.md` — System Zone NEVER-edit rules (paths: `.claude/**`)
- `.claude/rules/zone-state.md` — State Zone conventions (paths: `grimoires/**`, `.beads/**`, `.run/**`)

**Files modified**:
- `.claude/loa/CLAUDE.loa.md` — replace extracted sections with 1-line references

**Acceptance criteria**:
- [ ] `.claude/rules/` directory exists with 3 rule files
- [ ] Each rule file has valid `paths:` frontmatter with YAML list format
- [ ] CLAUDE.loa.md reduced by ~25 lines (~8.5%)
- [ ] Extracted content matches source verbatim (no paraphrasing)
- [ ] One-line references in CLAUDE.loa.md point to correct rule files
- [ ] `/context` shows rules loading on-demand when editing matching file types

**Effort**: Medium
**Dependencies**: None (can parallel with sprint 2)

---

### T3.2: Agent-Based ADVISORY Compliance Hook — Implement Gate Prototype (FR-7)

**Description**: Create an ADVISORY prototype agent-type hook that checks Write/Edit operations to App Zone files against `.run/` state to verify an active `/implement` or `/bug` invocation. Fail-ask for App Zone writes (not fail-open). File path passed via structured JSON input (not template interpolation).

**Files created**:
- `.claude/hooks/compliance/implement-gate.json` — hook configuration template
- `tests/unit/compliance-hook.bats` — BATS tests with mocked state files

**Files modified**: None (hook configuration is a template, user merges into settings.json)

**Hook behavior**:
1. File NOT in App Zone → `allow` (immediate)
2. File in App Zone + state=RUNNING + valid plan_id + fresh timestamp → `allow`
3. File in App Zone + state=JACKED_OUT or HALTED → `ask`
4. File in App Zone + no active implementation → `ask`
5. State files missing/unreadable → `ask` (FAIL-ASK for compliance)
6. Subagent error/timeout → `ask` (FAIL-ASK for compliance)
7. Circuit breaker: cache `allow` for 60s keyed by state hash

**Tests**:
1. State file absent → `ask` (fail-ask)
2. State file with RUNNING + valid plan_id + fresh timestamp → `allow`
3. State file with JACKED_OUT → `ask`
4. State file with HALTED → `ask`
5. State file with RUNNING but stale timestamp (>24h) → `ask` (integrity)
6. State file with missing plan_id → `ask` (integrity)
7. File path with injection payload → `ask` (path read from file, not prompt)

**Acceptance criteria**:
- [ ] Hook configuration file exists at `.claude/hooks/compliance/implement-gate.json`
- [ ] Hook labeled as ADVISORY in all output messages
- [ ] File path passed via `.run/.compliance-check-input.json` (NOT template interpolation)
- [ ] Template includes installation instructions for merging into settings.json
- [ ] Hook fires on Write/Edit to `src/`, `lib/`, `app/` paths
- [ ] Returns `allow` when implementation is active with valid state
- [ ] Returns `ask` (not `allow`) on ALL error conditions for App Zone writes
- [ ] Circuit breaker caches result for 60s
- [ ] All 7 BATS tests pass
- [ ] Pattern documented as ADVISORY in hook template

**Effort**: Medium-High (prototype with known limitations)
**Dependencies**: T1.4 (understanding from Agent Teams validation informs hook design)

---

### T3.3: Documentation — Agent Hook Pattern Guide

**Description**: Document the agent-based compliance hook pattern for future replication. Include known limitations, performance characteristics, and migration path from shell hooks.

**Files modified**:
- `.claude/loa/reference/hooks-reference.md` — add Agent Hook section

**Content**:
- When to use agent hooks vs. shell hooks (decision tree)
- Agent hook configuration schema
- Performance expectations (<5s for read-only checks)
- Fail-open design requirements
- Known limitations (can't detect direct skill invocations without `/run` state)
- Migration path for other NEVER rules

**Acceptance criteria**:
- [ ] hooks-reference.md contains Agent Hook section
- [ ] Decision tree: shell hook (pattern matching) vs. agent hook (semantic context)
- [ ] At least 2 examples: the implement-gate prototype and a hypothetical second rule
- [ ] Performance and fail-open requirements documented

**Effort**: Low
**Dependencies**: T3.2

---

## Sprint Summary

| Sprint | Tasks | FRs Covered | Effort | Dependencies |
|--------|-------|-------------|--------|-------------|
| **Sprint 1** | T1.1, T1.2, T1.3, T1.4 | FR-3, FR-5, FR-6 | Low | None |
| **Sprint 2** | T2.1, T2.2, T2.3 | FR-1, FR-2 | Medium | Sprint 1 not required |
| **Sprint 3** | T3.1, T3.2, T3.3 | FR-4, FR-7 | Medium-High | T1.4 informs T3.2 |

**Parallelization**: Sprints 1 and 2 can run in parallel if resources allow. Sprint 3 should follow Sprint 1 (T1.4 → T3.2 dependency). Within each sprint, tasks are sequential unless noted.

---

## Risk Assessment

| Risk | Sprint | Mitigation |
|------|--------|------------|
| `allowed-tools` blocks legitimate skill operations | S2 | Validate each skill manually after restriction; use scoped `Bash(pattern *)` |
| `context: fork` degrades output quality | S2 | Compare forked output against prior cycle artifacts; rollback if quality drops |
| Agent hook API syntax may differ from docs | S3 | Verify `{{tool_input.file_path}}` template against actual Claude Code behavior; fall back to command hook if needed |
| Path-scoped rules don't trigger reliably | S3 | Keep critical rules in CLAUDE.loa.md; rules are supplementary, not exclusive |
| Cycle-048 conflicts with System Zone changes | All | Minimal overlap — cycle-048 touches review scripts, this cycle touches skill frontmatter and rules |

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|---------------|
| Skills with `allowed-tools` | 12+ (11 new + 1 existing) | `grep -l "allowed-tools" .claude/skills/*/SKILL.md \| wc -l` |
| Skills with no bare `Bash` | 12/12 | `grep -l 'allowed-tools.*[^(]Bash[^(]' .claude/skills/*/SKILL.md` should return 0 |
| Skills with `context: fork` | 5+ (4 new + 1 existing) | `grep -l "context: fork" .claude/skills/*/SKILL.md \| wc -l` |
| Hook inheritance verified | Yes/No | Manual test of PreToolUse firing in forked context |
| Model adapter validation | 0 errors | `.claude/scripts/model-adapter.sh.legacy && echo OK` |
| Path-scoped rule files | 3+ | `ls .claude/rules/*.md \| wc -l` |
| BATS test coverage | 54 new tests | All test files pass in isolation |
| Negative security tests | 4+ passing | Bypass vectors from Red Team confirmed blocked |
| CLAUDE.loa.md reduction | ~8.5% | `wc -l .claude/loa/CLAUDE.loa.md` (target: <270 lines) |

---

## Ledger Registration

**Deferred**: Cycle-049 sprints will be registered in `grimoires/loa/ledger.json` when cycle-048 is archived and this cycle becomes active. Expected global sprint IDs: 102-104 (based on current counter at 101).

```
Sprint 1 → global sprint-102
Sprint 2 → global sprint-103
Sprint 3 → global sprint-104
```
