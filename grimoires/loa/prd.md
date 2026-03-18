# PRD: Upstream Platform Alignment — Claude Code Feature Adoption

**Cycle**: cycle-049
**Created**: 2026-03-17
**Sources**: Oracle Analysis 2026-03-17, Oracle Analysis 2026-01-29, Skills Audit, Model Adapter Audit, Hooks Infrastructure Audit
**Status**: ACTIVE
**Flatline Review**: Passed — 4 HIGH_CONSENSUS integrated, 5 BLOCKERS addressed, 1 DISPUTED acknowledged
**Red Team Review**: 20 attack scenarios analyzed, 3 CRITICAL addressed

## 1. Problem Statement

Loa v1.39.0 underutilizes Claude Code's platform capabilities. The March 2026 oracle analysis identified 11 concrete gaps where Anthropic provides features that Loa either doesn't use or implements with custom shell scripts instead of native platform primitives.

**Quantified gaps**:
- **Skills**: Only 1/25 (4%) skills declare `allowed-tools` or `context: fork`. 11 skills have zero frontmatter metadata.
- **Model Adapter**: `claude-opus-4-0` and `claude-opus-4-1` are missing from all four associative arrays, causing exit-code-2 failures if any downstream config references them.
- **Hooks**: 5/21 (24%) Claude Code hook events are registered. 15 events including `InstructionsLoaded`, `ConfigChange`, `TaskCompleted`, `TeammateIdle` are unused.
- **Rules**: No `.claude/rules/` directory exists. All instructions load at session start via monolithic CLAUDE.loa.md, regardless of relevance to the current task.
- **Memory**: Two parallel memory systems (`grimoires/loa/memory/observations.jsonl` and `~/.claude/projects/.../memory/`) with undefined ownership boundaries.

> Sources: grimoires/pub/research/anthropic-updates-2026-03-17.md, grimoires/loa/context/oracle-analysis.md (Jan 2026)

## 2. Goals & Success Criteria

| Goal | Metric | Source |
|------|--------|--------|
| All read-only skills declare `allowed-tools` | 11+ skills with frontmatter restricting tool access | Skills Audit |
| Heavy skills run in isolated subagents | 6+ skills with `context: fork` and `agent` type | Skills Audit |
| No model alias gaps cause startup failures | `validate_model_registry()` passes with `claude-opus-4-0`, `claude-opus-4-1`, `claude-opus-4.5` | Model Adapter Audit |
| Path-scoped rules reduce baseline token load | `.claude/rules/` directory with 3+ scoped rule files; CLAUDE.loa.md reduced by >20% | Hooks/Rules Audit |
| Memory ownership clearly defined | Documentation updated, no functional overlap | Memory Audit |
| Agent Teams hooks validated | `TeammateIdle` and `TaskCompleted` tested with Loa safety hooks | Oracle Analysis |
| Agent-based compliance hook prototyped | At least 1 NEVER rule enforced via agent hook instead of shell regex | Oracle Analysis |

## 3. User Context

**Primary persona**: Loa framework operator running development cycles across multiple downstream projects (loa-constructs, loa-finn, loa-hounfour, loa-freeside, loa-dixie).

**Pain points** (from oracle + audits):
- Skills consume full tool access even when read-only, requiring unnecessary HITL permission prompts
- Heavy skills (`/ride`, `/audit`, `/bridgebuilder-review`) bloat the main conversation context
- Shell-based compliance hooks use regex pattern matching, which can't understand code semantics (e.g., can't verify "is this inside an /implement invocation?")
- Every session loads full CLAUDE.loa.md (~260 lines) even when working only on shell scripts or only on TypeScript
- Model adapter failures are opaque when legacy model IDs are used

## 4. Functional Requirements

### FR-1: Skill Frontmatter — `allowed-tools` for Read-Only Skills

**Problem**: 14 skills with analytical/review behavior have no tool restrictions. They can invoke Write, Edit, Bash without constraint, requiring HITL permission prompts even for read-only operations.

**Affected skills** (prioritized by risk):

