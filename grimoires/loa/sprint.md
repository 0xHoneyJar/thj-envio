# Sprint Plan: Multi-Model Permission Architecture

**Cycle**: cycle-050
**PRD**: grimoires/loa/prd.md
**SDD**: grimoires/loa/sdd.md
**Created**: 2026-03-19
**Status**: ACTIVE — registered as sprints 105-109
**Sprints**: 5
**Estimated Total**: ~40 files, ~30 tests
**Quality Gates**: Flatline PRD (5 HIGH, 7 BLOCKERS addressed), Flatline SDD (8 BLOCKERS addressed), Red Team (5 attacks, 0 confirmed)

---

## Sprint 105 (Global): Cross-Repo Issues + Canary Test

**Goal**: Validate Claude Code parser tolerance and create cross-repo issues before implementation.

### T1.1: Canary Test — enhancing-prompts

**Description**: Add `capabilities:` (schema_version: 1, read_files: true, search_code: true, all others false) and `cost-profile: lightweight` to `.claude/skills/enhancing-prompts/SKILL.md`. Invoke `/enhance` to verify loading.

**Files**: `.claude/skills/enhancing-prompts/SKILL.md`

**Acceptance criteria**:
- [ ] Canary skill loads and executes with new frontmatter fields
- [ ] `capabilities` uses explicit expanded map (no `all` sentinel)
- [ ] `execute_commands` uses strict grammar or `false`

**Effort**: Low
**Dependencies**: PR #451 merged to main

---

### T1.2: File Cross-Repo Issues

**Description**: Create integration issues in loa-hounfour, loa-freeside, loa-dixie with context from PRD section 8.

**Acceptance criteria**:
- [ ] loa-hounfour issue: "Consume Skill Capability Taxonomy" with owners, acceptance criteria, target version
- [ ] loa-freeside issue: "Consume Skill Cost Profiles" with integration point reference
- [ ] loa-dixie issue: "Rule Lifecycle Governance" with ConstraintOrigin mapping

**Effort**: Low
**Dependencies**: None

---

### T1.3: Document Canary Results

**Description**: Record canary test results in NOTES.md. If parser rejects fields, activate comment-metadata fallback.

**Acceptance criteria**:
- [ ] Results documented with pass/fail status
- [ ] If FAIL: comment-metadata fallback plan documented, cycle plan adjusted

**Effort**: Low
**Dependencies**: T1.1

---

## Sprint 106 (Global): Foundation — Schema Design + Validation Tooling

**Goal**: Build validation infrastructure that all subsequent sprints depend on.

### T2.1: validate-skill-capabilities.sh

**Description**: Create validation script that reads SKILL.md frontmatter, validates capabilities schema (schema_version, 8 fields), checks consistency with allowed-tools per SDD mapping table, enforces no `capabilities: all` sentinel, validates execute_commands strict grammar.

**Files**: `.claude/scripts/validate-skill-capabilities.sh` (new)

**Acceptance criteria**:
- [ ] Detects: missing capabilities, capabilities-vs-allowed-tools mismatch, `capabilities: all` sentinel, raw shell patterns
- [ ] `--strict` mode promotes warnings to errors
- [ ] `--json` output for CI
- [ ] `--skill SKILL_NAME` for single-skill validation
- [ ] Exit 0 pass, 1 errors, 2 script error

**Effort**: Medium
**Dependencies**: T1.1 (canary passed)

---

### T2.2: validate-rule-lifecycle.sh

**Description**: Create validation script for rule file lifecycle metadata.

**Files**: `.claude/scripts/validate-rule-lifecycle.sh` (new)

**Acceptance criteria**:
- [ ] Checks `origin` (genesis|enacted|migrated), `version` (integer), `enacted_by` (cycle reference)
- [ ] `--json` output for CI
- [ ] Exit 0 pass, 1 missing fields

**Effort**: Low
**Dependencies**: None

---

### T2.3: _date_to_epoch() in compat-lib.sh

**Description**: Portable ISO 8601 to epoch conversion. Tier 1: GNU `date -d`; Tier 2: macOS `date -jf`; Tier 3: perl fallback.

**Files**: `.claude/scripts/compat-lib.sh` (modify)

