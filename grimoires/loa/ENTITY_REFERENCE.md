# Entity Quick Reference

> GraphQL entity reference for THJ Envio Indexer (88+ entities)

## Entity ID Patterns

All entity IDs follow predictable patterns:

| Pattern | Usage | Example |
|---------|-------|---------|
| `{txHash}_{logIndex}` | Immutable events | `0xabc...123_0` |
| `{chainId}_{address}` | Per-chain user records | `80094_0xuser...` |
| `{chainId}_{address}_{identifier}` | Compound records | `80094_0xuser..._0xvault...` |
| `{address}` | Cross-chain aggregates | `0xuser...` |

---

## Core Action System

### Action
**Purpose**: Universal event log for quest/mission verification
**ID**: `{txHash}_{logIndex}`
**Used by**: CubQuests verification

```graphql
type Action @entity {
  id: String!
  actionType: String!          # mint, burn, deposit, stake, claim, trade...
  actor: String!               # User address (lowercase)
  primaryCollection: String    # Collection key (e.g., "mibera_main", "sf_vault")
  primaryTokenId: Int          # Token ID if applicable
  secondaryCollection: String  # For trades/swaps
  numericValue: BigInt         # Amount/shares/quantity
  bonusMultiplier: Float       # Reward multipliers
  metadata: String             # JSON-encoded arbitrary context
  timestamp: Int!
  txHash: String!
  chainId: Int!
}
```

**Common Queries**:
```graphql
# Verify user completed a mint
query { Action(where: { actor: { _eq: "0x..." }, actionType: { _eq: "mint" } }) { id } }

# Get all deposit actions
query { Action(where: { actionType: { _eq: "deposit" } }, limit: 100) { actor numericValue } }
```

### Transfer
**Purpose**: NFT transfer events
**ID**: `{txHash}_{logIndex}`

---

## NFT Tracking

### MintEvent
**Purpose**: ERC721 mint events with optional VM trait encoding
**ID**: `{txHash}_{logIndex}`

| Field | Type | Description |
|-------|------|-------------|
| collection | String | Collection key |
| tokenId | Int | Token ID |
| minter | String | Address that minted |
| traits | String | Optional encoded traits (VM mints) |

### Holder
**Purpose**: HoneyJar NFT holder tracking
**ID**: `{collection}_{address}_{chainId}`

| Field | Type | Description |
|-------|------|-------------|
| address | String | Holder address |
| collection | String | Collection key |
| tokenCount | Int | Number of tokens held |
| chainId | Int | Chain ID |

### TrackedHolder
**Purpose**: Static collection holder tracking (Crayons, etc.)
**ID**: `{chainId}_{collection}_{address}`

### Token
**Purpose**: Individual token state
**ID**: `{collection}_{tokenId}_{chainId}`

---

## Vault Systems

### SFPosition
**Purpose**: Set & Forgetti user position
**ID**: `{chainId}_{user}_{vault}`

| Field | Type | Description |
|-------|------|-------------|
| vaultShares | BigInt | Shares in wallet |
| stakedShares | BigInt | Shares staked |
| totalDeposited | BigInt | Lifetime deposits |
| totalClaimed | BigInt | Lifetime claims |

### SFVaultStats
**Purpose**: Per-vault aggregate statistics
**ID**: `{chainId}_{vault}`

### Vault (MoneycombVault)
**Purpose**: MoneycombVault account state
**ID**: `{chainId}_{vaultAddress}_{userAddress}`

| Field | Type | Description |
|-------|------|-------------|
| burnedGen1-6 | Boolean | Which HJ generations burned |
| totalDeposited | BigInt | Lifetime deposits |
| claimedRewards | BigInt | Rewards claimed |

### HenloVaultRound
**Purpose**: Henlocker vault round per strike price
**ID**: `{chainId}_{vault}_{strike}`

---

## Burn Tracking

### NftBurn
**Purpose**: NFT burn events (Mibera, Milady)
**ID**: `{txHash}_{logIndex}`

| Field | Type | Description |
|-------|------|-------------|
| collection | String | Collection burned from |
| tokenId | Int | Token ID burned |
| burner | String | Address that burned |

### NftBurnStats
**Purpose**: Per-collection burn statistics
**ID**: `{collection}_{chainId}`

### HenloBurn
**Purpose**: HENLO token burn events with source categorization
**ID**: `{txHash}_{logIndex}`

| Field | Type | Description |
|-------|------|-------------|
| burner | String | Address that burned |
| amount | BigInt | Amount burned |
| source | String | Burn source (incinerator, user, etc.) |

### HenloBurnStats
**Purpose**: Per-chain+source burn statistics
**ID**: `{chainId}_{source}`

---

## Token Balances

