# THJ Envio - Claude Code Guide

**Purpose**: Blockchain indexer for THJ ecosystem

## Tech Stack

Envio 2.27.3, TypeScript, Ethers v6, Node v20, pnpm

## Skills

- `envio-patterns` (framework constraints, handler patterns, quest integration)
- `thj-ecosystem-overview` (cross-brand architecture)

## Quick Commands

```bash
pnpm codegen      # After schema changes
pnpm tsc --noEmit
TUI_OFF=true pnpm dev
pnpm deploy
```

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
