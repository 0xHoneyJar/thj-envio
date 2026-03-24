@.claude/loa/CLAUDE.loa.md

# Project-Specific Instructions

> This file contains project-specific customizations that take precedence over the framework instructions.
> The framework instructions are loaded via the `@` import above.

## Team & Ownership

- **Primary maintainer**: zerker
- **Repo**: 0xHoneyJar/thj-envio
- **Upstream**: moose-code/thj.git (Envio indexer)

## Project Overview

THJ Envio is a blockchain indexer built with the Envio framework for indexing on-chain events related to The Honey Jar ecosystem on Berachain.

## How This Works

1. Claude Code loads `@.claude/loa/CLAUDE.loa.md` first (framework instructions)
2. Then loads this file (project-specific instructions)
3. Instructions in this file **take precedence** over imported content
4. Framework updates modify `.claude/loa/CLAUDE.loa.md`, not this file

## Related Documentation

- `.claude/loa/CLAUDE.loa.md` - Framework-managed instructions (auto-updated)
- `.loa.config.yaml` - User configuration file
- `PROCESS.md` - Detailed workflow documentation
