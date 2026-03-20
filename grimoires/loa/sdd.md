# Software Design Document: Multi-Model Permission Architecture

**Version:** 1.1
**Date:** 2026-03-19
**Status:** Draft — Flatline integrated (3-model: Opus + GPT-5.3-codex + Gemini 2.5 Pro)
**PRD Reference:** grimoires/loa/prd.md
**Cycle:** cycle-050
**Predecessor:** cycle-049 (Upstream Platform Alignment)

---

## 1. Project Architecture

### 1.1 System Overview

Cycle-050 extends Loa's permission layer from Claude Code-specific tool constraints into a model-agnostic governance system. Skill metadata (capabilities, cost profiles, allowed-tools) lives in SKILL.md frontmatter, rule file metadata (origin, version, enacted_by) lives in `.claude/rules/` frontmatter, and validation scripts enforce consistency at CI time. No runtime overhead — all new metadata is declarative, consumed at planning/routing time.

### 1.2 Architectural Pattern

**Declarative metadata with offline validation (schema-driven governance)**

The permission system must be portable across Claude Code, Hounfour-routed models, and Freeside billing. Declarative YAML frontmatter is the only format readable by all three systems without runtime coupling. Validation scripts enforce invariants at CI/pre-commit time.

### 1.3 Components

| Component | FR | Purpose | Interface |
|-----------|-----|---------|-----------|
| Skill Capability Taxonomy | FR-1 | Model-agnostic tool permissions | `capabilities:` in SKILL.md |
| Rule File Lifecycle | FR-2 | Constitutional provenance | `origin`, `version`, `enacted_by` in rules |
| Cost-Aware Profiles | FR-3 | Budget differentiation | `cost-profile:` in SKILL.md |
| Dual-Mode Compliance Hook | FR-4 | Heuristic + authoritative mode | `implement-gate.sh` |
| Permission Propagation | FR-5 | Mount conflict detection | Extended `/mount` skill |
| Complete Annotation | FR-6 | All 25 skills annotated | SKILL.md frontmatter |

### 1.4 Data Flow

**Planning/routing time (no runtime cost):**
1. Skill invoked → Claude Code enforces `allowed-tools` natively
2. If Hounfour-routed → adapter reads `capabilities:` → maps to backend sandbox
3. If Freeside-metered → reads `cost-profile:` → sets invocation budget
4. Compliance hook reads state (heuristic) or skill context (authoritative) → allow/ask

**CI time:**
1. `validate-skill-capabilities.sh` checks capabilities ↔ allowed-tools consistency
2. `validate-rule-lifecycle.sh` checks rule files have required metadata

### 1.5 External Integrations

| System | Consumes | Issue |
|--------|----------|-------|
| Hounfour (loa-finn) | `capabilities:` for non-Claude sandboxing | To be filed |
| Freeside (loa-freeside) | `cost-profile:` for budget enforcement | To be filed |
| Dixie (loa-dixie) | Rule lifecycle metadata for governance | To be filed |

---

## 2. Software Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Bash | 4.4+ | Validation scripts, compliance hook |
| YAML | 1.2 | Frontmatter format |
| jq | 1.6+ | JSON parsing |
| yq | 4.0+ | YAML parsing |
| bats-core | 1.10+ | Tests |

No new dependencies.

---

## 3. Data Model

### 3.1 SKILL.md Frontmatter Schema (Extended)

```yaml
---
name: audit
description: Security and quality audit
allowed-tools: Read, Grep, Glob, WebFetch, WebSearch  # Claude Code-specific

# NEW: Model-agnostic capability taxonomy (FR-1)
capabilities:
  schema_version: 1                # Flatline IMP-001: versioned taxonomy
  read_files: true
  search_code: true
  write_files: false
  execute_commands:                 # Flatline IMP-003/SKP-004: strict grammar
    allowed: []                    # Empty = no commands allowed
    deny_raw_shell: true
  web_access: true
  user_interaction: false
  agent_spawn: false
  task_management: false

# NEW: Cost profile (FR-3)
cost-profile: moderate  # lightweight | moderate | heavy | unbounded
---
```

**`execute_commands` strict grammar** (Flatline IMP-003/SKP-004):
```yaml
execute_commands:
  allowed:
    - command: "git"
      args: ["diff", "*"]
    - command: "git"
      args: ["log", "*"]
    - command: "bats"
      args: ["tests/*"]
  deny_raw_shell: true    # Adapters MUST NOT evaluate raw shell strings
```

