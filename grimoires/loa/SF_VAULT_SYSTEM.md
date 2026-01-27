# Set & Forgetti Vault System

> Documentation for `src/handlers/sf-vaults.ts` - the largest handler module (900+ lines)

## Overview

The Set & Forgetti (S&F) vault system tracks ERC4626 vaults with integrated MultiRewards staking. Users deposit BERA into vaults, receive vault shares, and can stake those shares for additional rewards.

**Handler**: `src/handlers/sf-vaults.ts`
**Config**: Lines 300-450 in `config.yaml`

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SET & FORGETTI SYSTEM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User deposits BERA                                             │
│        │                                                        │
│        ▼                                                        │
│  ┌─────────────────┐     ┌─────────────────┐                   │
│  │  ERC4626 Vault  │────▶│ Strategy Wrapper │                   │
│  │  (HLKD tokens)  │     │  (yield source)  │                   │
│  └────────┬────────┘     └────────┬─────────┘                   │
│           │                       │                             │
│           │ vault shares          │ MultiRewardsUpdated event   │
│           ▼                       ▼                             │
│  ┌─────────────────┐     ┌─────────────────┐                   │
│  │  User stakes    │────▶│  MultiRewards   │                   │
│  │  vault shares   │     │  (reward dist)  │                   │
│  └─────────────────┘     └─────────────────┘                   │
│                                  │                              │
│                                  ▼                              │
│                          RewardPaid / RebatePaid                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Vault Configurations

| Vault | Symbol | Vault Address | MultiRewards Address |
|-------|--------|---------------|---------------------|
| HLKD1B | 1 Billion | `0x3bec4140eda07911208d4fc06b2f5adb7b5237fb` | `0x34b3668e2ad47ccfe3c53e24a0606b911d1f6a8f` |
| HLKD690M | 690 Million | `0x335d150495f6c8483773abc0e4fa5780dd270e78` | `0xd1cbf8f7f310947a7993abbd7fd6113794e353da` |
| HLKD420M | 420 Million | `0x2e2bdfdd4b786703b374aeeaa44195698a699dd1` | `0x827b7ea9fdb4322dbc6f9bf72c04871be859f20c` |
| HLKD330M | 330 Million | `0x91f321a8791fb899c6b860b9f54940c68cb45aed` | `0xacd0177bfcbc3760b03c87808b5423945f6bfaec` |
| HLKD100M | 100 Million | `0xee1087ec5d6a0a673c046b9acb15c93b7adb95ca` | `0xb5b312fbf7eb145485ece55b862db94d626efa0f` |

## Events Tracked

| Event | Source | Description |
|-------|--------|-------------|
| `Deposit(address,address,uint256,uint256)` | ERC4626 Vault | User deposits BERA, receives shares |
| `Withdraw(address,address,address,uint256,uint256)` | ERC4626 Vault | User withdraws BERA, burns shares |
| `Staked(address,uint256)` | MultiRewards | User stakes vault shares |
| `Withdrawn(address,uint256)` | MultiRewards | User unstakes vault shares |
| `RewardPaid(address,address,uint256)` | MultiRewards | User claims rewards |
| `RebatePaid(address,uint256,uint256)` | MultiRewards | User receives rebate payment |
| `MultiRewardsUpdated(address)` | Strategy Wrapper | Strategy migrates to new MultiRewards |

## Entities

### SFPosition
**Purpose**: Track user's aggregate position across vault + staking
**ID Pattern**: `{chainId}_{userAddress}_{vaultAddress}`

```graphql
type SFPosition @entity {
  id: String!
  chainId: Int!
  user: String!
  vault: String!

  # Current state
  vaultShares: BigInt!        # Shares held in wallet
  stakedShares: BigInt!       # Shares staked in MultiRewards
  pendingRewards: BigInt!     # Unclaimed rewards

  # Lifetime totals
  totalDeposited: BigInt!
  totalWithdrawn: BigInt!
  totalClaimed: BigInt!

  # Timestamps
  firstDepositAt: Int!
  lastDepositAt: Int!
  lastWithdrawAt: Int!
  lastStakeAt: Int!
  lastClaimAt: Int!
}
```

### SFVaultStats
**Purpose**: Aggregate statistics per vault
**ID Pattern**: `{chainId}_{vaultAddress}`

