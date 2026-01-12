# Code Reality: Handler Patterns

**Source**: `thj-envio/src/handlers/`
**Extracted**: 2025-12-21

---

## Handler Module Index

| File | Lines | Domain | Key Handlers |
|------|-------|--------|--------------|
| `sf-vaults.ts` | 30025 | Set & Forgetti | Deposit, Withdraw, Stake, Claim, StrategyUpdated |
| `mibera-treasury.ts` | 21283 | Mibera Loans | LoanReceived, LoanExpired, ItemPurchased, RFVChanged |
| `henlo-vault.ts` | 14295 | Henlocker | RoundOpened, Mint, Redeem, ReservoirSet |
| `honey-jar-nfts.ts` | 13098 | HoneyJar | Transfer (6 generations) |
| `aquabera-vault-direct.ts` | 10767 | Aquabera | Deposit, Withdraw (direct vault) |
| `aquabera-wall.ts` | 9688 | Aquabera | DepositForwarded |
| `tracked-erc721.ts` | 9618 | NFT Holder | Transfer → TrackedHolder |
| `moneycomb-vault.ts` | 9148 | Moneycomb | AccountOpened, HJBurned, SharesMinted |
| `badges1155.ts` | 9101 | CubQuests | TransferSingle, TransferBatch |
| `mibera-sets.ts` | 6989 | Mibera ERC1155 | TransferSingle, TransferBatch |
| `mibera-premint.ts` | 6177 | Mibera Premint | Participated, Refunded |
| `mints1155.ts` | 6073 | ERC1155 Mints | TransferSingle, TransferBatch |
| `mibera-zora.ts` | 5892 | Mibera Zora | TransferSingle, TransferBatch |
| `paddlefi.ts` | 5524 | PaddleFi | Mint (supply), Pawn |
| `mibera-staking.ts` | 5023 | Staking | Transfer (deposit/withdraw) |
| `friendtech.ts` | 4419 | friend.tech | Trade |
| `tracked-erc20.ts` | 4397 | Token Balances | Transfer → balance + burn |
| `mibera-collection.ts` | 4405 | Mibera NFT | Transfer → mint/burn |
| `seaport.ts` | 4176 | Secondary Sales | OrderFulfilled |
| `mirror-observability.ts` | 3554 | Mirror | WritingEditionPurchased |
| `bgt.ts` | 2828 | BGT Boost | QueueBoost |
| `milady-collection.ts` | 2533 | Milady | Transfer → burn only |
| `mints.ts` | 1804 | ERC721 Mints | Transfer → MintEvent |
| `fatbera.ts` | 1679 | FatBera | Deposit |
| `vm-minted.ts` | 1609 | VM Traits | Minted → encoded traits |
| `crayons.ts` | 928 | Factory | Factory__NewERC721Base |
| `crayons-collections.ts` | 702 | Dynamic NFTs | Transfer |
| `constants.ts` | 2710 | Shared | Address constants |

---

## Pattern Categories

### 1. Stateful Position Tracking

**Pattern**: Get existing → Merge changes → Set updated

**Examples**: `SFPosition`, `BadgeHolder`, `TrackedHolder`, `HenloHolder`

```typescript
const id = `${chainId}_${address}`;
const existing = await context.Entity.get(id);
const updated = {
  ...existing,
  balance: (existing?.balance ?? 0n) + delta
};
context.Entity.set(updated);
```

### 2. Immutable Event Logging

**Pattern**: Create new record per event, never update

**Examples**: `MintEvent`, `HenloBurn`, `FatBeraDeposit`, `Transfer`

```typescript
const id = `${txHash}_${logIndex}`;
const event: EventEntity = { id, ...fields };
context.Entity.set(event);
```

### 3. Aggregate Statistics

**Pattern**: Increment counters atomically on each event

**Examples**: `SFVaultStats`, `HenloBurnStats`, `CollectionStat`

```typescript
const stats = await context.Stats.get(id) ?? defaultStats;
context.Stats.set({
  ...stats,
  totalCount: stats.totalCount + 1,
  totalAmount: stats.totalAmount + amount,
  lastUpdateTime: timestamp,
});
```

### 4. Config-Driven Routing

**Pattern**: Lookup config by contract address, route to feature handlers

**Example**: `tracked-erc20.ts`

```typescript
const config = TOKEN_CONFIGS[tokenAddress];
if (!config) return;  // Not tracked

if (config.burnTracking && isBurnTransfer(to)) {
  await trackBurn(...);
}
if (config.holderStats) {
  await updateHolderStats(...);
}
```

### 5. RPC Effects for On-Chain Reads

**Pattern**: Query contract state during indexing (cached)

**Example**: `sf-vaults.ts`

```typescript
const getMultiRewardsAddress = experimental_createEffect({
  name: "getMultiRewardsAddress",
  cache: true,
}, async ({ input }) => {
  return client.readContract({ ... });
});
```

---

## Entity Relationship Patterns

### User → Positions → Stats

```
User Address
    ├── SFPosition (per vault)
    │   └── SFMultiRewardsPosition (per MultiRewards)
    ├── BadgeHolder (badges)
    │   └── BadgeAmount (per badge ID)
    ├── TrackedHolder (per NFT collection)
    └── HenloHolder (token balance)

Vault/Collection
    ├── SFVaultStats (aggregates)
    ├── SFVaultStrategy (version history)
    └── CollectionStat (NFT stats)
```

### Burn Tracking Hierarchy

```
HenloGlobalBurnStats (singleton)
    ├── HenloBurnStats (per chain + source)
    │   └── HenloBurn (individual burns)
    ├── HenloBurner (unique addresses - global)
    ├── HenloChainBurner (unique per chain)
    └── HenloSourceBurner (unique per source)
```

---

## Common Utilities

### Action Recording (`lib/actions.ts`)

Used by: GeneralMints, TrackedErc721, Badges, Candies

```typescript
await recordAction(context, {
  actionType: "MINT",
  actor: userAddress,
  primaryCollection: collectionKey,
  timestamp,
  chainId,
  txHash: event.transaction.hash,
  numeric1: tokenId,
  numeric2: amount,
  context: JSON.stringify(metadata),
});
```

### Zero Address Detection

```typescript
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const isMint = from === ZERO_ADDRESS;
const isBurn = to === ZERO_ADDRESS;
```

### Chain-Specific Logic

```typescript
const BERACHAIN_ID = 80094;
if (chainId === BERACHAIN_ID) {
  // Berachain-specific handling
}
```

---

*Extracted from codebase analysis. See source files for implementation details.*
