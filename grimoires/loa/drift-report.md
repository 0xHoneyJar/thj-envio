# Drift Report - THJ Envio Indexer

> Generated: 2026-01-26 | Framework: Loa v1.7.1

## Executive Summary

**Critical Infrastructure**: Single source of truth for CubQuests, Score API, and Set&Forgetti apps.

| Drift Type | Count | Severity |
|------------|-------|----------|
| Ghosts (documented but missing) | 2 | Medium |
| Shadows (exists but undocumented) | 8 | High |
| Conflicts (code disagrees with docs) | 3 | Medium |

---

## Ghosts (Documented But Missing)

### G-1: Trade Handlers (Medium)
**Documented in**: `src/EventHandlers.ts:137-147`
**Expected**: Mibera and Cargo trade handlers
**Reality**: Commented out with TODO - TypeScript errors prevent compilation
**Files**: `.temp_wip/cargo-trades.ts`, `.temp_wip/mibera-trades.ts`
**Impact**: Trading features not functional

### G-2: Aquabera Withdrawal Handler (Low)
**Documented in**: `src/EventHandlers.ts:30`
**Expected**: `handleAquaberaWithdraw` handler
**Reality**: Intentionally not implemented - forwarder contract doesn't emit withdrawal events
**Impact**: None - design limitation of external contract

---

## Shadows (Exists But Undocumented)

### S-1: Set & Forgetti Vault System (HIGH)
**Location**: `src/handlers/sf-vaults.ts` (900+ lines)
**Features**:
- ERC4626 vault deposits/withdrawals
- MultiRewards staking/claiming
- Strategy migration support
- RebatePaid event tracking
**Documentation Gap**: Not mentioned in README.md or CLAUDE.md
**Impact**: Major feature invisible to developers

### S-2: Henlocker Vault System (HIGH)
**Location**: `src/handlers/henlo-vault.ts` (400+ lines)
**Features**:
- Round-based deposits per strike price
- Epoch aggregation
- User balance tracking
**Documentation Gap**: No external documentation
**Impact**: Feature discovery requires code reading

### S-3: Mibera Loan System (HIGH)
**Location**: `src/handlers/mibera-liquid-backing.ts`
**Features**:
- NFT-backed loans
- Real Floor Value (RFV) tracking
- Treasury marketplace
- Daily RFV snapshots
**Documentation Gap**: No architecture or usage docs
**Impact**: Complex system undiscoverable

### S-4: PaddleFi Integration (Medium)
**Location**: `src/handlers/paddlefi.ts`
**Features**: BERA supply, NFT pawn, liquidations
**Documentation Gap**: Not documented anywhere

### S-5: friend.tech Integration (Medium)
**Location**: `src/handlers/friendtech.ts`
**Features**: Key trading on Base chain
**Documentation Gap**: Not documented

### S-6: Mirror Observability (Medium)
**Location**: `src/handlers/mirror-observability.ts`
**Features**: Article purchases on Optimism
**Documentation Gap**: Not documented

### S-7: 88+ GraphQL Entities (HIGH)
**Location**: `schema.graphql` (1,066 lines)
**Reality**: Complex data model with relationships
**Documentation Gap**: No schema documentation or ERD
**Impact**: Data consumers lack guidance

### S-8: Multi-Chain Architecture (HIGH)
**Reality**: 6 chains, 50+ contracts, unordered multichain mode
**Documentation Gap**: No architecture diagram or chain registry
**Impact**: Operational risk - unclear which chains/contracts active

---

## Conflicts (Code Disagrees with Docs)

### C-1: Envio Version Mismatch
**CLAUDE.md**: Claims "Envio 2.27.3"
**package.json:24**: Actual version is `2.32.2`
**Severity**: Low - documentation outdated
**Fix**: Update CLAUDE.md

### C-2: Production Issue Pending
**DEPLOYMENT_GUIDE.md**: Documents tarot mint issue as "Awaiting HyperIndex reset"
**Status**: Unresolved - historical mints not captured
**Severity**: Medium - affects user quest verification
**Impact**: User 0xd4920bb5a6c032eb3bce21e0c7fdac9eefa8d3f1 cannot verify tarot mint

