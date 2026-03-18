# SDD: Upstream Platform Alignment — Claude Code Feature Adoption

**Cycle**: cycle-049
**PRD**: grimoires/loa/prd.md
**Created**: 2026-03-17
**Status**: ACTIVE
**Flatline Review**: 6 HIGH_CONSENSUS integrated, 5 BLOCKERS addressed
**Red Team Review**: 20 attacks analyzed, 7 critical/high findings addressed

## 1. Architecture Overview

Seven additive changes to the Loa framework, organized into three layers:

1. **Skill Layer** (FR-1, FR-2): Frontmatter metadata for 15+ skills — `allowed-tools`, `context: fork`, `name`, `description`
2. **Infrastructure Layer** (FR-3, FR-4, FR-5): Model adapter aliases, path-scoped rules, memory boundary docs
3. **Compliance Layer** (FR-6, FR-7): Agent Teams validation tests, agent-based compliance hook prototype

**Implementation order** (dependency-driven):
1. FR-3 (model aliases) — zero dependencies, standalone
2. FR-5 (memory docs) — zero dependencies, documentation only
3. FR-1 (allowed-tools) — before FR-2 (fork depends on correct tool restrictions)
4. FR-2 (context: fork) — after FR-1 (forked skills need declared tool restrictions)
5. FR-4 (path-scoped rules) — independent, can parallel with FR-1/FR-2
6. FR-6 (Agent Teams tests) — independent, can parallel with FR-4
7. FR-7 (agent hook prototype) — last, depends on understanding from FR-6

## 2. Detailed Design

### 2.1 FR-1: Skill Frontmatter — `allowed-tools`

**Design decision**: Add Claude Code native frontmatter fields (`name`, `description`, `allowed-tools`) alongside existing custom fields (`parallel_threshold`, `timeout_minutes`, `zones`). Do NOT remove existing custom fields — they are consumed by skill logic internally.

**Reference implementation** (`riding-codebase/SKILL.md`):
```yaml
---
name: ride
description: Analyze codebase to extract reality into Loa artifacts
context: fork
agent: Explore
allowed-tools: Read, Grep, Glob, Write, Bash(git *)
---
```

**Frontmatter additions per skill**:

| Skill | `name` | `description` | `allowed-tools` |
|-------|--------|---------------|-----------------|
| `auditing-security` | `audit` | Security and quality audit of application codebase | `Read, Grep, Glob, WebFetch, WebSearch` |
| `reviewing-code` | `review-sprint` | Validate sprint implementation against acceptance criteria | `Read, Grep, Glob, WebFetch, Bash(git diff *), Bash(git log *)` |
| `discovering-requirements` | `plan-and-analyze` | Launch PRD discovery with codebase grounding | `Read, Grep, Glob, AskUserQuestion, WebFetch, Write, Bash(git log *), Bash(wc *)` |
| `rtfm-testing` | `rtfm` | Run documentation-driven testing | `Read, Grep, Glob, Bash(bats tests/*), Bash(npm test *)` |
| `flatline-knowledge` | `flatline-knowledge` | Query Flatline protocol knowledge base | `Read, Grep, Glob` |
| `translating-for-executives` | `translate` | Translate technical docs for executive audience | `Read, Grep, Glob, Write` |
| `enhancing-prompts` | `enhance` | Enhance a prompt for better outputs | `Read, Grep, Glob` |
| `browsing-constructs` | `constructs` | Browse and install construct packs | `Read, Grep, Glob, WebFetch, Bash(gh repo *), Bash(gh release *)` |
| `managing-credentials` | `loa-credentials` | Credential management and audit | `Read, Grep, Glob, Bash(printenv LOA_*)` |
| `eval-running` | `eval` | Execute evaluation runs | `Read, Grep, Glob, Bash(evals/harness/*), Bash(bats tests/*)` |
| `loa` (golden-path) | `loa` | Guided workflow navigation | `Read, Grep, Glob, Bash(.claude/scripts/golden-path.sh *), Bash(.claude/scripts/beads/beads-health.sh *)` |

