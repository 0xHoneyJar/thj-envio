# THJ Envio Indexer - Claude Code Guide

## Tech Stack

- Envio HyperIndex 2.27.3
- TypeScript 5.x
- viem 2.21 (RPC client in sf-vaults.ts)
- ethers 6.15 (ABI decoding in bgt.ts)
- Node.js v20
- pnpm

> Note: Both viem and ethers are used - viem for RPC calls, ethers for ABI utilities.

## Handler Structure

```
src/
├── EventHandlers.ts      # Main entry - imports/exports all handlers
├── handlers/             # 37 domain-specific handler modules
│   ├── sf-vaults.ts      # Set & Forgetti (30k lines, most complex)
│   ├── henlo-vault.ts    # Henlocker vault system
│   ├── tracked-erc20.ts  # Token balance + burn tracking
│   ├── badges1155.ts     # CubQuests badges
│   ├── mibera-*.ts       # Mibera ecosystem handlers
│   └── ...
└── lib/
    └── actions.ts        # Action recording for quest verification
```

## Key Patterns

**Entity IDs**: `{chainId}_{address}_{tokenId}` for global uniqueness

**Stateful entities** (positions, balances):
```typescript
const existing = await context.Entity.get(id);
const updated = { ...existing, field: newValue };
context.Entity.set(updated);
```

**Immutable entities** (events, logs):
```typescript
const event = { id: `${txHash}_${logIndex}`, ...fields };
context.Entity.set(event);
```

## Commands

```bash
pnpm codegen       # After schema/config changes
pnpm tsc --noEmit  # Type check
TUI_OFF=true pnpm dev  # Run locally (disable TUI)
pnpm deploy        # Deploy to Envio hosted
```

## Key Files

| File | Purpose |
|------|---------|
| `config.yaml` | Contract registry (40+ contracts, 6 chains) |
| `schema.graphql` | Entity definitions (60+ types) |
| `src/EventHandlers.ts` | Handler orchestration |

## Documentation

See `loa-grimoire/` for comprehensive documentation:
- `prd.md` - Product requirements
- `sdd.md` - Software design
- `reality/` - Handler patterns and entity relationships
