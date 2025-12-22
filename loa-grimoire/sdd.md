# Software Design Document: THJ Envio Indexer

**Extracted from**: `thj-envio` codebase
**Adoption date**: 2025-12-21
**Status**: CODE-GROUNDED (extracted from running production code)

---

## 1. Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        config.yaml                              │
│           (Contract Registry + Event Definitions)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Envio HyperIndex                            │
│  (Multi-chain event listener + PostgreSQL store)                │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌──────────┐    ┌──────────┐    ┌──────────┐
       │  Chain 1 │    │  Chain 2 │    │  Chain N │
       │   RPC    │    │   RPC    │    │   RPC    │
       └──────────┘    └──────────┘    └──────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EventHandlers.ts                              │
│               (Handler Orchestration Layer)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │ handlers/   │     │ handlers/   │     │ handlers/   │
  │ sf-vaults   │     │ henlo-vault │     │ mibera-*    │
  └─────────────┘     └─────────────┘     └─────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    schema.graphql                               │
│               (Entity Definitions → PostgreSQL)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     GraphQL API                                 │
│                   (Auto-generated)                              │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Envio HyperIndex | 2.27.3 |
| Language | TypeScript | 5.x |
| Runtime | Node.js | 20.x |
| Package Manager | pnpm | 8+ |
| Blockchain | viem | v6 |
| Database | PostgreSQL | (managed by Envio) |

---

## 2. File Structure

```
thj-envio/
├── config.yaml              # Contract registry + event bindings
├── schema.graphql           # Entity definitions (60+ types)
├── src/
│   ├── EventHandlers.ts     # Main entry point (imports/exports)
│   ├── SFVaultHandlers.ts   # Isolated S&F testing entry
│   ├── handlers/            # Domain-specific handlers (37 files)
│   │   ├── constants.ts     # Shared constants
│   │   ├── sf-vaults.ts     # S&F vault handlers
│   │   ├── henlo-vault.ts   # HenloVault handlers
│   │   ├── tracked-erc20.ts # Token balance tracking
│   │   ├── tracked-erc721.ts# NFT holder tracking
│   │   ├── mibera-*.ts      # Mibera ecosystem handlers
│   │   └── ...              # Other domain handlers
│   └── lib/
│       └── actions.ts       # Action recording utility
├── scripts/                 # Utility scripts
└── package.json
```

---

## 3. Handler Patterns

### 3.1 Standard Handler Pattern

```typescript
import { ContractName, EntityType } from "generated";

export const handleEventName = ContractName.EventName.handler(
  async ({ event, context }) => {
    // 1. Extract event parameters
    const { param1, param2 } = event.params;
    const timestamp = BigInt(event.block.timestamp);
    const chainId = event.chainId;

    // 2. Build entity ID (globally unique)
    const id = `${chainId}_${address}_${tokenId}`;

    // 3. Get or create entity
    const existing = await context.EntityType.get(id);

    // 4. Update entity
    const updated: EntityType = {
      id,
      ...existing,
      field: newValue,
      lastUpdated: timestamp,
    };

    // 5. Persist
    context.EntityType.set(updated);
  }
);
```

### 3.2 Entity ID Conventions

| Pattern | Example | Use Case |
|---------|---------|----------|
| `{chainId}_{address}` | `80094_0x123...` | Per-user aggregates |
| `{chainId}_{address}_{tokenId}` | `80094_0x123..._42` | Per-token state |
| `{txHash}_{logIndex}` | `0xabc..._5` | Immutable events |
| `{chainId}_{source}` | `80094_incinerator` | Source-based stats |

### 3.3 Stateful vs Immutable Entities

**Stateful (Mutable)**: Updated on each event
- `SFPosition`, `BadgeHolder`, `TrackedHolder`
- Pattern: Get → Modify → Set