**Security hardening** (Flatline SKP-003/SKP-006, Red Team ATK-001/ATK-004/ATK-014):
- PROHIBITED: `Bash(git *)`, `Bash(gh *)`, `Bash(.claude/scripts/*)`, bare `Bash`
- All patterns narrowed to specific subcommands or script paths
- `eval-running` changed from bare `Bash` to `Bash(evals/harness/*)` (ATK-004: eliminates only unrestricted shell skill)
- `browsing-constructs` changed from `Bash(gh *)` to `Bash(gh repo *), Bash(gh release *)` (ATK-014: blocks `gh auth token`)
- `managing-credentials` changed from `Bash(printenv *)` to `Bash(printenv LOA_*)` (ATK-003: prevents API key exfiltration)

**Implementation pattern**: For each skill, prepend native fields to existing frontmatter block. Example transformation for `auditing-security/SKILL.md`:

```yaml
# BEFORE
---
parallel_threshold: 2000
audit_categories: 5
timeout_minutes: 60
zones:
  system:
    path: .claude
    permission: none
# ...
---

# AFTER
---
name: audit
description: Security and quality audit of application codebase
allowed-tools: Read, Grep, Glob, WebFetch, WebSearch, Bash(.claude/scripts/*)
parallel_threshold: 2000
audit_categories: 5
timeout_minutes: 60
zones:
  system:
    path: .claude
    permission: none
# ...
---
```

**Tool restriction design principles**:
- Read-only analysis skills: `Read, Grep, Glob` base + domain-specific additions
- Skills needing external data: add `WebFetch` and/or `WebSearch`
- Skills needing shell access: use `Bash(pattern *)` scoped patterns, never bare `Bash`
- Skills that write to grimoires: add `Write` (State Zone writes are expected)
- Skills with `Bash(.claude/scripts/*)`: can invoke framework scripts but not arbitrary commands

**Validation**: After adding frontmatter, invoke each skill and verify it can complete its primary workflow without tool permission errors.

### 2.2 FR-2: Skill Frontmatter — `context: fork`

**Design decision**: Fork skills that produce self-contained outputs and don't need conversation history. Use `agent: Plan` for reasoning-heavy skills, `agent: general-purpose` for skills needing full tool access.

**Critical constraint**: Do NOT fork orchestration skills that manage subagent lifecycles. These skills coordinate multi-step workflows and need conversation continuity:
- `implementing-tasks` — manages beads task lifecycle
- `run-mode` — manages `.run/` state files
- `run-bridge` — orchestrates bridge iterations
- `simstim-workflow` — manages HITL interaction

**Fork additions**:

| Skill | `context` | `agent` | Rationale |
|-------|-----------|---------|-----------|
| `auditing-security` | `fork` | `Explore` | Self-contained audit report; read-only analysis uses Explore for platform-level tool restrictions (Red Team ATK-020) |
| `designing-architecture` | `fork` | `Plan` | Produces SDD; reasoning-heavy; no conversation history needed |
| `planning-sprints` | `fork` | `Plan` | Produces sprint plan; reasoning-heavy |
| `bug-triaging` | `fork` | `general-purpose` | Produces triage handoff; needs full tool access for code investigation |

**Interaction with FR-1**: A forked skill inherits the parent's `allowed-tools` restrictions. The fork creates a subagent that runs the skill prompt with only the declared tools. This means FR-1 must be implemented BEFORE FR-2 — otherwise forked skills get unrestricted tool access.

**Regression testing**: For each forked skill, compare output quality against the skill's most recent unforked execution (from prior cycles). Key check: does the forked skill produce equivalent-quality artifacts (PRD, SDD, sprint plan, audit report)?

### 2.3 FR-3: Model Adapter Backward Compat Aliases

**Design decision**: Add aliases in BOTH `model-adapter.sh.legacy` (4 associative arrays) AND `model-adapter.sh` (MODEL_TO_ALIAS map) for consistency. Use current Opus 4.6 pricing for all backward compat entries.

**New entries in `model-adapter.sh.legacy`**:

