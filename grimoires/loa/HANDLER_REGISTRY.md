# Handler Registry

> Quick reference: Contract → Handler → Entity mappings

## Handler Modules Overview

| Handler File | Events | Entities | Chain Focus |
|--------------|--------|----------|-------------|
| `honey-jar-nfts.ts` | 6 | 8 | All (HJ Gen1-6) |
| `sf-vaults.ts` | 6 | 4 | Berachain |
| `henlo-vault.ts` | 7 | 6 | Berachain |
| `mibera-liquid-backing.ts` | 8 | 6 | Berachain |
| `mibera-collection.ts` | 1 | 4 | Berachain |
| `mibera-premint.ts` | 2 | 4 | Berachain |
| `mibera-sets.ts` | 2 | 1 | Optimism |
| `mibera-zora.ts` | 2 | 1 | Optimism |
| `tracked-erc20.ts` | 1 | 6 | Berachain |
| `tracked-erc721.ts` | 1 | 2 | Berachain |
| `moneycomb-vault.ts` | 5 | 3 | Berachain |
| `aquabera-wall.ts` | 1 | 2 | Berachain |
| `aquabera-vault-direct.ts` | 2 | 2 | Berachain |
| `paddlefi.ts` | 3 | 5 | Berachain |
| `friendtech.ts` | 1 | 3 | Base |
| `mirror-observability.ts` | 1 | 2 | Optimism |
| `mints.ts` | 2 | 2 | Berachain |
| `mints1155.ts` | 2 | 3 | Berachain |
| `vm-minted.ts` | 1 | 1 | Berachain |
| `badges1155.ts` | 2 | 3 | Berachain |
| `milady-collection.ts` | 1 | 2 | Ethereum |
| `fatbera.ts` | 1 | 1 | Berachain |
| `bgt.ts` | 1 | 1 | Berachain |
| `seaport.ts` | 1 | 0 | Berachain |
| `crayons.ts` | 1 | 0 | Berachain |
| `crayons-collections.ts` | 1 | 1 | Berachain |

---

## Berachain Contracts (Primary Chain - 80094)

### HoneyJar NFTs
| Contract | Address | Handler | Events |
|----------|---------|---------|--------|
| HoneyJar1 Bera | `0xedc5dfd6f37464cc91bbce572b6fe2c97f1bc7b3` | honey-jar-nfts.ts | Transfer |
| HoneyJar2 Bera | `0x1c6c24cac266c791c4ba789c3ec91f04331725bd` | honey-jar-nfts.ts | Transfer |
| HoneyJar3 Bera | `0xf1e4a550772fabfc35b28b51eb8d0b6fcd1c4878` | honey-jar-nfts.ts | Transfer |
| HoneyJar4 Bera | `0xdb602ab4d6bd71c8d11542a9c8c936877a9a4f45` | honey-jar-nfts.ts | Transfer |
| HoneyJar5 Bera | `0x0263728e7f59f315c17d3c180aeade027a375f17` | honey-jar-nfts.ts | Transfer |
| HoneyJar6 Bera | `0xb62a9a21d98478f477e134e175fd2003c15cb83a` | honey-jar-nfts.ts | Transfer |
| Honeycomb Bera | `0x886d2176d899796cd1affa07eff07b9b2b80f1be` | honey-jar-nfts.ts | Transfer |

### Set & Forgetti Vaults
| Contract | Address | Handler | Events |
|----------|---------|---------|--------|
| HLKD1B Vault | `0xF0edfc3e122DB34773293E0E5b2C3A58492E7338` | sf-vaults.ts | Deposit, Withdraw |
| HLKD690M Vault | `0x8AB854dC0672d7a13A85399A56CB628FB22102d6` | sf-vaults.ts | Deposit, Withdraw |
| HLKD420M Vault | `0xF07Fa3ECE9741D408d643748Ff85710BEdEF25bA` | sf-vaults.ts | Deposit, Withdraw |
| HLKD330M Vault | `0x37DD8850919EBdCA911C383211a70839A94b0539` | sf-vaults.ts | Deposit, Withdraw |
| HLKD100M Vault | `0x7Bdf98DdeEd209cFa26bD2352b470Ac8b5485EC5` | sf-vaults.ts | Deposit, Withdraw |
| MultiRewards (5) | Various | sf-vaults.ts | Staked, Withdrawn, RewardPaid, RebatePaid |
| Strategy (5) | Various | sf-vaults.ts | MultiRewardsUpdated |

