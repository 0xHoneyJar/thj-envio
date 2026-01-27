# THJ Envio - Claude Code Guide

**Purpose**: Blockchain indexer for THJ ecosystem - single source of truth for CubQuests, Score API, and Set&Forgetti apps.

## Tech Stack

Envio 2.32.2, TypeScript 5.2.2, Ethers v6, Node v20, pnpm

## Production

**GraphQL Endpoint**: https://indexer.hyperindex.xyz/914708e/v1/graphql

## Quick Commands

```bash
pnpm codegen           # After schema/config changes
pnpm tsc --noEmit      # Type check
TUI_OFF=true pnpm dev  # Local development (TUI_OFF required)
pnpm deploy            # Deploy to HyperIndex
```

## Fast Testing

Use targeted block ranges for quick validation (~30 seconds vs hours):
```bash
# Copy test config and run
cp config.test-rebate.yaml config.yaml
TUI_OFF=true pnpm dev
```
See `FAST_TESTING_GUIDE.md` for details.

## Key Documentation

| Document | Purpose |
|----------|---------|
| `grimoires/loa/HANDLER_REGISTRY.md` | Contract → Handler → Entity mapping |
| `grimoires/loa/ENTITY_REFERENCE.md` | GraphQL entity quick reference |
| `grimoires/loa/sdd.md` | System architecture |
| `grimoires/loa/prd.md` | Product requirements |
| `FAST_TESTING_GUIDE.md` | Fast testing with block ranges |

## Skills

- `envio-patterns` (framework constraints, handler patterns, quest integration)
- `thj-ecosystem-overview` (cross-brand architecture)

**For Envio patterns**: Use `envio-patterns` skill (immutability, indexed actions, etc.).

---

# Loa Framework

Agent-driven development framework with 9 specialized AI agents (skills).

## Three-Zone Model

| Zone | Path | Owner | Permission |
|------|------|-------|------------|
| **System** | `.claude/` | Framework | NEVER edit directly |
| **State** | `grimoires/`, `.beads/` | Project | Read/Write |
| **App** | `src/`, `lib/`, `app/` | Developer | Read (write requires confirmation) |

**Critical**: System Zone is synthesized. Never suggest edits to `.claude/` - direct users to `.claude/overrides/` or `.loa.config.yaml`.

## Workflow Commands

| Phase | Command | Agent | Output |
|-------|---------|-------|--------|
| 1 | `/plan-and-analyze` | discovering-requirements | `prd.md` |
| 2 | `/architect` | designing-architecture | `sdd.md` |
| 3 | `/sprint-plan` | planning-sprints | `sprint.md` |
| 4 | `/implement sprint-N` | implementing-tasks | Code + report |
| 5 | `/review-sprint sprint-N` | reviewing-code | Feedback |
| 5.5 | `/audit-sprint sprint-N` | auditing-security | Security feedback |
| 6 | `/deploy-production` | deploying-infrastructure | Infrastructure |

### Automatic Codebase Grounding (v1.6.0)

`/plan-and-analyze` now automatically detects brownfield projects and runs `/ride` before PRD creation.

**Guided Workflow**: `/loa` - Shows current state and suggests next command

**Ad-hoc**: `/audit`, `/audit-deployment`, `/translate`, `/contribute`, `/update-loa`, `/validate`

**Run Mode**: `/run sprint-N`, `/run sprint-plan`, `/run-status`, `/run-halt`, `/run-resume`

## Key Protocols

### Structured Agentic Memory

Agents maintain persistent working memory in `grimoires/loa/NOTES.md`.

### Goal Traceability (v1.7.0)

Prevents silent goal failures by mapping PRD goals through sprint tasks to validation.

## Key Conventions

- **Never skip phases** - each builds on previous
- **Never edit .claude/ directly** - use overrides or config
- **Review all outputs** - you're the final decision-maker
- **Security first** - especially for crypto projects

## Related Files

- `README.md` - Quick start guide
- `.claude/protocols/` - Protocol specifications
- `.loa.config.yaml` - User configuration