```bash
# In MODEL_PROVIDERS (add after ["claude-opus-4.5"]="anthropic"):
["claude-opus-4-5"]="anthropic"    # Hyphenated variant of claude-opus-4.5
["claude-opus-4.1"]="anthropic"    # Legacy → current
["claude-opus-4-1"]="anthropic"    # Legacy hyphenated → current
["claude-opus-4.0"]="anthropic"    # Legacy → current
["claude-opus-4-0"]="anthropic"    # Legacy hyphenated → current

# In MODEL_IDS (same keys, all resolve to claude-opus-4-6):
["claude-opus-4-5"]="claude-opus-4-6"
["claude-opus-4.1"]="claude-opus-4-6"
["claude-opus-4-1"]="claude-opus-4-6"
["claude-opus-4.0"]="claude-opus-4-6"
["claude-opus-4-0"]="claude-opus-4-6"

# In COST_INPUT (same keys, all use current Opus pricing):
["claude-opus-4-5"]="0.005"
["claude-opus-4.1"]="0.005"
["claude-opus-4-1"]="0.005"
["claude-opus-4.0"]="0.005"
["claude-opus-4-0"]="0.005"

# In COST_OUTPUT (same keys):
["claude-opus-4-5"]="0.025"
["claude-opus-4.1"]="0.025"
["claude-opus-4-1"]="0.025"
["claude-opus-4.0"]="0.025"
["claude-opus-4-0"]="0.025"
```

**New entries in `model-adapter.sh` (MODEL_TO_ALIAS)**:
```bash
["claude-opus-4-5"]="anthropic:claude-opus-4-6"
["claude-opus-4.1"]="anthropic:claude-opus-4-6"
["claude-opus-4-1"]="anthropic:claude-opus-4-6"
["claude-opus-4.0"]="anthropic:claude-opus-4-6"
["claude-opus-4-0"]="anthropic:claude-opus-4-6"
```

**Total new entries**: 5 keys × 5 maps = 25 individual entries

**Test**: BATS test in `tests/unit/model-adapter-aliases.bats`:
- Source `model-adapter.sh.legacy` and call `validate_model_registry()`
- Verify each new key resolves correctly in all 4 maps
- Verify existing entries unchanged
- Verify `MODEL_TO_ALIAS` resolves for each new key

### 2.4 FR-4: Path-Scoped Rules via `.claude/rules/`

**Design revision from PRD**: The CLAUDE.loa.md extraction analysis revealed that only ~13% of content is extractable. Most content is constraint-generated (marked `@constraint-generated`) and cannot be moved without refactoring the constraint pipeline. The PRD's >20% reduction target is adjusted to **~13% reduction** with 3 rule files.

**Extractable content**:

| Rule File | Source Lines | Content | Paths Frontmatter |
|-----------|-------------|---------|-------------------|
| `shell-conventions.md` | Lines 44-56 | File Creation Safety (heredoc expansion, Write tool preference) | `paths: ["*.sh", "*.bats"]` |
| `zone-system.md` | Lines 34-42 (System Zone portion) | System Zone NEVER-edit rules, override mechanism | `paths: [".claude/**"]` |
| `zone-state.md` | Lines 34-42 (State Zone) + 220-224 | State Zone paths, memory file locations, configurable paths | `paths: ["grimoires/**", ".beads/**", ".run/**"]` |

**Content that MUST stay in CLAUDE.loa.md**:
- Workflow phases (Golden Path, Truenames): foundational navigation
- Process Compliance (NEVER/ALWAYS/MAY rules): constraint-generated, audit-critical
- Run Mode State Recovery: post-compaction recovery must be immediately visible
- Run Bridge Constraints: autonomous workflow safety
- Post-Merge Automation: constraint-generated pipeline
- Safety Hooks: defense-in-depth reference
- Agent Teams Compatibility: conditional but essential

**Rule file format** (per Claude Code docs):
```markdown
---
paths:
  - "*.sh"
  - "*.bats"
---

# Shell Conventions

[Extracted content here]
```

**CLAUDE.loa.md changes**:
- Remove extracted sections (lines 34-42 zone details, lines 44-56 file creation safety)
- Keep the Three-Zone Model table header with a one-line reference: "See `.claude/rules/zone-*.md` for zone-specific rules"
- Keep "File Creation Safety" as a one-line reference: "See `.claude/rules/shell-conventions.md`"
- Net reduction: ~25 lines out of 294 = **8.5%** (conservative estimate including reference lines)

**Why <20%**: Constraint-generated content (process compliance, merge constraints, bridge constraints, agent teams constraints) comprises ~130 lines and is tightly coupled to the constraint pipeline. Extracting it would require modifying `.claude/data/constraints.json` and all constraint markers — a separate, higher-risk initiative.

### 2.5 FR-5: Memory System Ownership Boundary

**Design decision**: Documentation-only change. Define ownership via a decision table, not code changes.

**Ownership table** (for `memory-reference.md`):

