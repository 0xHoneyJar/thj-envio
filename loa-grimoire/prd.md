# Product Requirements Document: THJ Envio Indexer

**Extracted from**: `thj-envio` codebase
**Adoption date**: 2025-12-21
**Status**: CODE-GROUNDED (extracted from running production code)

---

## 1. Product Overview

### 1.1 Purpose

The THJ Envio Indexer is a multi-chain blockchain indexer that tracks on-chain activity across the entire THJ ecosystem. It provides real-time data for:

- **CubQuests**: Badge verification, mint tracking, quest completion
- **Henlo**: Token burns, holder balances, vault deposits
- **Set & Forgetti**: ERC4626 vault positions, staking rewards
- **Mibera**: NFT ownership, treasury marketplace, lending

### 1.2 Key Value Propositions

1. **Unified Cross-Chain View**: Single GraphQL endpoint for 6 chains
2. **Quest Verification Backend**: Provides holder/mint data for CubQuests
3. **Real-Time Balance Tracking**: Accurate token and NFT balances
4. **Activity History**: Complete transaction logs for user dashboards

---

## 2. Functional Requirements

### 2.1 Multi-Chain Support

| Chain | ID | Start Block | Primary Use Cases |
|-------|-----|-------------|-------------------|
| Ethereum | 1 | 13090020 | HoneyJar, Honeycomb, Milady burns |
| Arbitrum | 42161 | 102894033 | HoneyJar2 |
| Zora | 7777777 | 18071873 | HoneyJar3 |
| Optimism | 10 | 107558369 | HoneyJar4, Mibera articles |
| Base | 8453 | 2430439 | HoneyJar5, friend.tech |
| Berachain | 80094 | 866405 | All THJ products |

### 2.2 Contract Domains

#### 2.2.1 HoneyJar & Honeycomb (Core NFTs)
- **Contracts**: HoneyJar 1-6, Honeycomb, MoneycombVault
- **Events**: Transfer, AccountOpened, AccountClosed, HJBurned, SharesMinted, RewardClaimed
- **Entities**: Holder, Token, CollectionStat, GlobalCollectionStat, UserBalance, Vault, VaultActivity

#### 2.2.2 Henlo Token System
- **Contracts**: TrackedErc20 (HENLO, HLKD1B-100M), HenloVault
- **Events**: Transfer, Mint, RoundOpened, RoundClosed, Redeem
- **Entities**: HenloHolder, HenloBurn, HenloBurnStats, HenloGlobalBurnStats, TrackedTokenBalance, HenloVaultRound

#### 2.2.3 Set & Forgetti Vaults
- **Contracts**: SFVaultERC4626, SFMultiRewards
- **Events**: Deposit, Withdraw, Staked, Withdrawn, RewardPaid, StrategyUpdated
- **Entities**: SFPosition, SFVaultStats, SFMultiRewardsPosition, SFVaultStrategy

#### 2.2.4 Mibera Ecosystem
- **Contracts**: MiberaCollection, MiberaTreasury, PaddleFi, CandiesMarket1155, MiberaPremint
- **Events**: Transfer, LoanReceived, ItemPurchased, Mint, Pawn, Participated
- **Entities**: TrackedHolder, MiberaLoan, TreasuryItem, PaddleSupplier, MintActivity

#### 2.2.5 CubQuests Integration
- **Contracts**: CubBadges1155, GeneralMints, TrackedErc721
- **Events**: TransferSingle, TransferBatch, Transfer
- **Entities**: BadgeHolder, BadgeBalance, MintEvent, Action

### 2.3 Entity Relationship Patterns

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER (address)                          │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │   Holder    │     │ SFPosition  │     │ BadgeHolder │
  │  (NFT bal)  │     │  (vault)    │     │  (badges)   │
  └─────────────┘     └─────────────┘     └─────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │   Token     │     │ SFVaultStats│     │ BadgeAmount │
  │ (per-token) │     │  (per-vault)│     │  (per-id)   │
  └─────────────┘     └─────────────┘     └─────────────┘