**Acceptance criteria**:
- [ ] Converts ISO 8601 timestamps on GNU Linux
- [ ] Converts ISO 8601 timestamps on macOS (BSD date)
- [ ] Returns epoch seconds as integer

**Effort**: Low
**Dependencies**: None

---

### T2.4: Permissions Reference Doc

**Description**: Document capability taxonomy, cost profiles, schema versioning, strict execute_commands grammar, security invariants, provider conformance guidance.

**Files**: `.claude/loa/reference/permissions-reference.md` (new)

**Acceptance criteria**:
- [ ] 8 capability categories with Claude Code tool mappings
- [ ] 4 cost-profile tiers with correlation rules
- [ ] Schema versioning with migration rules
- [ ] Strict execute_commands grammar (tokenization rules, prohibited patterns)
- [ ] Security invariants (ERROR vs WARNING classification)
- [ ] Provider conformance test guidance for Hounfour adapters

**Effort**: Medium
**Dependencies**: None

---

### T2.5: skill-capabilities.bats (10 tests)

**Description**: Unit tests for validate-skill-capabilities.sh.

**Files**: `tests/unit/skill-capabilities.bats` (new)

**Tests**:
1. Valid capabilities pass validation
2. Missing capabilities fail (deny-all default)
3. `capabilities: all` sentinel rejected
4. Raw shell pattern in execute_commands rejected
5. capabilities-vs-allowed-tools mismatch: ERROR case
6. capabilities-vs-allowed-tools mismatch: WARNING case
7. `--strict` mode promotes warnings to errors
8. `--json` output is valid JSON
9. schema_version validation (missing → error)
10. cost-profile correlation check (lightweight + write_files → warning)

**Effort**: Medium
**Dependencies**: T2.1

---

### T2.6: rule-lifecycle.bats (4 tests)

**Description**: Unit tests for validate-rule-lifecycle.sh.

**Files**: `tests/unit/rule-lifecycle.bats` (new)

**Tests**:
1. Valid lifecycle passes
2. Missing origin fails
3. Missing version fails
4. Missing enacted_by fails

**Effort**: Low
**Dependencies**: T2.2

---

## Sprint 107 (Global): Skill Annotation (Two-Wave Rollout)

**Goal**: Annotate all 25 skills with explicit expanded `capabilities` maps and `cost-profile` fields.

### T3.1: Wave 1A — 7 Read-Only/Low-Risk Skills