| Scope | System | Storage | Owner |
|-------|--------|---------|-------|
| User preferences | Auto-memory | `~/.claude/projects/.../memory/` | Claude Code |
| Working style | Auto-memory | `~/.claude/projects/.../memory/` | Claude Code |
| Project structure | Auto-memory | `~/.claude/projects/.../memory/` | Claude Code |
| Tooling preferences | Auto-memory | `~/.claude/projects/.../memory/` | Claude Code |
| Framework patterns | observations.jsonl | `grimoires/loa/memory/` | Loa hooks |
| Anti-patterns | observations.jsonl | `grimoires/loa/memory/` | Loa hooks |
| Debugging discoveries | observations.jsonl | `grimoires/loa/memory/` | Loa hooks |
| Cross-session technical context | observations.jsonl | `grimoires/loa/memory/` | Loa hooks |

**Skip-list for `memory-writer.sh`**: Add pattern matching to skip observations that fall into auto-memory scope:
```bash
SKIP_PATTERNS=(
  "user prefer"
  "project structure"
  "working style"
  "tool configuration"
  "IDE setting"
)
```

**File changes**:
- `.claude/loa/reference/memory-reference.md`: Add ownership table and decision flowchart
- `.claude/loa/CLAUDE.loa.md` line 222: Add one-line reference to ownership boundary
- `.claude/hooks/memory-writer.sh`: Add skip-list for auto-memory topics

### 2.6 FR-6: Agent Teams Hook Validation

**Design decision**: Test-only change. Create BATS test suite that validates hook behavior with mocked Agent Teams environment.

**Test file**: `tests/unit/agent-teams-hooks.bats`

**Test structure**:
```bash
# Setup: Create temp dir, mock hook inputs as JSON

@test "block-destructive-bash allows TeammateIdle event passthrough" {
  # TeammateIdle is not a PreToolUse event — it's a separate hook event
  # Safety hooks only fire on PreToolUse:{Bash,Write,Edit,Skill}
  # This test verifies no false positive matching
  echo '{"tool_name":"TeammateIdle","tool_input":{}}' | \
    .claude/hooks/safety/block-destructive-bash.sh
  [[ $? -eq 0 ]]
}

@test "team-role-guard blocks teammate bash when LOA_TEAM_MEMBER set" {
  export LOA_TEAM_MEMBER="teammate-1"
  echo '{"tool_input":{"command":"br create task-1"}}' | \
    .claude/hooks/safety/team-role-guard.sh
  [[ $? -eq 2 ]]  # Blocked
}

@test "team-role-guard allows lead bash without LOA_TEAM_MEMBER" {
  unset LOA_TEAM_MEMBER
  echo '{"tool_input":{"command":"br create task-1"}}' | \
    .claude/hooks/safety/team-role-guard.sh
  [[ $? -eq 0 ]]  # Allowed
}

@test "team-skill-guard blocks teammate planning skills" {
  export LOA_TEAM_MEMBER="teammate-1"
  echo '{"tool_input":{"skill":"plan-and-analyze"}}' | \
    .claude/hooks/safety/team-skill-guard.sh
  [[ $? -eq 2 ]]  # Blocked
}

@test "team-role-guard-write blocks teammate System Zone writes" {
  export LOA_TEAM_MEMBER="teammate-1"
  echo '{"tool_input":{"file_path":".claude/settings.json"}}' | \
    .claude/hooks/safety/team-role-guard-write.sh
  [[ $? -eq 2 ]]  # Blocked
}

@test "team-role-guard-write allows teammate App Zone writes" {
  export LOA_TEAM_MEMBER="teammate-1"
  echo '{"tool_input":{"file_path":"src/index.ts"}}' | \
    .claude/hooks/safety/team-role-guard-write.sh
  [[ $? -eq 0 ]]  # Allowed
}
```

**Documentation update**: Add tested compatibility matrix to `.claude/loa/reference/agent-teams-reference.md`:

| Hook Event | Safety Hook | Result | Tested |
|-----------|------------|--------|--------|
| TeammateIdle | N/A (different event type) | No interference | Yes |
| TaskCompleted | N/A (different event type) | No interference | Yes |
| PreToolUse:Bash | block-destructive-bash | Blocks destructive commands | Yes |
| PreToolUse:Bash | team-role-guard | Blocks teammate br/git | Yes |
| PreToolUse:Write | team-role-guard-write | Blocks teammate System Zone | Yes |
| PreToolUse:Skill | team-skill-guard | Blocks teammate planning | Yes |

