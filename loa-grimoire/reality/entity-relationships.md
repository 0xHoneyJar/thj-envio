# Code Reality: Entity Relationships

**Source**: `thj-envio/schema.graphql`
**Extracted**: 2025-12-21

---

## Entity Count by Domain

| Domain | Entity Types | Description |
|--------|--------------|-------------|
| HoneyJar/Honeycomb | 14 | NFT ownership, vaults, cross-chain |
| Henlo | 12 | Burns, holders, vault rounds |
| Set & Forgetti | 4 | Vault positions, staking, strategies |
| Mibera | 15 | NFTs, treasury, loans, trades |
| CubQuests | 5 | Badges, mints, actions |
| Aquabera | 4 | Deposits, withdrawals, builders |
| External | 6 | friend.tech, Mirror, Seaport |

**Total**: 60+ entity types

---

## Core Entity Patterns

### 1. Per-User Position Entities

```graphql
type SFPosition {
  id: ID!                     # {chainId}_{user}_{vault}
  user: String!
  vault: String!
  vaultShares: BigInt!        # Unstaked shares
  stakedShares: BigInt!       # Staked across all MultiRewards
  totalShares: BigInt!        # vaultShares + stakedShares
  totalDeposited: BigInt!     # Lifetime deposits (flow)
  totalWithdrawn: BigInt!     # Lifetime withdrawals (flow)
  totalClaimed: BigInt!       # Lifetime rewards claimed
}
```

### 2. Collection Stat Entities

```graphql
type CollectionStat {
  id: ID!                     # {chainId}_{collection}
  collection: String!
  totalSupply: Int!
  totalMinted: Int!
  totalBurned: Int!
  uniqueHolders: Int!
  lastMintTime: BigInt
  chainId: Int!
}
```

### 3. Immutable Event Entities

```graphql
type MintEvent {
  id: ID!                     # {txHash}_{logIndex}
  collectionKey: String!
  tokenId: BigInt!
  minter: String!
  timestamp: BigInt!
  transactionHash: String!
  chainId: Int!
  encodedTraits: String       # Optional: VM-specific
}
```

---

## Relationship Diagrams

### Set & Forgetti Vault System

```
┌─────────────────────────────────────────────────────────────────┐
│                        SFPosition                               │
│  (User's aggregate position across all MultiRewards for vault)  │
└─────────────────────────────────────────────────────────────────┘
         │
         │ 1:N (user may stake in multiple generations)
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SFMultiRewardsPosition                        │
│       (User's stake in a SPECIFIC MultiRewards contract)        │
│  - Check SFVaultStrategy.activeTo to detect old generations     │
│  - stakedShares > 0 in inactive = migration opportunity         │
└─────────────────────────────────────────────────────────────────┘
         │
         │ N:1 (many positions → one vault)
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SFVaultStats                               │
│              (Vault-level aggregates for income)                │
│  - totalClaimed = HENLO rewards paid (key income metric!)       │
└─────────────────────────────────────────────────────────────────┘
         │
         │ 1:N (vault has strategy versions)
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SFVaultStrategy                              │
│               (Strategy version history)                        │
│  - activeFrom: when deployed                                    │
│  - activeTo: null if current, else replaced                     │
│  - Links vault ↔ strategy ↔ multiRewards                        │
└─────────────────────────────────────────────────────────────────┘
```

### Henlo Burn Tracking