| Skill | Nature | Recommended `allowed-tools` |
|-------|--------|---------------------------|
| `auditing-security` | Analysis | `Read, Grep, Glob, WebFetch, WebSearch` |
| `reviewing-code` | Analysis | `Read, Grep, Glob, WebFetch, Bash(git log *), Bash(git diff *)` |
| `discovering-requirements` | Interview | `Read, Grep, Glob, AskUserQuestion, WebFetch, Write, Bash(git log *), Bash(wc *)` |
| `rtfm-testing` | Testing | `Read, Grep, Glob, Bash(bats tests/*), Bash(npm test *)` |
| `flatline-knowledge` | Query | `Read, Grep, Glob` |
| `translating-for-executives` | Synthesis | `Read, Grep, Glob, Write` |
| `enhancing-prompts` | Transformation | `Read, Grep, Glob` |
| `browsing-constructs` | Browsing | `Read, Grep, Glob, WebFetch, Bash(gh repo *), Bash(gh release *)` |
| `managing-credentials` | Audit | `Read, Grep, Glob, Bash(printenv LOA_*)` |
| `eval-running` | Execution | `Read, Grep, Glob, Bash(evals/harness/*), Bash(bats tests/*)` |
| `loa` | Status | `Read, Grep, Glob, Bash(.claude/scripts/golden-path.sh *), Bash(.claude/scripts/beads/beads-health.sh *)` |

**Security constraint** (Flatline SKP-003, Red Team ATK-001/ATK-014): `Bash(pattern *)` patterns MUST use specific subcommands, never broad prefixes. `Bash(git *)` is PROHIBITED — use `Bash(git log *), Bash(git diff *)` instead. `Bash(gh *)` is PROHIBITED — use `Bash(gh repo view *), Bash(gh release list *)`. Bare `Bash` is PROHIBITED for all skills (Red Team ATK-004). See risk table for known bypass vectors.

**Fix**:
- Add `allowed-tools` frontmatter to each skill's SKILL.md
- Skills that also need write access (e.g., `translating-for-executives` writes to grimoires) get scoped Bash patterns
- Skills with zero frontmatter also need `name`, `description` fields added

**Rollout strategy** (Flatline SKP-001): Phased canary deployment. Enable `allowed-tools` on 2-3 low-risk skills first (`flatline-knowledge`, `enhancing-prompts`, `loa`), validate across downstream projects, then expand to remaining skills. Rollback: remove `allowed-tools` line from frontmatter to restore unrestricted access.

**Conflict handling** (Flatline IMP-004): When a skill needs a tool not in its `allowed-tools` list, the agent receives a tool permission error. The skill should surface this to the user with guidance to either: (1) override via `/config` for the session, or (2) file a PR to update the skill's `allowed-tools`.