### Mibera Ecosystem
| Contract | Address | Handler | Events |
|----------|---------|---------|--------|
| Mibera Main | `0x6666397dfe9a8c469bf65dc744cb1c733416c420` | mibera-collection.ts | Transfer |
| Liquid Backing | `0xaa04F13994A7fCd86F3BbbF4054d239b88F2744d` | mibera-liquid-backing.ts | LoanCreated, LoanRepaid, RfvUpdated... |
| Premint | `0xdd5F6f41B250644E5678D77654309a5b6A5f4D55` | mibera-premint.ts | Participated, Refunded |
| Mibera Tarot | `0x4B08a069381EfbB9f08C73D6B2e975C9BE3c4684` | mints.ts | Transfer |

### Vault Systems
| Contract | Address | Handler | Events |
|----------|---------|---------|--------|
| MoneycombVault | `0x9279b2227b57f349a0ce552b25af341e735f6309` | moneycomb-vault.ts | AccountCreated, Deposited, Withdrawn... |
| Aquabera Forwarder | `0xc0c6D4178410849eC9765B4267A73F4F64241832` | aquabera-wall.ts | Deposit |
| Aquabera Vault | `0x04fD6a7B02E2e48caedaD7135420604de5f834f8` | aquabera-vault-direct.ts | Deposit, Withdraw |
| FatBera Vault | `0xBAE11292a3E693AF73651BDa350d752AE4A391d4` | fatbera.ts | Deposit |
| HenloVault | `0x42069E3BF367C403b632CF9cD5a8d61e2c0c44fC` | henlo-vault.ts | RoundCreated, Deposited, EpochEnded... |

### Token Tracking
| Contract | Address | Handler | Events |
|----------|---------|---------|--------|
| HENLO | `0xb2F776e9c1C926C4b2e54182Fac058dA9Af0B6A5` | tracked-erc20.ts | Transfer |
| HLKD1B Token | `0xF0edfc3e122DB34773293E0E5b2C3A58492E7338` | tracked-erc20.ts | Transfer |
| HLKD690M Token | `0x8AB854dC0672d7a13A85399A56CB628FB22102d6` | tracked-erc20.ts | Transfer |
| HLKD420M Token | `0xF07Fa3ECE9741D408d643748Ff85710BEdEF25bA` | tracked-erc20.ts | Transfer |
| HLKD330M Token | `0x37DD8850919EBdCA911C383211a70839A94b0539` | tracked-erc20.ts | Transfer |
| HLKD100M Token | `0x7Bdf98DdeEd209cFa26bD2352b470Ac8b5485EC5` | tracked-erc20.ts | Transfer |

### Other Berachain
| Contract | Address | Handler | Events |
|----------|---------|---------|--------|
| BGT Token | `0x656b95E550C07a9ffe548Bd4085c72418Ceb1dBa` | bgt.ts | QueueBoost |
| CandiesMarket | `0x80283fbF2b8E50f6Ddf9bfc4a90A8336Bc90E38F` | mints1155.ts | TransferSingle, TransferBatch |
| Cub Badges | `0x574617ab9788e614b3eb3f7bd61334720d9e1aac` | badges1155.ts | TransferSingle, TransferBatch |
| PaddleFi Vault | `0x242b7126F3c4E4F8CbD7f62571293e63E9b0a4E1` | paddlefi.ts | Supply, Pawn, Liquidation |
| Seaport v1.6 | `0x0000000000000068F116a894984e2DB1123eB395` | seaport.ts | OrderFulfilled |
| Crayons Factory | `0xF1c7d49B39a5aCa29ead398ad9A7024ed6837F87` | crayons.ts | CollectionCreated |

---

## Other Chains

### Ethereum (Chain ID: 1)
| Contract | Address | Handler | Events |
|----------|---------|---------|--------|
| HoneyJar1 | `0xa20cf9b0874c3e46b344deaeea9c2e0c3e1db37d` | honey-jar-nfts.ts | Transfer |
| HoneyJar6 | `0x98dc31a9648f04e23e4e36b0456d1951531c2a05` | honey-jar-nfts.ts | Transfer |
| Honeycomb | `0xcb0477d1af5b8b05795d89d59f4667b59eae9244` | honey-jar-nfts.ts | Transfer |
| Milady Maker | `0x5af0d9827e0c53e4799bb226655a1de152a425a5` | milady-collection.ts | Transfer |

### Arbitrum (Chain ID: 42161)
| Contract | Address | Handler | Events |
|----------|---------|---------|--------|
| HoneyJar2 | `0x1b2751328f41d1a0b91f3710edcd33e996591b72` | honey-jar-nfts.ts | Transfer |

### Zora (Chain ID: 7777777)
| Contract | Address | Handler | Events |
|----------|---------|---------|--------|
| HoneyJar3 | `0xe798c4d40bc050bc93c7f3b149a0dfe5cfc49fb0` | honey-jar-nfts.ts | Transfer |