```
┌─────────────────────────────────────────────────────────────────┐
│                  HenloGlobalBurnStats                           │
│                    (Singleton: "global")                        │
│  - totalBurnedAllChains                                         │
│  - incineratorBurns, overunderBurns, userBurns                  │
│  - uniqueBurners (global)                                       │
└─────────────────────────────────────────────────────────────────┘
         │
         │ Aggregates from
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    HenloBurnStats                               │
│              (Per chain + source breakdown)                     │
│  ID: {chainId}_{source}                                         │
│  Sources: "incinerator", "overunder", "beratrackr", "user"      │
└─────────────────────────────────────────────────────────────────┘
         │
         │ Created from
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      HenloBurn                                  │
│                 (Individual burn event)                         │
│  ID: {txHash}_{logIndex}                                        │
│  - amount, from, source, timestamp                              │
└─────────────────────────────────────────────────────────────────┘

Unique Burner Tracking:
┌─────────────────┐  ┌─────────────────────┐  ┌────────────────────┐
│  HenloBurner    │  │  HenloChainBurner   │  │ HenloSourceBurner  │
│ (global unique) │  │ (per-chain unique)  │  │ (per-source unique)│
│ ID: {address}   │  │ ID: {chain}_{addr}  │  │ ID: {chain}_src_a  │
└─────────────────┘  └─────────────────────┘  └────────────────────┘
```

### Badge System

```
┌─────────────────────────────────────────────────────────────────┐
│                      BadgeHolder                                │
│                   (User's badge summary)                        │
│  ID: {address}_{chainId}                                        │
│  - totalBadges: unique badge IDs held                           │
│  - totalAmount: sum of all balances                             │
│  - holdings: Json { "badgeId": amount }                         │
└─────────────────────────────────────────────────────────────────┘
         │
         │ 1:N (one holder → many badge balances)
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BadgeBalance                                │
│              (Per-contract per-token balance)                   │
│  ID: {holder}_{contract}_{tokenId}_{chainId}                    │
│  @derivedFrom BadgeHolder.badgeBalances                         │
└─────────────────────────────────────────────────────────────────┘
         │
         │ 1:N (holder → simplified badge amounts)
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BadgeAmount                                │
│              (Simplified badge ID → amount)                     │
│  ID: {holder}_{badgeId}                                         │
│  @derivedFrom BadgeHolder.badgesHeld                            │
└─────────────────────────────────────────────────────────────────┘
```

### Mibera Loan System

```
┌─────────────────────────────────────────────────────────────────┐
│                      MiberaLoan                                 │
│               (Active loan tracking)                            │
│  ID: {chainId}_{loanType}_{loanId}                              │
│  loanType: "backing" | "item"                                   │
│  status: "ACTIVE" | "REPAID" | "DEFAULTED"                      │
└─────────────────────────────────────────────────────────────────┘
         │
         │ On default
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     TreasuryItem                                │
│              (Treasury-owned NFT inventory)                     │
│  ID: {tokenId}                                                  │
│  - acquiredVia: how treasury got it                             │
│  - purchasedBy: who bought it (if sold)                         │
└─────────────────────────────────────────────────────────────────┘
         │
         │ Activity logged to
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   TreasuryActivity                              │
│                 (Event feed for UI)                             │
│  activityType: "item_acquired" | "item_purchased" | "rfv_updated"│
└─────────────────────────────────────────────────────────────────┘
```

---

## ID Format Reference

| Entity | ID Pattern | Example |
|--------|------------|---------|
| SFPosition | `{chainId}_{user}_{vault}` | `80094_0x123..._0xvault...` |
| BadgeHolder | `{address}_{chainId}` | `0x123..._80094` |
| MintEvent | `{txHash}_{logIndex}` | `0xabc..._5` |
| HenloBurnStats | `{chainId}_{source}` | `80094_incinerator` |
| SFVaultStrategy | `{chainId}_{vault}_{strategy}` | `80094_0xv..._0xs...` |
| TrackedHolder | `{contract}_{collectionKey}_{chainId}_{address}` | Complex |

---

## Quest Verification Queries

### Has user minted from collection?
```graphql
query {
  mintEvent(where: { minter: "0x...", collectionKey: "mibera_vm" }) { id }
}
```

### Does user hold badge?
```graphql
query {
  badgeHolder(id: "0x..._80094") { holdings }
}
# Check: JSON.parse(holdings)["badge_123"] > 0
```

### User's S&F position?
```graphql
query {
  sFPosition(id: "80094_0x..._0xvault") { stakedShares totalClaimed }
}
```

---

*Extracted from schema.graphql. See schema for full type definitions.*