### 2.7 FR-7: Agent-Based Compliance Hook (Advisory Prototype)

**Design decision**: Create an advisory agent-type hook that checks whether Write/Edit to App Zone files occurs within an active `/implement` or `/bug` skill invocation. Explicitly labeled as **ADVISORY** — detection relies on heuristic state files, not authoritative platform context (Flatline SKP-002).

**Detection mechanism**: The agent hook subagent checks for active skill context by reading `.run/` state files:
1. Check `.run/sprint-plan-state.json` — if `state: "RUNNING"`, `/implement` is active
2. Check `.run/simstim-state.json` — if `phase: "implementation"`, simstim `/implement` is active
3. Check if any `.beads/` task has `status: "in-progress"` — indicates active implementation

**State file integrity** (Red Team ATK-005): When reading state files, verify:
- File has `plan_id` field matching a known sprint plan
- `timestamps.last_activity` is within last 24 hours (stale state = inactive)
- File permissions are 0600 (owner-only)

**Input safety** (Red Team ATK-007): The file path MUST NOT be template-interpolated into the agent prompt. Instead, the hook writes the file path to a temporary JSON file (`.run/.compliance-check-input.json`) that the subagent reads via the Read tool. This prevents indirect prompt injection via crafted file paths containing LLM instructions.