### TrackedTokenBalance
**Purpose**: ERC20 holder balance snapshots
**ID**: `{chainId}_{tokenAddress}_{holderAddress}`

| Field | Type | Description |
|-------|------|-------------|
| balance | BigInt | Current balance |
| lastUpdated | Int | Last update timestamp |

### HenloHolder
**Purpose**: HENLO token holder tracking
**ID**: `{chainId}_{address}`

---

## Activity Feeds

### MintActivity
**Purpose**: Unified activity feed for UI
**ID**: `{txHash}_{logIndex}`

| Field | Type | Description |
|-------|------|-------------|
| type | Enum | mint, sale, purchase |
| collection | String | Collection key |
| tokenId | Int | Token ID |
| actor | String | User address |
| price | BigInt | Price paid (if applicable) |

### VaultActivity
**Purpose**: MoneycombVault activity log
**ID**: `{txHash}_{logIndex}`

---

## Mibera Ecosystem

### MiberaLoan
**Purpose**: NFT-backed loan tracking
**ID**: `{chainId}_{loanId}`

| Field | Type | Description |
|-------|------|-------------|
| borrower | String | Loan borrower |
| collateralTokenId | Int | NFT used as collateral |
| loanAmount | BigInt | Amount borrowed |
| status | String | active, repaid, liquidated |

### MiberaLoanStats
**Purpose**: Aggregate loan statistics
**ID**: `{chainId}`

### DailyRfvSnapshot
**Purpose**: Historical Real Floor Value tracking
**ID**: `{chainId}_{date}`

### PremintParticipation
**Purpose**: Premint phase participation
**ID**: `{txHash}_{logIndex}`

### PremintUser
**Purpose**: User premint aggregate stats
**ID**: `{chainId}_{user}`

---

## External Integrations

### FriendtechTrade
**Purpose**: friend.tech key trades on Base
**ID**: `{txHash}_{logIndex}`

| Field | Type | Description |
|-------|------|-------------|
| trader | String | Who made the trade |
| subject | String | Subject of the keys |
| isBuy | Boolean | Buy or sell |
| amount | Int | Number of keys |
| ethAmount | BigInt | ETH paid/received |

### FriendtechHolder
**Purpose**: Per-subject key holdings
**ID**: `{subject}_{holder}`

### MirrorArticlePurchase
**Purpose**: Mirror article purchases on Optimism
**ID**: `{txHash}_{logIndex}`

### MirrorArticleStats
**Purpose**: Per-article statistics
**ID**: `{articleAddress}`

---

## Statistics Entities

### CollectionStat
**Purpose**: Per-collection NFT statistics
**ID**: `{collection}_{chainId}`

| Field | Type | Description |
|-------|------|-------------|
| totalSupply | Int | Total tokens |
| totalHolders | Int | Unique holders |
| totalMints | Int | Total mints |
| totalBurns | Int | Total burns |

### GlobalCollectionStat
**Purpose**: Cross-chain collection aggregates
**ID**: `{collection}`

### HenloHolderStats
**Purpose**: Chain-level HENLO holder statistics
**ID**: `{chainId}`

---

## Entity Counts by Category

| Category | Count | Primary Use |
|----------|-------|-------------|
| Actions | 2 | Quest verification |
| Mints | 2 | Mint tracking |
| Holders | 4 | NFT ownership |
| Vaults | 8 | Position tracking |
| Burns | 6 | Deflation tracking |
| Trading | 3 | Trade history |
| Activity | 4 | UI feeds |
| Loans | 3 | Mibera loans |
| Premint | 4 | Premint tracking |
| External | 5 | friend.tech, Mirror |
| Stats | 8 | Aggregates |
| **Total** | **88+** | |

---

## Common Query Patterns

### Get User's Complete Profile
```graphql
query GetUserProfile($user: String!) {
  # Quest actions
  actions: Action(where: { actor: { _eq: $user } }, limit: 100) {
    actionType primaryCollection timestamp
  }
  # NFT holdings
  holdings: Holder(where: { address: { _eq: $user } }) {
    collection tokenCount chainId
  }
  # Vault positions
  vaultPositions: SFPosition(where: { user: { _eq: $user } }) {
    vault vaultShares stakedShares
  }
  # HENLO balance
  henloBalance: HenloHolder(where: { address: { _eq: $user } }) {
    balance chainId
  }
}
```

### Get Collection Overview
```graphql
query GetCollectionOverview($collection: String!) {
  stats: CollectionStat(where: { collection: { _eq: $collection } }) {
    totalSupply totalHolders totalMints totalBurns chainId
  }
  global: GlobalCollectionStat(where: { id: { _eq: $collection } }) {
    totalSupply totalHolders
  }
}
```