**Description**: Add `capabilities` + `cost-profile` to: auditing-security (heavy), browsing-constructs (moderate), enhancing-prompts (canary'd), eval-running (moderate), flatline-knowledge (lightweight), managing-credentials (lightweight), rtfm-testing (moderate).

**Files**: 7 SKILL.md files

**Acceptance criteria**:
- [ ] All 7 skills have `capabilities:` with `schema_version: 1`
- [ ] All use explicit expanded maps (no sentinel)
- [ ] `execute_commands` uses strict grammar where applicable

**Effort**: Low
**Dependencies**: T2.1 (validation script)

---

### T3.2: Wave 1B — 6 Write-Capable Skills

**Description**: Add `capabilities` + `cost-profile` to: discovering-requirements (moderate), reviewing-code (moderate), riding-codebase (heavy), translating-for-executives (lightweight), designing-architecture (moderate), planning-sprints (moderate).

**Files**: 6 SKILL.md files

**Effort**: Low
**Dependencies**: T2.1

---

### T3.3: Wave 1 Regression Test

**Description**: Run `validate-skill-capabilities.sh --strict` for all 13 Wave 1 skills. Invoke 2-3 representative skills.

**Acceptance criteria**:
- [ ] Validation passes for all 13 Wave 1 skills
- [ ] 2-3 skills invoked successfully

**Effort**: Low
**Dependencies**: T3.1, T3.2

---

### T3.4: Wave 2A — 6 Partially-Annotated Skills

**Description**: Full frontmatter for: bridgebuilder-review (heavy), bug-triaging (heavy), butterfreezone-gen (lightweight), continuous-learning (moderate), implementing-tasks (heavy), run-bridge (unbounded).

**Files**: 6 SKILL.md files

**Effort**: Medium
**Dependencies**: T3.3 (Wave 1 regression passed)

---

### T3.5: Wave 2B — 6 Fully-Unannotated Skills

**Description**: Full frontmatter creation for: autonomous-agent (unbounded), deploying-infrastructure (heavy), mounting-framework (heavy), red-teaming (heavy), run-mode (unbounded), simstim-workflow (unbounded). Explicit expanded capability maps.

**Files**: 6 SKILL.md files

**Effort**: Medium
**Dependencies**: T3.3

---

### T3.6: Wave 2 Regression Test

**Description**: Validate all 12 Wave 2 skills. Invoke 2-3 representative skills.

**Acceptance criteria**:
- [ ] Validation passes for all 12 Wave 2 skills
- [ ] 2-3 high-privilege skills invoked successfully

**Effort**: Low
**Dependencies**: T3.4, T3.5

---

### T3.7: Full Validation (25/25)

**Description**: Run `validate-skill-capabilities.sh --strict` for all 25 skills.

**Acceptance criteria**:
- [ ] Zero errors, zero warnings across all 25 skills
- [ ] No `capabilities: all` sentinel anywhere

**Effort**: Low
**Dependencies**: T3.6

---

### T3.8: Update SDD Annotation Matrix

**Description**: Add `bug-triaging` (missing from SDD section 9) with cost-profile: heavy.

**Files**: `grimoires/loa/sdd.md`

**Effort**: Low
**Dependencies**: None

---

## Sprint 108 (Global): Compliance Hook + Rule Lifecycle

**Goal**: Add lifecycle metadata to rule files and upgrade compliance hook to dual-mode.

### T4.1: Rule Lifecycle — zone-system.md

**Description**: Add `origin: genesis`, `version: 1`, `enacted_by: cycle-049` to `.claude/rules/zone-system.md`.

**Files**: `.claude/rules/zone-system.md`

**Effort**: Low
**Dependencies**: None

---

### T4.2: Rule Lifecycle — zone-state.md + shell-conventions.md

**Description**: Add lifecycle metadata to remaining 2 rule files.

**Files**: `.claude/rules/zone-state.md`, `.claude/rules/shell-conventions.md`

**Effort**: Low
**Dependencies**: None

---

### T4.3: detect-platform-features.sh

**Description**: Feature detection script with versioned capability handshake. Probes hook stdin for `tool_input.active_skill`. Outputs `.run/platform-features.json`. Cached per session.

**Files**: `.claude/scripts/detect-platform-features.sh` (new)

**Acceptance criteria**:
- [ ] Outputs valid JSON with `active_skill_available`, `detected_at`, `schema_version`
- [ ] Caches result (reuses existing file if fresh)
- [ ] No assumption from partial signals (Flatline SKP-006)

**Effort**: Medium
**Dependencies**: None

---

### T4.4: implement-gate.sh — Dual-Mode Upgrade

**Description**: Source `compat-lib.sh` for `_date_to_epoch()`. Check platform features at startup. Authoritative mode: read `active_skill`, deterministic allow/deny. Heuristic mode: existing logic. Mode pinning via `.compliance-mode` file. Audit logging for mode downgrades.

**Files**: `.claude/hooks/compliance/implement-gate.sh` (modify)

**Acceptance criteria**:
- [ ] Dual-mode operation (authoritative + heuristic)
- [ ] Mode pinning — no silent downgrade within session
- [ ] Mode downgrades logged to `.run/audit.jsonl`
- [ ] Fail-closed on detection failure (ASK, not allow)
- [ ] All 7 existing tests pass unchanged

**Effort**: Medium
**Dependencies**: T2.3 (_date_to_epoch), T4.3 (feature detection)

---

### T4.5: implement-gate.sh — Path Normalization

**Description**: Resolve absolute paths relative to `PROJECT_ROOT` before zone classification.

**Files**: `.claude/hooks/compliance/implement-gate.sh` (modify)

**Acceptance criteria**:
- [ ] `/home/user/project/src/file.ts` correctly classified as App Zone
- [ ] Relative paths still work unchanged

**Effort**: Low
**Dependencies**: T4.4

---

### T4.6: Compliance Hook + Rule Lifecycle Tests (11 tests)

**Description**: 7 new compliance-hook tests + 4 rule-lifecycle tests on updated files.

**Files**: `tests/unit/compliance-hook.bats` (extend), `tests/unit/rule-lifecycle.bats` (update fixtures)

**Tests** (compliance-hook):
1. Authoritative mode allows skill-active write
2. Authoritative mode blocks non-skill write
3. Mode pinning prevents downgrade
4. Stale feature detection re-probes
5. Path normalization (absolute → relative)
6. Date conversion via _date_to_epoch()
7. Audit log records mode downgrade

**Effort**: Medium
**Dependencies**: T4.4, T4.5

---

## Sprint 109 (Global): Mount Conflict Detection + Integration + E2E

**Goal**: Add conflict detection to `/mount`, run integration tests, validate all PRD goals.

### T5.1: Mount Conflict Detection Logic

**Description**: After copying Loa files, scan target `.claude/rules/` for pre-existing rules. Parse `paths:` frontmatter. Identify overlaps with deterministic ordering. Classify: non-conflicting, conflicting, multi-file overlap.

**Files**: `.claude/skills/mounting-framework/SKILL.md` (modify)

**Acceptance criteria**:
- [ ] Detects existing `.claude/rules/` files
- [ ] Overlaps identified with deterministic ordering
- [ ] Dry-run output before any changes
- [ ] Multi-file overlap (3+ files) hard-fails

**Effort**: Medium
**Dependencies**: Sprint 108 (rule files have lifecycle metadata)

---

### T5.2: Mount Merge Execution

**Description**: Non-conflicting rules merge with provenance. Conflicting rules require user confirmation. Multi-file overlaps halt.

**Files**: `.claude/skills/mounting-framework/SKILL.md` (modify)

**Effort**: Medium
**Dependencies**: T5.1

---

### T5.3: Permissions Reference — Merge Semantics

**Description**: Extend permissions-reference.md with mount merge docs: precedence, tie-breaking, transitive mounts, examples.

**Files**: `.claude/loa/reference/permissions-reference.md` (extend)

**Effort**: Low
**Dependencies**: T5.1

---

### T5.4: mount-conflicts.bats (5 tests)

**Description**: Unit tests for mount conflict detection.

**Files**: `tests/unit/mount-conflicts.bats` (new)

**Tests**:
1. No existing rules → clean mount
2. Non-overlapping rules → merge without conflict
3. Conflicting rules → detected and reported
4. Multi-file overlap → hard-fail
5. Transitive mount → version check

**Effort**: Medium
**Dependencies**: T5.1, T5.2

---

### T5.5: Integration Tests (5 tests)

**Description**: Cross-component integration validation.

**Files**: `tests/integration/test_skill_metadata.bats` (new)

**Tests**:
1. All 25 skills have complete frontmatter
2. Capabilities-vs-allowed-tools consistency across all skills
3. Cost-profile-vs-capabilities correlation
4. Rule lifecycle metadata complete
5. Both validation scripts interoperate (run both, zero errors)

**Effort**: Medium
**Dependencies**: All previous sprints

---

### T5.E2E: End-to-End Goal Validation

**Description**: Validate all 7 PRD goals with documented evidence.

| Goal | Validation | Expected |
|------|------------|----------|
| G-1 | `validate-skill-capabilities.sh --strict --json` | Exit 0, 25/25 |
| G-2 | `validate-rule-lifecycle.sh --json` | Exit 0, 3/3 |
| G-3 | grep `cost-profile:` across all SKILL.md | 25 matches |
| G-4 | compliance-hook.bats (14 tests) | 14/14 pass |
| G-5 | mount-conflicts.bats (5 tests) | 5/5 pass |
| G-6 | `validate-skill-capabilities.sh --strict` | Zero missing |
| G-7 | `gh issue list` across repos | 3 issues exist |

**Effort**: Low
**Dependencies**: All previous tasks

---

## Dependencies Map

```
Sprint 105 (Canary + Issues)
     │
     ▼
Sprint 106 (Validation Tooling) ──────────────────────┐
     │                                                  │
     ▼                                                  │
Sprint 107 (Skill Annotation) ──── Sprint 108 (Hook + Rules)
     │                                    │
     └──────────────┬─────────────────────┘
                    ▼
            Sprint 109 (Mount + Integration + E2E)
```

Note: Sprint 107 and 108 can partially overlap (both depend on 106, not on each other).