- Commands are tokenized: `command` + `args` — NOT raw shell strings
- Glob `*` only in final argument position
- No shell operators (`|`, `&&`, `;`, `` ` ``), subshells, or variable expansion
- `deny_raw_shell: true` is mandatory — adapters reject untokenized commands

**`capabilities: all` is PROHIBITED** (Flatline SKP-003): Unrestricted skills MUST use explicit expanded map:
```yaml
capabilities:
  schema_version: 1
  read_files: true
  search_code: true
  write_files: true
  execute_commands: true    # boolean true = all commands allowed
  web_access: true
  user_interaction: true
  agent_spawn: true
  task_management: true
```

**Default for missing capabilities: DENY-ALL** (Flatline SKP-001). Unannotated skills get zero capabilities.

### 3.2 Rule File Frontmatter Schema (Extended)

```yaml
---
paths:
  - ".claude/**"
origin: enacted        # genesis | enacted | migrated
enacted_by: cycle-049
version: 1
---
```

### 3.3 Capability-to-Tool Mapping

| Capability | Claude Code Tools | Validation |
|-----------|-------------------|------------|
| `read_files` | `Read` | Bidirectional |
| `search_code` | `Grep`, `Glob` | At least one |
| `write_files` | `Write`, `Edit` | `false` → neither may appear |
| `execute_commands` | `Bash(...)` | Patterns correspond |
| `web_access` | `WebFetch`, `WebSearch` | Bidirectional |
| `user_interaction` | `AskUserQuestion` | Bidirectional |
| `agent_spawn` | `Agent` | Bidirectional |
| `task_management` | `TaskCreate`, `TaskUpdate` | Bidirectional |

**Security invariant:** `capabilities.X: false` + tool in `allowed-tools` = **ERROR**. `capabilities.X: true` + tool NOT in `allowed-tools` = WARNING (promoted to ERROR in `--strict` mode on CI protected branches, per Flatline IMP-002).

### 3.4 Cost Profile Correlation

| Profile | Allowed | Disallowed |
|---------|---------|------------|
| `lightweight` | read_files, search_code, user_interaction | write_files, unrestricted execute_commands, agent_spawn |
| `moderate` | Above + scoped write_files, scoped execute_commands | Unrestricted agent_spawn |
| `heavy` | Most capabilities | None explicit |
| `unbounded` | All | None |

Violations are WARNINGS, not ERRORS.

---

## 4. API Specifications

### 4.1 `validate-skill-capabilities.sh`

```bash
./validate-skill-capabilities.sh [--json] [--strict] [--skill SKILL_NAME]
```
Exit: `0` pass, `1` errors, `2` script error.

### 4.2 `validate-rule-lifecycle.sh`

```bash
./validate-rule-lifecycle.sh [--json]
```
Exit: `0` pass, `1` missing fields.

### 4.3 `detect-platform-features.sh`

```bash
./detect-platform-features.sh [--feature FEATURE_NAME]
```
Output: `.run/platform-features.json`. Cached per session.

### 4.4 Enhanced `implement-gate.sh`

- Source `compat-lib.sh` for `_date_to_epoch()`
- Feature detection at startup → authoritative or heuristic mode
- Path normalization: resolve absolute paths relative to `PROJECT_ROOT`
- Wire into `settings.hooks.json` Write/Edit matchers

---

## 5. Error Handling

| Error | Severity | Behavior |
|-------|----------|----------|
| Missing `capabilities` | ERROR | Fail validation — deny-all default (Flatline SKP-001) |
| capabilities vs allowed-tools mismatch (security) | ERROR | Fail validation |
| capabilities vs allowed-tools mismatch (benign) | ERROR in `--strict` | Promoted from WARNING on CI (Flatline IMP-002) |
| Cost profile correlation mismatch | ERROR in `--strict` | Promoted from WARNING on CI |
| Missing rule lifecycle fields | ERROR | Fail validation |
| Feature detection failure | FAIL-CLOSED | Heuristic mode with audit log (Flatline SKP-006) |
| Hook parse error on App Zone write | FAIL-ASK | Never fail-open |
| Mode downgrade (authoritative → heuristic) | AUDIT | Logged to `.run/audit.jsonl`, no silent degradation |
| `capabilities: all` sentinel detected | ERROR | Must use explicit expanded map (Flatline SKP-003) |
| Raw shell pattern in `execute_commands` | ERROR | Must use tokenized grammar (Flatline SKP-004) |

---

## 6. Testing Strategy

### 6.1 Test Suites

| Suite | File | Tests | Sprint |
|-------|------|-------|--------|
| Skill capabilities | `tests/unit/skill-capabilities.bats` | 10 | 2 |
| Rule lifecycle | `tests/unit/rule-lifecycle.bats` | 4 | 3 |
| Compliance hook (extended) | `tests/unit/compliance-hook.bats` | 7 new | 3 |
| Mount conflicts | `tests/unit/mount-conflicts.bats` | 4 | 4 |
| Integration | `tests/integration/test_skill_metadata.bats` | 5 | 4 |

### 6.2 Canary Test (NFR-2)

**CRITICAL: Sprint 1.** Add `capabilities:` + `cost-profile:` to `enhancing-prompts/SKILL.md`. Verify skill loads. If rejected → fallback to comment metadata.

---

## 7. Development Phases

### Sprint 0: Cross-Repo Issues + Canary (Flatline SKP-001 SDD)
- **Create cross-repo issues BEFORE implementation** (with owners, acceptance criteria, target versions)
- Canary test on enhancing-prompts (add capabilities + cost-profile, verify skill loads)
- If canary fails: HALT and switch to comment-based metadata fallback

### Sprint 1: Foundation — Schema Design + Validation Tooling
- Capability taxonomy (8 categories + versioned schema + strict execute_commands grammar)
- Cost profile schema (4 tiers + deny-by-default for missing)
- `validate-skill-capabilities.sh` with `--strict` mode
- `validate-rule-lifecycle.sh`
- `_date_to_epoch()` in `compat-lib.sh`
- Permissions reference doc
- 14 unit tests (SC-T1 through SC-T10, RL-T1 through RL-T4)

### Sprint 2: Skill Annotation (Two-Wave Rollout, Flatline IMP-006)
- **Wave 1**: Add capabilities + cost-profile to 13 already-annotated skills (low-risk)
- **Wave 2**: Annotate 12 unannotated skills (full frontmatter, explicit expanded maps)
- All 25 skills validated in `--strict` mode
- No `capabilities: all` sentinel — all use expanded maps
- Regression testing between waves

### Sprint 3: Compliance Hook + Rule Lifecycle
- Lifecycle metadata on 3 rule files (origin, version, enacted_by)
- `detect-platform-features.sh` (versioned feature flags, capability handshake)
- `implement-gate.sh` upgrade (dual-mode, mode pinning, trust boundaries, audit logging)
- Path normalization, portable date conversion
- 11 unit tests (CH-T8 through CH-T14, RL-T1 through RL-T4)

### Sprint 4: Mount Conflict Detection + Integration Tests
- `/mount` conflict detection (deterministic algorithm, dry-run output)
- Glob pattern intersection with tie-breaking rules
- Explicit user confirmation on ambiguous merges
- Integration tests (SM-T1 through SM-T5)
- 9 tests (MC-T1 through MC-T5, SM-T1 through SM-T5)

---

## 8. Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Claude Code rejects unknown frontmatter | Canary test Sprint 1; comment metadata fallback |
| capabilities/allowed-tools drift | CI validation; co-located in same file |
| Compliance hook wiring interactions | Test with all hooks active |
| Glob intersection complexity | Prefix matching first; document limitations |

### Zone Constraint Authorization

This cycle modifies System Zone files (`.claude/`). Authorized by PRD cycle-050 per `zone-system.md:L13`.

---

## 9. Skill Annotation Matrix

| Skill | cost-profile | key capabilities |
|-------|-------------|-----------------|
| auditing-security | heavy | read, search, web |
| browsing-constructs | moderate | read, search, execute(scoped) |
| discovering-requirements | moderate | read, search, write, user_interaction |
| enhancing-prompts | lightweight | read, search |
| eval-running | moderate | read, search, execute(scoped) |
| flatline-knowledge | lightweight | read, search |
| managing-credentials | lightweight | read, search, execute(scoped) |
| reviewing-code | moderate | read, search, execute(scoped) |
| riding-codebase | heavy | read, search, write, execute |
| rtfm-testing | moderate | read, search, execute(scoped) |
| translating-for-executives | lightweight | read, search, write |
| autonomous-agent | unbounded | all |
| bridgebuilder-review | heavy | read, search, write, web, agent |
| bug-triaging | heavy | read, search, write, execute, agent |
| butterfreezone-gen | lightweight | read, search, execute(scoped) |
| continuous-learning | moderate | read, search, write |
| deploying-infrastructure | heavy | read, search, write, execute |
| designing-architecture | moderate | read, search, write, agent |
| implementing-tasks | heavy | all except agent_spawn |
| mounting-framework | heavy | read, search, write, execute |
| planning-sprints | moderate | read, search, write, agent |
| red-teaming | heavy | read, search, write, web |
| run-bridge | unbounded | all |
| run-mode | unbounded | all |
| simstim-workflow | unbounded | all |

## 10. File Change Summary

| File | Change | Sprint |
|------|--------|--------|
| `.claude/skills/enhancing-prompts/SKILL.md` | Canary | 1 |
| `.claude/scripts/compat-lib.sh` | Add `_date_to_epoch()` | 1 |
| `.claude/loa/reference/permissions-reference.md` | Create | 1, 4 |
| `.claude/skills/*/SKILL.md` (24) | capabilities + cost-profile | 2 |
| `.claude/scripts/validate-skill-capabilities.sh` | Create | 2 |
| `tests/unit/skill-capabilities.bats` | Create | 2 |
| `.claude/rules/*.md` (3) | Lifecycle frontmatter | 3 |
| `.claude/scripts/validate-rule-lifecycle.sh` | Create | 3 |
| `.claude/scripts/detect-platform-features.sh` | Create | 3 |
| `.claude/hooks/compliance/implement-gate.sh` | Dual-mode upgrade | 3 |
| `tests/unit/compliance-hook.bats` | Extend | 3 |
| `tests/unit/rule-lifecycle.bats` | Create | 3 |
| `.claude/skills/mounting-framework/SKILL.md` | Conflict detection | 4 |
| `tests/unit/mount-conflicts.bats` | Create | 4 |
| `tests/integration/test_skill_metadata.bats` | Create | 4 |