### C-3: Test Config Existence
**FAST_TESTING_GUIDE.md**: References `config.sf-vaults.yaml`
**Reality**: File may not exist (not verified in config files list)
**Severity**: Low - may cause confusion

---

## Handler Completeness Matrix

| Handler File | Events | Entities | Documented | Error Handling |
|--------------|--------|----------|------------|----------------|
| honey-jar-nfts.ts | 6 | 8 | Partial | ⚠️ Basic |
| sf-vaults.ts | 6 | 4 | ❌ None | ✅ Excellent |
| henlo-vault.ts | 7 | 6 | ❌ None | ✅ Good |
| mibera-liquid-backing.ts | 8 | 6 | ❌ None | ⚠️ Basic |
| tracked-erc20.ts | 1 | 6 | ❌ None | ✅ Good |
| moneycomb-vault.ts | 5 | 3 | ❌ None | ⚠️ Missing |
| friendtech.ts | 1 | 3 | ❌ None | ⚠️ Missing |
| paddlefi.ts | 3 | 5 | ❌ None | ⚠️ Basic |

---

## Security Concerns

### SEC-1: Default GraphQL Password in Docs
**Location**: README.md line 11
**Issue**: `local password is "testing"`
**Risk**: If copied to production, exposes API
**Recommendation**: Document as LOCAL ONLY explicitly

### SEC-2: Unsafe Type Casts
**Locations**:
- `sf-vaults.ts:132` - `context as any`
- `burn-tracking.ts:105` - `context as any`
- `mibera-collection.ts:54` - `event.transaction as any`
**Risk**: Runtime type errors possible
**Mitigation**: Optional chaining used (`.?`) - acceptable

---

## Hygiene Issues

### HYG-1: WIP Files in Root
**Location**: `.temp_wip/` directory
**Files**: `cargo-trades.ts`, `mibera-trades.ts`
**Recommendation**: Move to `src/handlers/` when fixed, or delete

### HYG-2: Inconsistent Logging
**Files**: `vm-minted.ts`, `tracked-erc20.ts`
**Issue**: Use `console.*` instead of `context.log.*`
**Impact**: Logs may not appear in Envio dashboard

### HYG-3: TODO Comments
**Count**: 7 identified
**Critical**: Trade handler TypeScript errors (EventHandlers.ts:137)
**Low**: Burn source tracking addresses (tracked-erc20/constants.ts:16-17)

---

## Recommendations by Priority

### P0 - Critical (Address Before Production Changes)
1. **Document S&F Vault System** - Major feature with no docs
2. **Resolve Tarot Mint Issue** - Reset HyperIndex deployment 914708e
3. **Create Handler Registry** - Map contracts → handlers → entities

### P1 - High (Address This Sprint)
4. **Document Multi-Chain Architecture** - 6 chains need diagram
5. **Create Schema Documentation** - 88 entities need ERD
6. **Update CLAUDE.md** - Envio version 2.27.3 → 2.32.2

### P2 - Medium (Address This Cycle)
7. **Add Error Handling** - moneycomb-vault.ts, friendtech.ts
8. **Standardize Logging** - Replace console.* with context.log.*
9. **Resolve Trade Handlers** - Fix TypeScript errors or remove WIP

### P3 - Low (Backlog)
10. **Document Burn Tracking** - Add OverUnder/BeraTrackr addresses when available
11. **Archive DEPLOYMENT_GUIDE.md** - Move to grimoires after tarot issue resolved
12. **Verify Test Configs** - Confirm config.sf-vaults.yaml exists

---

## Code Health Score

| Category | Score | Notes |
|----------|-------|-------|
| Structure | 9/10 | Excellent modular organization |
| Documentation | 4/10 | Major features undocumented |
| Error Handling | 7/10 | Good in new code, gaps in older handlers |
| Type Safety | 7/10 | 6 `as any` casts, all mitigated |
| Test Coverage | 5/10 | BATS tests for Loa, limited handler tests |
| Security | 8/10 | Good patterns, minor doc exposure |

**Overall**: 6.7/10 - Solid codebase with documentation debt

---

## Next Steps

1. Review this drift report with team
2. Run `/sprint-plan` to create tasks for P0/P1 items
3. Create `grimoires/loa/sdd.md` with architecture documentation
4. Update NOTES.md with decisions made