### Optimism (Chain ID: 10)
| Contract | Address | Handler | Events |
|----------|---------|---------|--------|
| HoneyJar4 | `0xe1d16cc75c9f39a2e0f5131eb39d4b634b23f301` | honey-jar-nfts.ts | Transfer |
| Mibera Sets | `0x886d2176d899796cd1affa07eff07b9b2b80f1be` | mibera-sets.ts | TransferSingle, TransferBatch |
| Mibera Zora | `0x427a8f2e608e185eece69aca15e535cd6c36aad8` | mibera-zora.ts | TransferSingle, TransferBatch |
| Mirror Obs. | `0x4c2393aae4f0ad55dfd4ddcfa192f817d1b28d1f` | mirror-observability.ts | Purchase |

### Base (Chain ID: 8453)
| Contract | Address | Handler | Events |
|----------|---------|---------|--------|
| HoneyJar5 | `0xbad7b49d985bbfd3a22706c447fb625a28f048b4` | honey-jar-nfts.ts | Transfer |
| friend.tech | `0xCF205808Ed36593aa40a44F10c7f7C2F67d4A4d4` | friendtech.ts | Trade |
| MiberaMaker333 | `0x120756ccc6f0cefb43a753e1f2534377c2694bb4` | tracked-erc20.ts | Transfer |

---

## Event → Entity Mapping

| Event Type | Entity Created | Handler |
|------------|----------------|---------|
| ERC721 Transfer | MintEvent, Transfer, Holder, Token | honey-jar-nfts.ts, mints.ts |
| ERC1155 TransferSingle | Erc1155MintEvent, CandiesInventory | mints1155.ts, badges1155.ts |
| Vault Deposit | SFPosition, SFVaultStats, Action | sf-vaults.ts |
| Vault Withdraw | SFPosition, SFVaultStats, Action | sf-vaults.ts |
| Staked | SFMultiRewardsPosition, Action | sf-vaults.ts |
| RewardPaid | SFPosition, Action | sf-vaults.ts |
| RebatePaid | SFMultiRewardsPosition, Action | sf-vaults.ts |
| LoanCreated | MiberaLoan, MiberaLoanStats | mibera-liquid-backing.ts |
| QueueBoost | BgtBoostEvent | bgt.ts |
| Trade (friend.tech) | FriendtechTrade, FriendtechHolder | friendtech.ts |

---

## Action Types by Handler

| Handler | Action Types Recorded |
|---------|----------------------|
| sf-vaults.ts | deposit, withdraw, stake, unstake, claim |
| mints.ts | mint |
| mibera-collection.ts | mint, burn |
| mibera-premint.ts | premint_participate, premint_refund |
| paddlefi.ts | supply, pawn |
| friendtech.ts | trade |
| mirror-observability.ts | purchase |
| aquabera-*.ts | deposit, withdraw |
| moneycomb-vault.ts | deposit, withdraw, claim |

---

---

## Handler System Details

### Henlocker Vault System (`henlo-vault.ts`)

The Henlocker vault system manages HENLOCKED token minting and a round-based deposit vault.

**Architecture**:
```
User → HenloVault Contract → Handler
                ↓
  ┌─────────────┼─────────────┐
  ↓             ↓             ↓
HenloVaultRound  HenloVaultDeposit  HenloVaultBalance
       ↓                              ↓
HenloVaultEpoch              HenloVaultStats
       ↓
HenloVaultUser
```

**Events Tracked**:
| Event | Entity | Purpose |
|-------|--------|---------|
| RoundCreated | HenloVaultRound | New vault round with strike price |
| Deposited | HenloVaultDeposit, HenloVaultBalance | User deposit + balance update |
| Withdrawn | HenloVaultBalance | Balance decrease |
| DepositsUnpaused | HenloVaultRound | Round activation |
| MintFromReservoir | TrackedTokenBalance | HENLOCKED token minting |
| Redeem | HenloVaultBalance | Token redemption |
| ReservoirSet | HenloVaultEpoch | Epoch reservoir configuration |

**HENLOCKED Token Tiers**:
| Strike | Token Key | FDV Target |
|--------|-----------|------------|
| 20,000 | hlkd20m | $20M |
| 100,000 | hlkd100m | $100M |
| 330,000 | hlkd330m | $330M |
| 420,000 | hlkd420m | $420M |
| 690,000 | hlkd690m | $690M |
| 1,000,000 | hlkd1b | $1B |

---

### Mibera Loan System (`mibera-liquid-backing.ts`)

Manages NFT-collateralized loans and a treasury marketplace for defaulted NFTs.