```graphql
type SFVaultStats @entity {
  id: String!
  chainId: Int!
  vault: String!
  kitchenTokenSymbol: String!

  # Totals
  totalDeposited: BigInt!
  totalWithdrawn: BigInt!
  totalStaked: BigInt!
  totalUnstaked: BigInt!
  totalClaimed: BigInt!

  # Counters
  uniqueDepositors: Int!
  uniqueStakers: Int!
  depositCount: Int!
  withdrawCount: Int!
}
```

### SFMultiRewardsPosition
**Purpose**: Track staking position per MultiRewards contract (handles migrations)
**ID Pattern**: `{chainId}_{userAddress}_{multiRewardsAddress}`

```graphql
type SFMultiRewardsPosition @entity {
  id: String!
  chainId: Int!
  user: String!
  multiRewards: String!
  vault: String!

  stakedShares: BigInt!
  totalStaked: BigInt!
  totalUnstaked: BigInt!
  totalClaimed: BigInt!

  lastStakeAt: Int!
  lastUnstakeAt: Int!
  lastClaimAt: Int!
}
```

### SFVaultStrategy
**Purpose**: Track strategy version history for migrations
**ID Pattern**: `{chainId}_{strategyAddress}`

```graphql
type SFVaultStrategy @entity {
  id: String!
  chainId: Int!
  vault: String!
  strategy: String!
  multiRewardsAddress: String!

  activeFrom: Int!           # Block when this strategy became active
  activeTo: Int              # Block when replaced (null if current)

  createdAt: Int!
}
```

## Strategy Migration Support

When a vault's strategy is upgraded (new MultiRewards contract), the system:

1. **Captures `MultiRewardsUpdated` event** from Strategy Wrapper
2. **Queries new MultiRewards address** via RPC (with fallback to hardcoded mapping)
3. **Creates new `SFVaultStrategy`** record with timestamps
4. **Updates previous strategy's `activeTo`** field
5. **User positions migrate** - new stakes go to new MultiRewards, old positions preserved

### RPC Fallback Strategy

```typescript
// Layer 1: Try RPC call to strategy contract
const multiRewards = await client.readContract({
  address: strategyAddress,
  functionName: "multiRewardsAddress",
  blockNumber: blockNumber,
});

// Layer 2: If RPC fails, use hardcoded mapping
if (!multiRewards) {
  multiRewards = STRATEGY_TO_MULTI_REWARDS[strategyAddress];
}

// Layer 3: If still not found, check existing SFVaultStrategy in DB
if (!multiRewards) {
  const existing = await context.SFVaultStrategy.get(strategyId);
  multiRewards = existing?.multiRewardsAddress;
}

// Layer 4: Log error and skip event if all fail
```

## Action Types Recorded

All events record Actions for quest verification:

| Event | actionType | numericValue |
|-------|------------|--------------|
| Deposit | `deposit` | shares received |
| Withdraw | `withdraw` | shares burned |
| Staked | `stake` | shares staked |
| Withdrawn | `unstake` | shares unstaked |
| RewardPaid | `claim` | reward amount |
| RebatePaid | `rebate` | rebate amount |

## Example Queries

### Get User's Position
```graphql
query GetUserPosition($user: String!, $vault: String!) {
  SFPosition(where: {
    user: { _eq: $user },
    vault: { _eq: $vault }
  }) {
    vaultShares
    stakedShares
    pendingRewards
    totalDeposited
    totalClaimed
  }
}
```

### Get Vault Statistics
```graphql
query GetVaultStats($vault: String!) {
  SFVaultStats(where: { vault: { _eq: $vault } }) {
    totalDeposited
    totalStaked
    uniqueDepositors
    uniqueStakers
  }
}
```

### Get All User Actions for Quest
```graphql
query GetUserVaultActions($user: String!) {
  Action(where: {
    actor: { _eq: $user },
    actionType: { _in: ["deposit", "stake", "claim"] },
    primaryCollection: { _eq: "sf_vault" }
  }, order_by: { timestamp: desc }) {
    id
    actionType
    numericValue
    timestamp
  }
}
```

## Environment Requirements

- **ENVIO_RPC_URL**: RPC endpoint for strategy contract queries (default: `https://rpc.berachain.com`)

## Testing

Use `config.test-rebate.yaml` for fast testing of RebatePaid events:
```bash
cp config.test-rebate.yaml config.yaml
TUI_OFF=true pnpm dev
```

This syncs only blocks 15,739,170-15,739,180 (~30 seconds) to validate rebate handling.
