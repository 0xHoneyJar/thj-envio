# THJ Envio Indexer Standards

*This document defines standards for THJ blockchain indexers using Envio HyperIndex.*

## 🎯 Quick Reference

```bash
# After schema/config changes
pnpm codegen

# Type check
pnpm tsc --noEmit

# Run locally
TUI_OFF=true pnpm dev

# Deploy
pnpm deploy
```

## 🏗️ Architecture

### Modular Handler Pattern

Organize event handlers into focused modules for maintainability:

```
src/
├── EventHandlers.ts          # Main entry point (imports all handlers)
├── handlers/
│   ├── constants.ts          # Shared constants and mappings
│   ├── henlo-burns.ts        # Henlo burn tracking
│   ├── honey-jar-nfts.ts     # NFT transfers and ownership
│   └── moneycomb-vault.ts    # Vault operations
```

### Handler Module Structure

Each handler module should:
1. Import only necessary types from "generated"
2. Export individual handlers with contract binding
3. Use shared constants from `constants.ts`
4. Follow immutable update patterns

Example:
```typescript
import { HenloToken, HenloBurn } from "generated";

export const handleHenloBurn = HenloToken.Transfer.handler(
  async ({ event, context }) => {
    // Handler logic
  }
);
```

## ⚠️ Critical Patterns

### 1. No Complex Queries in Handlers (CRITICAL)

**❌ NEVER use getMany, getManyByIds, or complex queries:**
```typescript
// THIS WILL FAIL - Envio doesn't support these
const holders = await context.Holder.getMany({
  where: { balance: { gt: 0 } }
});
```

**✅ INSTEAD use individual get operations or maintain running totals:**
```typescript
// Get individual entities by ID
const holder = await context.Holder.get(holderId);

// Or maintain aggregates incrementally
const stats = await context.Stats.get("global");
const updated = {
  ...stats,
  totalHolders: stats.totalHolders + 1,
};
```

### 2. Immutable Entity Updates (REQUIRED)

**❌ NEVER mutate entities directly:**
```typescript
// THIS WILL FAIL - entities are read-only
stats.totalBurned = stats.totalBurned + amount;
```

**✅ ALWAYS use spread operator:**
```typescript
const updatedStats = {
  ...stats,
  totalBurned: stats.totalBurned + amount,
  lastUpdateTime: timestamp,
};
context.HenloBurnStats.set(updatedStats);
```

### 2. Entity Relationships

Use `_id` fields, not direct object references:

```typescript
// ✅ Correct
type VaultActivity {
  user_id: String!  // Reference by ID
  vault_id: String!
}

// ❌ Wrong - Envio doesn't support this
type VaultActivity {
  user: User!       // Direct reference
  vault: Vault!
}
```

### 3. Timestamp Handling

Always cast to BigInt:
```typescript
const timestamp = BigInt(event.block.timestamp);
```

### 4. Address Normalization

Always lowercase addresses for consistency:
```typescript
const userAddress = event.params.user.toLowerCase();
```

## 📊 Schema Best Practices

### DO:
- Use singular entity names: `HenloBurn` not `HenloBurns`
- Use `_id` suffix for relationships
- Cast all numeric fields to `BigInt!`
- Use `String!` for addresses
- Add comments for complex fields

### DON'T:
- Use arrays of entities: `[User!]!` (not supported)
- Add `@entity` decorator (not needed)
- Use time-series aggregation fields like `dailyVolume`
- Use `null` - prefer `undefined` for optional fields

### Example Schema:
```graphql
type HenloBurn {
  id: ID!  # tx_hash_logIndex
  amount: BigInt!
  timestamp: BigInt!
  from: String!  # Address (lowercase)
  source: String!  # "incinerator", "user", etc.
  chainId: Int!
}

type HenloBurnStats {
  id: ID!  # chainId_source
  chainId: Int!
  source: String!
  totalBurned: BigInt!
  burnCount: Int!
  lastBurnTime: BigInt  # Optional field - no !
}
```

## 🔧 Configuration

### Event Filtering

Filter events at config level for efficiency:
```yaml
- name: HenloToken
  handler: src/EventHandlers.ts
  events:
    # Only track burns (transfers to zero address)
    - event: Transfer(address indexed from, address indexed to, uint256 value)
      field_selection:
        transaction_fields:
          - hash  # Required if using event.transaction.hash
```

### Network Configuration

```yaml
networks:
  # Berachain Mainnet
  - id: 80084
    start_block: 7399624  # Block where tracking starts
    contracts:
      - name: HenloToken
        address:
          - 0xb2F776e9c1C926C4b2e54182Fac058dA9Af0B6A5
```

## 🚀 Development Workflow

### 1. Schema Changes
```bash
# 1. Edit schema.graphql
# 2. Regenerate types
pnpm codegen
# 3. Update handlers for new types
# 4. Type check
pnpm tsc --noEmit
```

### 2. Adding New Handlers