**Immutable (Event Log)**: Created once, never modified
- `MintEvent`, `HenloBurn`, `FatBeraDeposit`
- Pattern: Create → Set (no Get needed)

---

## 4. Domain Modules

### 4.1 Set & Forgetti Vaults (`handlers/sf-vaults.ts`)

**Purpose**: Track ERC4626 vault deposits and MultiRewards staking

**Key Features**:
1. **Strategy migration support**: `SFVaultStrategy` tracks version history
2. **RPC effects**: Queries `multiRewardsAddress()` from strategy contracts
3. **Aggregate statistics**: `SFVaultStats` for income metrics

**Entities**:
```graphql
SFPosition: User's position in a vault (shares, deposits, claims)
SFVaultStats: Vault-level aggregates (TVL, unique depositors)
SFMultiRewardsPosition: Per-MultiRewards staking breakdown
SFVaultStrategy: Strategy version history
```

**Handler Flow**:
```
Deposit → Update SFPosition.vaultShares
       → Update SFPosition.totalDeposited
       → Update SFVaultStats.totalDeposited

Staked  → Update SFPosition.stakedShares
       → Update SFMultiRewardsPosition.stakedShares

RewardPaid → Update SFPosition.totalClaimed
          → Update SFVaultStats.totalClaimed (income!)
```

### 4.2 Tracked ERC-20 (`handlers/tracked-erc20.ts`)

**Purpose**: Balance and burn tracking for HENLO + HENLOCKED tokens

**Key Features**:
1. **Config-driven**: `TOKEN_CONFIGS` maps addresses to features
2. **Burn detection**: Transfers to zero/incinerator addresses
3. **Holder stats**: Unique holder counts for HENLO

**Sub-modules**:
- `tracked-erc20/constants.ts` - Token configurations
- `tracked-erc20/burn-tracking.ts` - Burn detection + stats
- `tracked-erc20/holder-stats.ts` - Holder count updates

**Burn Sources**:
```typescript
const INCINERATOR_ADDRESS = "0x000000000000000000000000000000000000dEaD";
const OVERUNDER_ADDRESS = "0xOverUnder...";
const BERATRACKR_ADDRESS = "0xBeraTrackr...";
```

### 4.3 Badge Tracking (`handlers/badges1155.ts`)

**Purpose**: Track CubQuests badge ownership

**Key Features**:
1. **ERC1155 support**: TransferSingle and TransferBatch
2. **Aggregate holdings**: `BadgeHolder.holdings` as JSON
3. **Per-badge breakdown**: `BadgeAmount` entities

**Entity Structure**:
```graphql
BadgeHolder {
  address: String
  totalBadges: BigInt      # Unique badge IDs
  totalAmount: BigInt      # Sum of all amounts
  holdings: Json           # { "badgeId": amount }
}
```

### 4.4 Mibera Treasury (`handlers/mibera-treasury.ts`)

**Purpose**: Track loan lifecycle and marketplace activity

**Key Features**:
1. **Loan types**: Backing loans (multiple NFTs) and item loans (single)
2. **Status machine**: ACTIVE → REPAID/DEFAULTED
3. **RFV tracking**: Real Floor Value changes

**Event Handlers**:
- `LoanReceived` → Create MiberaLoan
- `BackingLoanPayedBack` → Status = REPAID
- `BackingLoanExpired` → Status = DEFAULTED, acquire items
- `ItemPurchased` → Transfer from treasury
- `RFVChanged` → Update TreasuryStats.realFloorValue

---

## 5. Cross-Cutting Concerns

### 5.1 Action Recording (`lib/actions.ts`)

Universal activity logging for quest verification:

```typescript
await recordAction(context, {
  actionType: "MINT",
  actor: userAddress,
  primaryCollection: collectionKey,
  timestamp,
  chainId,
  txHash,
  numeric1: tokenId,      // Token ID
  numeric2: amount,       // For ERC1155
  context: metadata,      // JSON string
});
```