**Hook configuration** (for `settings.json`):
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "agent",
            "agent": {
              "prompt": "You are an ADVISORY compliance verification agent. Read .run/.compliance-check-input.json to get the file path being written. Then:\n1. If the file is NOT in src/, lib/, or app/ directories → return {\"permissionDecision\": \"allow\"}\n2. If the file IS in an App Zone directory, read .run/sprint-plan-state.json and .run/simstim-state.json. Verify: state is RUNNING, plan_id exists, last_activity is within 24h.\n3. If implementation is active and state is valid → return {\"permissionDecision\": \"allow\"}\n4. If implementation is NOT active, state is invalid, or files are missing → return {\"permissionDecision\": \"ask\", \"message\": \"[ADVISORY] App Zone write detected outside active /implement. State: <describe>. This may bypass review gates.\"}\nNEVER return {\"permissionDecision\": \"allow\"} when state files are missing or unreadable for App Zone writes.",
              "tools": ["Read", "Grep", "Glob"]
            }
          }
        ]
      }
    ]
  }
}
```

**Failure mode** (Flatline SKP-001/SKP-004): **Fail-ask, NOT fail-open** for App Zone writes. This is a compliance hook, not an infrastructure hook. Unverifiable state must prompt the human.

| Error Condition | Non-App-Zone Write | App Zone Write |
|----------------|-------------------|----------------|
| Normal operation | `allow` | Check state → `allow` or `ask` |
| State file missing | `allow` | `ask` (no evidence of active implementation) |
| State file parse error | `allow` | `ask` (unverifiable) |
| Subagent timeout (>5s) | `allow` | `ask` (unverifiable) |
| Subagent crash | `allow` | `ask` (unverifiable) |

**Circuit breaker** (Red Team ATK-013): Cache the last `allow` result keyed by sprint state hash. If the same state produces `allow`, skip re-evaluation for 60 seconds. This prevents token exhaustion from rapid Write/Edit operations during active implementation.

**Scope limitation**: This prototype is ADVISORY only. It does NOT attempt to detect the full skill invocation stack (which would require Claude Code to expose skill context natively). It uses the observable proxy of `.run/` state files, which is imperfect but practical.

**Known limitations**:
- Cannot detect direct `/implement` invocations that don't use `/run` (no state file created) — defaults to `ask`
- Cannot distinguish between lead writes and teammate writes (team-role-guard handles this separately)
- Agent hook API needs verification — `type: "agent"` configuration schema may differ from documented format (Flatline IMP-003). Fallback: implement as command hook that invokes a shell script which delegates to Claude API.

**Test strategy**: BATS test with mocked `.run/` state files:
- State file absent → `ask` (no evidence of active implementation)
- State file with `RUNNING` + valid plan_id + fresh timestamp → `allow`
- State file with `JACKED_OUT` → `ask` (implementation complete)
- State file with `HALTED` → `ask` (implementation paused)
- State file with `RUNNING` but stale timestamp (>24h) → `ask` (stale state)
- State file with tampered content (missing plan_id) → `ask` (integrity check failed)
- File path containing injection payload → `ask` (path read from file, not prompt)

## 3. File Change Summary

| FR | Files Modified | Files Created | Lines Changed (est.) |
|----|---------------|--------------|---------------------|
| FR-1 | 11 SKILL.md files | — | ~33 lines added (3 per skill) |
| FR-2 | 4 SKILL.md files | — | ~8 lines added (2 per skill) |
| FR-3 | model-adapter.sh.legacy, model-adapter.sh | tests/unit/model-adapter-aliases.bats | ~30 lines added |
| FR-4 | CLAUDE.loa.md | .claude/rules/shell-conventions.md, zone-system.md, zone-state.md | ~25 lines moved, 3 new files |
| FR-5 | memory-reference.md, CLAUDE.loa.md, memory-writer.sh | — | ~30 lines added |
| FR-6 | agent-teams-reference.md | tests/unit/agent-teams-hooks.bats | ~60 lines test, 15 lines doc |
| FR-7 | — | .claude/hooks/compliance/implement-gate.json, tests/unit/compliance-hook.bats | ~40 lines hook, 50 lines test |
| **Total** | ~18 files | ~5 new files | ~290 lines |

## 4. Security Considerations

- **System Zone writes**: FR-1, FR-2, FR-4 modify `.claude/skills/` and `.claude/rules/` (System Zone). Must disable team-role-guard-write.sh for lead during implementation or use authorized System Zone override.
- **Agent hook trust boundary**: FR-7's agent hook subagent has read-only access (Read, Grep, Glob). It cannot modify files or execute commands. The `permissionDecision` output is validated by Claude Code, not by the subagent.
- **Model adapter**: FR-3 adds backward compat aliases only. No new model capabilities or cost changes.
- **No credential exposure**: FR-5 clarifies memory boundaries. No credentials are stored in either memory system.

## 5. Testing Strategy

**Design revision** (Flatline SKP-004, IMP-004, IMP-009): Replace manual-only validation with automated tests where feasible. Add integration tests for cross-FR interactions.

| FR | Test Type | Test File | Test Count (est.) |
|----|-----------|-----------|-------------------|
| FR-1 | BATS unit + manual | tests/unit/skill-frontmatter.bats + manual invocation | 14 tests (11 frontmatter validation + 3 negative security) |
| FR-2 | BATS unit + manual | tests/unit/skill-fork.bats + manual quality check | 6 tests (hook inheritance, agent type, output presence) |
| FR-3 | BATS unit | tests/unit/model-adapter-aliases.bats | 10 tests (8 alias + 2 deprecation warning) |
| FR-4 | BATS unit | tests/unit/rules-validation.bats | 5 tests (frontmatter schema, path patterns, no YAML anchors) |
| FR-5 | Manual | Review documentation | 1 review |
| FR-6 | BATS unit | tests/unit/agent-teams-hooks.bats | 8 tests (6 existing + 2 env var unset bypass) |
| FR-7 | BATS unit | tests/unit/compliance-hook.bats | 7 tests (4 state + 2 integrity + 1 injection) |
| Cross-FR | BATS integration | tests/integration/oracle-adoption.bats | 3 tests (FR-1+FR-2 interaction, FR-3 validate, FR-6+FR-7 hook chain) |
| **Total** | | | **54 tests** |

**Negative security tests** (Red Team findings):
- FR-1: Verify `Bash(git log *)` blocks `git -c core.pager=evil log` (ATK-001)
- FR-1: Verify `Bash(gh repo *)` blocks `gh auth token` (ATK-014)
- FR-6: Verify `unset LOA_TEAM_MEMBER && br create` is blocked (ATK-011)
- FR-7: Verify file path with injection payload returns `ask` (ATK-007)

## 6. Risks Revised from PRD

| PRD Risk | SDD Resolution |
|----------|---------------|
| `allowed-tools` too restrictive | Designed tool sets per skill based on actual usage patterns. Scoped Bash patterns (`Bash(git *)`) preserve needed access. |
| `context: fork` changes behavior | Excluded orchestration skills. Only forking self-contained output producers. |
| Path-scoped rules — >20% reduction target | **Revised to ~8.5%**. Constraint-generated content cannot be extracted. 3 rule files created (not 5). |
| Agent-based hooks add latency | Reading 1-2 JSON files with Read tool; <5s achievable. Fail-open default. |
| `.claude/rules/` token double-counting | Extracted content removed from CLAUDE.loa.md; rules only load when matching paths are edited. |