Create new module in `src/handlers/`:
```typescript
// src/handlers/new-feature.ts
import { Contract, Entity } from "generated";
import { CONSTANTS } from "./constants";

export const handleNewEvent = Contract.Event.handler(
  async ({ event, context }) => {
    // Always use immutable updates
    const entity = {
      id: `${event.transaction.hash}_${event.logIndex}`,
      // ... fields
    };
    context.Entity.set(entity);
  }
);
```

Add to main EventHandlers.ts:
```typescript
import { handleNewEvent } from "./handlers/new-feature";
export { handleNewEvent };
```

### 3. External API Calls

Use Effect API for external calls (with preload optimization):
```typescript
import { S, experimental_createEffect } from "envio";

export const fetchPrice = experimental_createEffect(
  {
    name: "fetchPrice",
    input: { token: S.string, blockNumber: S.number },
    output: S.union([S.number, null]),
  },
  async ({ input, context }) => {
    const response = await fetch(`https://api.example.com/price/${input.token}`);
    return response.json();
  }
);

// In handler
const price = await context.effect(fetchPrice, {
  token: "HENLO",
  blockNumber: event.block.number,
});
```

## 🐛 Common Issues & Solutions

### Issue: "Cannot assign to X because it is a read-only property"
**Solution**: Use spread operator for immutable updates

### Issue: Type errors after schema changes
**Solution**: Run `pnpm codegen` then restart TypeScript server

### Issue: Missing transaction hash
**Solution**: Add to field_selection in config.yaml:
```yaml
field_selection:
  transaction_fields:
    - hash
```

### Issue: Entity not found after creation
**Solution**: Ensure IDs are consistent and use string type

## 📊 Indexed Action Field Semantics

### numeric1 (Primary Quantity)

Maps to the primary quantity/amount for each action type:

| Action Type | numeric1 Meaning | Example |
|-------------|------------------|---------|
| mint | Always 1 (ERC721) | 1n |
| mint1155 | Quantity minted | 3n (minted 3 tokens) |
| swap | Input token amount | 1000000n |
| deposit | Deposited amount | 500000n |
| burn | Burned amount | 100n |
| stake | Staked amount | 250n |
| delegate | Delegated amount | 1000000000000000000n (1 BGT) |

### numeric2 (Secondary Metric)

Optional secondary value (less commonly used):

| Action Type | numeric2 Meaning | Example |
|-------------|------------------|---------|
| swap | Output amount | 2000000n |
| deposit | USD value | 15000n (cents) |

### Quest Integration

CubQuests verification goals reference these fields:

```typescript
// Count separate transactions
goal: {
  type: "event_count",
  minimum: 3,
}

// Sum total quantity minted (numeric1)
goal: {
  type: "quantity_sum",
  field: "numeric1",
  minimum: 3,
}

// Sum total amount burned (numeric1, large wei values)
goal: {
  type: "quantity_sum",
  field: "numeric1",
  minimum: 50000000000000000000000,  // 10000 HENLO
}
```

**Always use consistent field semantics across handlers** to ensure quest verification works correctly.

## 📈 THJ-Specific Patterns

### Burn Source Tracking
```typescript
const BURN_SOURCES: Record<string, string> = {
  "0xde81b20b6801d99efaeaced48a11ba025180b8cc": "incinerator",
  // Add other sources as deployed
};

const source = BURN_SOURCES[from.toLowerCase()] || "user";
```

### Multi-Chain Support
```typescript
const CHAIN_IDS = {
  ETHEREUM: 1,
  BERACHAIN_MAINNET: 80084,
  BERACHAIN_TESTNET: 80094,  // Bartio
} as const;
```

### Cross-Product Data Aggregation
```typescript
// Use global stats entities for ecosystem-wide metrics
type GlobalStats {
  id: ID!  # "global" for singleton
  totalValueLocked: BigInt!
  totalUsers: Int!
  lastUpdateTime: BigInt!
}
```

## 📝 Testing Checklist

Before deploying any indexer changes:

- [ ] Schema changes? Run `pnpm codegen`
- [ ] All entities use immutable updates?
- [ ] Type check passes? `pnpm tsc --noEmit`
- [ ] Local test runs? `TUI_OFF=true pnpm dev`
- [ ] Transaction fields configured if needed?
- [ ] Addresses normalized to lowercase?
- [ ] Timestamps cast to BigInt?
- [ ] No direct entity mutations?

## 🔗 Resources

- [Envio Documentation](https://docs.envio.dev/docs/HyperIndex-LLM/hyperindex-complete)
- [Example: Uniswap v4 Indexer](https://github.com/enviodev/uniswap-v4-indexer)
- [Example: Safe Indexer](https://github.com/enviodev/safe-analysis-indexer)
- [THJ Universal Standards](../../../CLAUDE.md)

## 🚨 Important Notes

1. **Package Manager**: Use `pnpm` for Envio projects (not bun)
2. **Node Version**: Requires Node.js v20 exactly
3. **Docker**: Required for local development
4. **Preload Optimization**: Add `preload_handlers: true` to config.yaml
5. **Entity Arrays**: Not supported - use relationship IDs instead

---

*This document is specific to THJ Envio indexers. For general THJ standards, see the root CLAUDE.md.*