### 5.2 RPC Effects

For on-chain reads during indexing:

```typescript
import { experimental_createEffect, S } from "envio";

export const getMultiRewardsAddress = experimental_createEffect(
  {
    name: "getMultiRewardsAddress",
    input: { strategyAddress: S.string, blockNumber: S.bigint },
    output: S.string,
    cache: true,  // Cached across handler calls
  },
  async ({ input }) => {
    // Use viem to read contract
  }
);
```

### 5.3 Error Handling

Wrap risky operations:
```typescript
try {
  await updateHolderStats(context, chainId, delta, supply, timestamp);
} catch (error) {
  console.error('[TrackedErc20] Holder stats error:', tokenAddress, error);
}
```

---

## 6. Configuration

### 6.1 config.yaml Structure

```yaml
name: thj-indexer

contracts:
  - name: ContractName
    handler: src/EventHandlers.ts
    events:
      - event: EventSignature(params)
        field_selection:
          transaction_fields:
            - hash
            - from  # Optional: for source detection

networks:
  - id: 80094  # Chain ID
    start_block: 866405
    contracts:
      - name: ContractName
        address:
          - 0x123...
          - 0x456...  # Multiple addresses

unordered_multichain_mode: true
preload_handlers: true
```

### 6.2 Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `ENVIO_RPC_URL` | RPC for on-chain reads | `https://rpc.berachain.com` |
| `TUI_OFF` | Disable TUI for CI | `false` |

---

## 7. Testing Strategy

### 7.1 Local Development

```bash
pnpm codegen      # Regenerate types after schema changes
pnpm tsc --noEmit # Type checking
TUI_OFF=true pnpm dev  # Run indexer locally
```

### 7.2 Isolated Handler Testing

`SFVaultHandlers.ts` exists for testing S&F vaults without loading all handlers:

```typescript
// Only imports sf-vaults.ts, avoiding type conflicts
import { handleSFVaultDeposit, ... } from "./handlers/sf-vaults";
```

---

## 8. Deployment

### 8.1 Envio Hosted

```bash
pnpm deploy
```

See `DEPLOYMENT_GUIDE.md` for production configuration.

### 8.2 GraphQL Access

- **Dev**: `http://localhost:8080` (password: `testing`)
- **Prod**: Envio-hosted endpoint (authenticated)

---

## 9. Known Technical Debt

### 9.1 Commented Out Handlers

From `EventHandlers.ts`:
```typescript
// TODO: Fix TypeScript errors in trade handlers before uncommenting
// import { handleMiberaTradeProposed, ... } from "./handlers/mibera-trades";
// import { handleCandiesTradeProposed, ... } from "./handlers/cargo-trades";
```

### 9.2 Placeholder Handlers

- `handleCrayonsErc721Transfer` - Minimal implementation
- `handleAquaberaWithdraw` - Not implemented (forwarder limitation)

### 9.3 Hardcoded Mappings

`STRATEGY_TO_MULTI_REWARDS` in `sf-vaults.ts` - fallback when RPC fails

---

## 10. Extension Points

### 10.1 Adding a New Contract

1. Add to `config.yaml`:
   ```yaml
   contracts:
     - name: NewContract
       handler: src/EventHandlers.ts
       events:
         - event: NewEvent(...)
   networks:
     - id: 80094
       contracts:
         - name: NewContract
           address: [0x...]
   ```

2. Add entity to `schema.graphql`
3. Create `src/handlers/new-contract.ts`
4. Import/export in `EventHandlers.ts`
5. Run `pnpm codegen`

### 10.2 Adding a New Chain

1. Add network to `config.yaml`:
   ```yaml
   networks:
     - id: NEW_CHAIN_ID
       start_block: DEPLOYMENT_BLOCK
       contracts: [...]
   ```

2. If using RPC effects, add chain to viem config

---

*This document was extracted from production code. CODE IS TRUTH.*