**Acceptance criteria**:
- 11+ skills have `allowed-tools` declared in frontmatter
- Read-only skills cannot invoke Write, Edit, or unrestricted Bash
- No skill uses bare `Bash` — all use subcommand-scoped patterns
- All skills have `name` and `description` frontmatter (prerequisite for Claude Code discovery)
- Existing skill behavior unchanged (tool restrictions don't block legitimate operations)
- Canary skills validated on at least 2 downstream projects before full rollout
- Negative security tests: verify `Bash(git log *)` blocks `git -c core.pager=evil log` patterns

### FR-2: Skill Frontmatter — `context: fork` for Heavy Skills

**Problem**: Long-running skills that produce large outputs run in the main conversation context, consuming tokens from the shared budget. Context compaction during `/ride` (which already uses `context: fork`) demonstrates the pattern works.

**Candidate skills**:

| Skill | Est. Output | Recommended Config |
|-------|------------|-------------------|
| `auditing-security` | Large | `context: fork`, `agent: Explore` |
| `designing-architecture` | Large | `context: fork`, `agent: Plan` |
| `planning-sprints` | Large | `context: fork`, `agent: Plan` |
| `bug-triaging` | Medium | `context: fork`, `agent: general-purpose` |

**Agent type constraint** (Red Team ATK-017, ATK-020): Read-only analysis skills (`auditing-security`) MUST use `agent: Explore`, not `general-purpose`. The `general-purpose` agent type in a forked context creates a "shadow lead" with full tool access that may bypass safety hooks. `Explore` agent type has inherent read-only restrictions at the platform level. Only `bug-triaging` uses `general-purpose` because it needs Write for triage handoff files.

**Hook inheritance prerequisite** (Red Team ATK-017): Before implementing `context: fork`, VERIFY that forked subagent contexts inherit the parent's hook configuration (PreToolUse guards, audit loggers). If they do NOT, restrict all forked skills to `agent: Explore` only. This is a BLOCKING prerequisite — do not fork with `general-purpose` until hook inheritance is confirmed.
| `implementing-tasks` | XLarge | Already orchestrated via `/run`; skip |
| `run-bridge` | XLarge | Already orchestrated via `/run`; skip |

**Fix**:
- Add `context: fork` and appropriate `agent` type to 4+ heavy skills
- Use `agent: Plan` for skills that primarily reason about architecture (architect, sprint-plan)
- Use `agent: general-purpose` for skills that need full tool access (audit, bug)
- Do NOT fork `/implement` or `/run-bridge` — they are orchestration skills that manage subagent lifecycles already

**Rollout strategy** (Flatline SKP-001): Canary on `designing-architecture` (Plan agent, low risk) first. Validate output quality, then expand to remaining skills.

**Acceptance criteria**:
- 4+ heavy skills run in forked subagent context
- Forked skills produce equivalent output to unforked versions — measured by: artifact completeness (all required sections present), acceptance criteria coverage (≥90% of PRD criteria addressed), and no regression in Flatline review scores (Flatline IMP-002)
- Hook inheritance verified for forked contexts (Red Team ATK-017 prerequisite)
- Main conversation context usage measurably reduced after forking (manual verification via `/context`)
- Skills that are orchestration points (`implementing-tasks`, `run-bridge`, `run-mode`, `simstim-workflow`) are NOT forked
- No forked skill uses `agent: general-purpose` unless hook inheritance is confirmed

### FR-3: Model Adapter — Backward Compatibility Aliases

**Problem**: `claude-opus-4-0` and `claude-opus-4-1` are missing from all four associative arrays in `model-adapter.sh.legacy`. Anthropic removed these models from first-party API with auto-migration to 4.6. Any downstream `.loa.config.yaml` referencing these IDs causes `validate_model_registry()` to fail with exit code 2.

**Current state** in `model-adapter.sh.legacy`:
- `claude-opus-4.5` → `claude-opus-4-6` (alias exists)
- `claude-opus-4-0` → **MISSING**
- `claude-opus-4-1` → **MISSING**

**Fix**:
- Add `claude-opus-4-0` and `claude-opus-4-1` entries to all four maps (MODEL_PROVIDERS, MODEL_IDS, COST_INPUT, COST_OUTPUT)
- Both should resolve to `claude-opus-4-6` with current Opus 4.6 pricing
- Also add dot-notation variants (`claude-opus-4.0`, `claude-opus-4.1`) for format consistency
- Also add `claude-opus-4-5` (hyphenated) alongside existing `claude-opus-4.5` (dotted)
- Update `MODEL_TO_ALIAS` map in `model-adapter.sh` (the v2 shim) if applicable

**Alias resolution warning** (Flatline SKP-002): When a deprecated model ID is resolved via alias, emit a one-time stderr warning: `[model-adapter] Warning: claude-opus-4-0 is deprecated, resolved to claude-opus-4-6`. This surfaces the substitution to operators who may not realize their config references a removed model.

**Lookup precedence** (Flatline IMP-005): When both `claude-opus-4.0` (dotted) and `claude-opus-4-0` (hyphenated) exist, the map key is an exact match — no ambiguity. Document that the adapter does NOT perform format normalization; each variant is a distinct key.

**Acceptance criteria**:
- `validate_model_registry()` passes with no exit-code-2 errors
- All four maps have consistent entries for `claude-opus-4-0`, `claude-opus-4-1`, `claude-opus-4.0`, `claude-opus-4.1`, `claude-opus-4-5`
- Existing aliases (`claude-opus-4.5` → `claude-opus-4-6`) remain unchanged
- Deprecated model resolution emits stderr warning (one-time per session)
- BATS test covers all deprecated model ID lookups

### FR-4: Path-Scoped Rules via `.claude/rules/`

**Problem**: CLAUDE.loa.md is ~260 lines loaded into every session regardless of relevance. Shell scripting conventions, TypeScript patterns, security checks, and zone permissions all load at once, consuming baseline context tokens.

**Fix**:
- Create `.claude/rules/` directory with path-scoped rule files
- Extract file-type-specific guidance from CLAUDE.loa.md into scoped rules:

| Rule File | Paths Scope | Content Extracted From |
|-----------|-------------|----------------------|
| `shell-conventions.md` | `*.sh, *.bats` | Shell scripting patterns (POSIX ERE, fail-open, compat-lib) |
| `typescript-conventions.md` | `*.ts, *.tsx, *.js` | TypeScript patterns (dist/ rebuild, config.ts regex) |
| `zone-system.md` | `.claude/**` | System Zone NEVER-edit rules |
| `zone-state.md` | `grimoires/**, .beads/**, .run/**` | State Zone read/write conventions |
| `test-conventions.md` | `tests/**, *.bats, *.test.ts` | Test patterns (BATS isolation, hermetic CLI tests) |

- Reduce CLAUDE.loa.md to framework-level instructions only (workflow phases, golden path, key protocols, compliance rules)
- Each rule file uses `paths:` frontmatter for on-demand loading

**Safety constraint** (Flatline SKP-005): Critical safeguards (NEVER rules, process compliance, zone model summary) MUST remain in CLAUDE.loa.md for always-on loading. Only file-type-specific conventions (shell heredocs, zone detail) are extractable. The SDD analysis confirmed only ~8.5% extraction is achievable (revised from >20%).

**Acceptance criteria**:
- `.claude/rules/` directory exists with 3+ path-scoped rule files (revised from 5 per SDD analysis)
- Each rule file has valid `paths:` frontmatter with glob patterns
- CLAUDE.loa.md reduced by ~8.5% (~25 lines extracted, with 1-line references replacing them)
- All NEVER/ALWAYS/MAY compliance rules remain in CLAUDE.loa.md (not extracted)
- Rules load on-demand (verified by checking `/context` with different file types active)
- No behavioral regression — same guidance available when working on matching file types
- Rule file frontmatter validated against strict schema (no YAML anchors/aliases — Red Team ATK-016)

### FR-5: Memory System Ownership Boundary

**Problem**: Loa has two memory systems that could diverge:
1. **Framework memory**: `grimoires/loa/memory/observations.jsonl` — session-spanning observations, queried via `memory-query.sh`
2. **Auto-memory**: `~/.claude/projects/.../memory/MEMORY.md` — Claude Code native auto-memory with markdown index

**Fix**:
- Document clear ownership boundaries in `.claude/loa/reference/memory-reference.md`:
  - **Auto-memory** (Claude Code native): User preferences, working style, project structure knowledge, tooling preferences. Managed by Claude Code automatically.
  - **Framework memory** (observations.jsonl): Framework-level learnings (patterns, anti-patterns, debugging discoveries), cross-session technical context. Managed by Loa hooks.
- Add a note to CLAUDE.loa.md memory section clarifying the boundary
- Ensure `memory-writer.sh` hook does NOT write observations that overlap with auto-memory scope (user preferences, project structure)

**Acceptance criteria**:
- `memory-reference.md` updated with clear ownership table
- CLAUDE.loa.md memory section references the boundary
- `memory-writer.sh` has skip-list for auto-memory topics (project structure, user preferences)
- No duplicate content between observations.jsonl and auto-memory MEMORY.md

### FR-6: Agent Teams Hook Validation

**Problem**: Loa v1.39.0 added Agent Teams compatibility (C-TEAM-001 through C-TEAM-005) but hasn't validated against Claude Code's `TeammateIdle` and `TaskCompleted` hook events. The safety hooks (`team-role-guard.sh`, `team-skill-guard.sh`) need to confirm they don't interfere with these upstream events.

**Fix**:
- Create BATS test file `tests/unit/agent-teams-hooks.bats` that validates:
  - Safety hooks pass through `TeammateIdle` events (don't block)
  - Safety hooks pass through `TaskCompleted` events (don't block)
  - Team role guards correctly block teammate operations under `LOA_TEAM_MEMBER=true`
  - Team role guards allow lead operations without `LOA_TEAM_MEMBER`
- Document tested compatibility in `.claude/loa/reference/agent-teams-reference.md`

**Acceptance criteria**:
- BATS test suite for Agent Teams hook interactions exists and passes
- `TeammateIdle` and `TaskCompleted` events don't trigger false blocks
- Safety hooks remain functional with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`
- Reference doc updated with tested compatibility matrix
- Test covers `LOA_TEAM_MEMBER` environment variable unset bypass (Red Team ATK-011): verify `unset LOA_TEAM_MEMBER && br create` and `env -u LOA_TEAM_MEMBER git push` are blocked

### FR-7: Agent-Based Compliance Hook (Advisory Prototype)

**Problem**: Loa's NEVER rules (e.g., "NEVER write application code outside of `/implement` skill invocation") are enforced via shell hooks using regex pattern matching. These can't understand semantic context — they can't verify whether code is being written inside an `/implement` skill invocation or not.

**Scope clarification** (Flatline SKP-002, Red Team ATK-005/ATK-006): This prototype is **advisory-only**, not enforcement. Detection relies on heuristic `.run/` state files, not authoritative skill execution context (which Claude Code does not expose). The hook is explicitly labeled as ADVISORY in its output messages and documentation.

**Fix**:
- Create ONE prototype agent-based hook that enforces a single NEVER rule
- Target rule: "NEVER write application code outside of `/implement`" — the highest-impact compliance check
- Hook type: `agent` (spawns verification subagent with Read, Grep, Glob access)
- Subagent checks: Is an `/implement` or `/bug` skill currently active? Is the write target in the App Zone?
- **Failure mode** (Flatline SKP-004): On hook errors (timeout, parse failure, subagent crash), default to `ask` (NOT `allow`) for App Zone writes. Fail-open is wrong for compliance hooks — unverifiable state should prompt the human, not silently allow.
- **Input safety** (Red Team ATK-007): File path MUST NOT be template-interpolated into the agent prompt. Pass file path via structured JSON tool input that the subagent reads with the Read tool. This prevents indirect prompt injection via crafted file paths.
- If compliance check fails: return `permissionDecision: "ask"` (soft block with explanation, not hard deny)
- Document the pattern for future agent-hook migrations

**Acceptance criteria**:
- Agent-based hook defined in settings configuration (labeled ADVISORY)
- Hook fires on Write/Edit to App Zone paths (e.g., `src/`, `lib/`, `app/`)
- Subagent reads file path from structured input, NOT from template interpolation
- Returns `ask` (not `deny`) on compliance violation — human can override
- Returns `ask` (not `allow`) on hook errors — fail-ask for compliance hooks
- Hook runs in <5 seconds (agent hooks are blocking)
- Circuit breaker: after 3 consecutive `allow` results for same sprint state, cache result for 60s
- BATS test validates hook behavior with mocked skill context
- Negative tests: state file tampering (Red Team ATK-005), file path with injection payload (ATK-007), missing state files return `ask` not `allow` (ATK-006)
- Pattern documented as ADVISORY for replication to other NEVER rules

## 5. Technical & Non-Functional

- **System Zone writes required**: FR-1, FR-2, FR-4, FR-7 modify `.claude/` files. Safety hooks must account for authorized System Zone writes.
- **No new runtime dependencies**: All changes use existing Claude Code primitives (frontmatter, rules, hook types)
- **Backward compatibility**: All changes are additive. Existing behavior preserved for skills, hooks, and model adapter.
- **Cross-platform**: Shell changes (FR-3, FR-6, FR-7) must work on macOS and Linux
- **Testing**: Each FR includes BATS or integration tests. New tests must be runnable in isolation.
- **Token budget**: FR-4 (path-scoped rules) should measurably reduce baseline context consumption. Verify via `/context` command before and after.

## 6. Scope

### In scope (P1 + P2)
- FR-1: `allowed-tools` for 11+ read-only skills
- FR-2: `context: fork` for 4+ heavy skills
- FR-3: Model adapter backward compat aliases (6+ new entries)
- FR-4: Path-scoped `.claude/rules/` directory (5+ rule files)
- FR-5: Memory system ownership documentation
- FR-6: Agent Teams hook validation (BATS tests)
- FR-7: Agent-based compliance hook prototype (1 rule)

### Out of scope (P3 — Future Considerations)

These items are documented for strategic planning but will NOT be sprint-planned in this cycle:

| Item | Rationale for Deferral | Estimated Effort |
|------|----------------------|-----------------|
| **Plugin distribution for constructs** | Requires architecture decision on construct packaging format. Plugin API may still evolve. | High |
| **HTTP hooks for audit trail** | No external observability system configured yet. Value depends on deployment platform. | Medium |
| **Native scheduled tasks** | GitHub Actions cron works. Migration adds complexity without clear benefit. | Low |
| **`modelOverrides` as model-adapter replacement** | model-adapter.sh serves the Flatline routing use case that `modelOverrides` doesn't cover. | Medium |
| **Additional hook events** (InstructionsLoaded, ConfigChange, etc.) | No immediate use case beyond audit logging. Evaluate when external observability exists. | Low |

## 7. Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `allowed-tools` may be too restrictive, blocking legitimate skill operations | Phased canary rollout on 2-3 low-risk skills first. Rollback by removing `allowed-tools` line. |
| `Bash(pattern *)` patterns may be bypassable via shell metacharacters, git -c flags, or argument injection (Red Team ATK-001, ATK-002, ATK-014) | Use specific subcommands (`Bash(git log *)` not `Bash(git *)`). Add negative security tests for known bypass vectors. Treat pattern-based restrictions as defense-in-depth, not sole enforcement. |
| `context: fork` changes skill behavior (no access to conversation history) | Regression test with measurable thresholds. Canary on 1 skill first. |
| Forked contexts may not inherit hook configurations (Red Team ATK-017) | BLOCKING prerequisite: verify hook inheritance before forking any `general-purpose` skills. If not inherited, restrict to `Explore` agent type. |
| Path-scoped rules may not trigger for complex multi-file operations | Keep all critical safeguards in CLAUDE.loa.md. Rules are supplementary context, not exclusive. |
| Agent-based compliance hook relies on heuristic state files, not authoritative context (Flatline SKP-002, Red Team ATK-005) | Label as ADVISORY. Fail to `ask` (not `allow`) on errors. Add state file integrity checks. |
| Agent hook prompt injection via user-controlled file paths (Red Team ATK-007) | Never template-interpolate file paths into agent prompts. Use structured JSON input. |
| `LOA_TEAM_MEMBER` env var can be unset to bypass all team guards (Red Team ATK-011) | Block `unset LOA_TEAM_MEMBER` and `env -u` patterns in team-role-guard. |
| Cycle-048 may introduce changes that conflict with FR-1/FR-2 frontmatter | Minimal overlap — cycle-048 touches review scripts, this cycle touches skill frontmatter. |
| `.claude/rules/` interacts with CLAUDE.md loading — possible token double-counting | Verify via `/context` that extracted rules don't load alongside CLAUDE.loa.md references |

## 8. Dependency on Cycle-048

This PRD is **queued** behind cycle-048 ("Community Feedback — Review Pipeline Hardening"). Cycle-048 fixes real user-reported bugs in the review pipeline. Implementation of this PRD begins after cycle-048 is archived.

**No blocking dependencies**: The oracle findings are independent of cycle-048's review pipeline fixes. The only shared surface is `.claude/scripts/` System Zone, and the changes don't overlap (cycle-048 touches review scripts, this cycle touches skill frontmatter and rules).

## 9. Quality Gate Review Log

### Flatline PRD Review (2026-03-17)
**Reviewers**: Opus + GPT-5.3-codex + Gemini 2.5 Pro (3-model)
**HIGH_CONSENSUS (4)**: IMP-001 (rollback steps), IMP-002 (dependency ordering), IMP-003 (measurable criteria), IMP-004 (conflict handling) — all integrated
**DISPUTED (1)**: IMP-005 (FR-7 feasibility without platform context signal) — acknowledged, FR-7 scoped as advisory
**BLOCKERS (5)**: SKP-001 (phased rollout), SKP-002 (model alias behavior), SKP-003 (Bash pattern security), SKP-004 (FR-7 failure modes), SKP-005 (rules extraction safety) — all addressed

### Flatline SDD Review (2026-03-17)
**Reviewers**: Opus + GPT-5.3-codex + Gemini 2.5 Pro (3-model)
**HIGH_CONSENSUS (6)**: All integrated into SDD
**BLOCKERS (5)**: SKP-001 (fail-open→fail-ask), SKP-002 (heuristic detection→advisory), SKP-003 (eval bare Bash), SKP-004 (automated tests), SKP-006 (broad patterns) — all addressed

### Red Team Analysis (2026-03-18)
**Mode**: Manual (20 attack scenarios, Severity 4-9)
**CRITICAL (3)**: ATK-004 (eval bare Bash→scoped), ATK-007 (prompt injection→structured input), ATK-017 (fork hook inheritance→blocking prerequisite)
**HIGH (4)**: ATK-001 (git -c→specific subcommands), ATK-005 (state tampering→integrity checks), ATK-011 (env unset→blocked), ATK-014 (gh auth→scoped)

## 10. Oracle Source References

| Finding | Oracle Report | Section |
|---------|--------------|---------|
| Skills `allowed-tools` gap | 2026-03-17 | Best Practices §1 |
| Skills `context: fork` gap | 2026-03-17 | Best Practices §2, also identified 2026-01-29 §Feature 4 |
| Model adapter aliases | 2026-03-17 | Deprecations — Opus 4.0/4.1 |
| Path-scoped rules | 2026-03-17 | Best Practices §3, Gaps Analysis |
| Memory reconciliation | 2026-03-17 | Gaps Analysis |
| Agent Teams hooks | 2026-03-17 | Priority 1 §1 |
| Agent-based hooks | 2026-03-17 | Priority 2 §4, Gaps Analysis |