```

### 2.4 Quest Verification Requirements

The indexer MUST support these verification queries:

1. **Has user minted NFT from collection X?** → `MintEvent`, `TrackedHolder`
2. **Does user hold badge ID Y?** → `BadgeHolder.holdings`
3. **Has user burned Z amount of HENLO?** → `HenloBurnStats`, `HenloGlobalBurnStats`
4. **Is user staking in S&F vault?** → `SFPosition.stakedShares > 0`

---

## 3. Non-Functional Requirements

### 3.1 Performance

- **Indexing latency**: < 5 seconds from block confirmation
- **Query response**: < 200ms for simple queries
- **Multichain sync**: Parallel indexing across all 6 chains

### 3.2 Data Integrity

- **Immutable event logs**: Never modify historical Transfer/MintEvent records
- **Stateful aggregates**: Update counters atomically (totalDeposited, uniqueHolders)
- **Chain isolation**: ChainId included in all entity IDs

### 3.3 Reliability

- **Unordered multichain mode**: Handles cross-chain events without ordering guarantees
- **Preload handlers**: Faster startup via handler preloading
- **RPC fallbacks**: Hardcoded mappings when RPC calls fail

---

## 4. Integration Points

### 4.1 Downstream Consumers

| Consumer | Data Used | Query Pattern |
|----------|-----------|---------------|
| CubQuests | BadgeHolder, MintEvent | Verification by address |
| Henlo Dashboard | HenloHolder, HenloBurnStats | Leaderboards |
| S&F Interface | SFPosition, SFVaultStats | User positions |
| Mibera Market | TrackedHolder, TreasuryItem | NFT ownership |

### 4.2 GraphQL API

- **Endpoint**: `http://localhost:8080` (dev), production via Envio hosted
- **Auth**: Password-protected in dev (`testing`)
- **Schema**: Auto-generated from `schema.graphql`

---

## 5. Constraints

### 5.1 Envio Framework Constraints

1. **Entity IDs must be globally unique** - use `{chainId}_{address}_{tokenId}` pattern
2. **No database transactions** - each handler call is atomic
3. **Handlers must be idempotent** - same event replayed = same result
4. **Context-based state access** - use `context.Entity.get/set`

### 5.2 Multi-Gen Strategy Migration

Set & Forgetti vaults support strategy migrations:
- Old MultiRewards can become inactive (activeTo != null)
- Users may have stakes in multiple generations
- `SFVaultStrategy` tracks version history

---

## 6. Future Requirements (Identified from Code)

### 6.1 Commented Out / Pending

1. **MiberaTrade handlers** - NFT trading (TypeScript errors to fix)
2. **CandiesTrade handlers** - ERC1155 trading (pending deployment)
3. **Aquabera withdrawal via forwarder** - Not supported by contract

### 6.2 Expansion Opportunities

1. **Seaport secondary sales** - Currently indexed but minimal entity support
2. **friend.tech analytics** - Holder stats implemented, could expand
3. **Mirror article metrics** - Purchase tracking exists

---

## 7. Success Metrics

| Metric | Target | Source |
|--------|--------|--------|
| Indexed chains | 6 | config.yaml networks[] |
| Tracked contracts | 40+ | config.yaml contracts[] |
| Entity types | 60+ | schema.graphql |
| Handler modules | 37 | src/handlers/ |

---

## Appendix: Contract Address Registry

See `config.yaml` for complete contract addresses per chain.

Key production contracts (Berachain 80094):
- HoneyJar1-6: See config.yaml
- Honeycomb: `0x886d2176d899796cd1affa07eff07b9b2b80f1be`
- MoneycombVault: `0x9279b2227b57f349a0ce552b25af341e735f6309`
- HenloVault: `0x42069E3BF367C403b632CF9cD5a8d61e2c0c44fC`
- HENLO Token: `0xb2F776e9c1C926C4b2e54182Fac058dA9Af0B6A5`
- Mibera: `0x6666397DFe9a8c469BF65dc744CB1C733416c420`

---

*This document was extracted from production code. CODE IS TRUTH.*