**Architecture**:
```
User → LiquidBacking Contract → Handler
                ↓
  ┌─────────────┴─────────────┐
  ↓                           ↓
MiberaLoan              TreasuryItem
  ↓                           ↓
MiberaLoanStats         TreasuryStats
                              ↓
                       TreasuryActivity
                              ↓
                       DailyRfvSnapshot
```

**Events Tracked**:
| Event | Entity | Purpose |
|-------|--------|---------|
| LoanReceived | MiberaLoan, MiberaLoanStats | New collateralized loan |
| BackingLoanPayedBack | MiberaLoan, MiberaLoanStats | Loan repayment |
| BackingLoanExpired | MiberaLoan, MiberaLoanStats | Defaulted loan |
| ItemLoaned | TreasuryItem | NFT loaned from treasury |
| LoanItemSentBack | TreasuryItem | Loaned NFT returned |
| ItemLoanExpired | TreasuryItem | Expired item loan |
| ItemPurchased | TreasuryItem, TreasuryActivity | NFT sold from treasury |
| ItemRedeemed | TreasuryItem, TreasuryActivity | NFT redeemed by original owner |
| RFVChanged | DailyRfvSnapshot | Real Floor Value update |

**Key Features**:
- Loan lifecycle tracking (created → repaid/defaulted)
- Treasury NFT marketplace
- Daily RFV (Real Floor Value) snapshots
- Loan statistics aggregation

---

### PaddleFi Integration (`paddlefi.ts`)

NFT-backed lending protocol on Berachain where users can supply BERA or use Mibera NFTs as collateral.

**Architecture**:
```
User → PaddleFi Vault → Handler
              ↓
  ┌───────────┴───────────┐
  ↓                       ↓
PaddleSupply       PaddlePawn
  ↓                       ↓
PaddleSupplier     PaddleBorrower
              ↓
     PaddleLiquidation
```

**Events Tracked**:
| Event | Entity | Purpose |
|-------|--------|---------|
| Mint (Supply) | PaddleSupply, PaddleSupplier | BERA supplied to pool |
| Pawn | PaddlePawn, PaddleBorrower | NFT deposited as collateral |
| LiquidateBorrow | PaddleLiquidation | Borrower liquidated |

**Contract**: `0x242b7126F3c4E4F8CbD7f62571293e63E9b0a4E1`

---

### friend.tech Integration (`friendtech.ts`)

Tracks key trading on Base for Mibera-related subjects (jani key, charlotte fang key).

**Architecture**:
```
User → friend.tech Contract → Handler
               ↓
  ┌────────────┴────────────┐
  ↓                         ↓
FriendtechTrade     FriendtechHolder
                          ↓
               FriendtechSubjectStats
```

**Events Tracked**:
| Event | Entity | Purpose |
|-------|--------|---------|
| Trade | FriendtechTrade, FriendtechHolder, FriendtechSubjectStats | Buy/sell key trades |

**Tracked Subjects** (defined in constants):
- Only Mibera-related subject addresses are indexed
- Filters out non-Mibera trades for efficiency

**Contract**: `0xCF205808Ed36593aa40a44F10c7f7C2F67d4A4d4` (Base)

---

### Mirror Observability (`mirror-observability.ts`)

Tracks article NFT purchases from Mirror's WritingEditions contracts on Optimism.

**Architecture**:
```
User → Mirror Observability → Handler
              ↓
  ┌───────────┴───────────┐
  ↓                       ↓
MirrorArticlePurchase  MirrorArticleStats
```

**Events Tracked**:
| Event | Entity | Purpose |
|-------|--------|---------|
| WritingEditionPurchased | MirrorArticlePurchase, MirrorArticleStats | Article NFT purchase |

**Features**:
- Filters to only Mibera lore articles
- Maps clone addresses to human-readable article keys
- Tracks purchase statistics per article

**Contract**: `0x4c2393aae4f0ad55dfd4ddcfa192f817d1b28d1f` (Optimism)

---

## Config.yaml Cross-Reference

The handler mappings are defined in `config.yaml`. Key sections:

- **Lines 1-100**: Network configurations (start blocks)
- **Lines 100-300**: HoneyJar contracts (all chains)
- **Lines 300-450**: Set & Forgetti system (vaults, strategies, MultiRewards)
- **Lines 450-550**: Mibera ecosystem
- **Lines 550-650**: Other Berachain contracts
- **Lines 650-700**: External chain contracts

To add a new contract:
1. Add to appropriate section in `config.yaml`
2. Create/update handler in `src/handlers/`
3. Add entities to `schema.graphql` if needed
4. Run `pnpm codegen`
5. **IMPORTANT**: Reset indexer if historical events needed
