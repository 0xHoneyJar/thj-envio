# Drift Analysis Report: THJ Envio Indexer

**Codebase**: `thj-envio`
**Analysis date**: 2025-12-21
**Method**: Three-way comparison (Code ↔ Legacy Docs ↔ User Context)

---

## Summary

| Category | Status | Items |
|----------|--------|-------|
| Code-Doc Alignment | ⚠️ Minimal docs | 3 legacy files |
| Missing Documentation | 🔴 Critical | Handler patterns undocumented |
| Outdated Information | ✅ N/A | Docs are too minimal to be wrong |
| Feature Gaps | ⚠️ Moderate | Trade handlers commented out |

---

## 1. Legacy Documentation Inventory

### 1.1 Existing Files

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `README.md` | 24 | Basic Envio boilerplate | ❌ Minimal, generic |
| `CLAUDE.md` | 24 | Claude Code guidance | ✅ Accurate but brief |
| `DEPLOYMENT_GUIDE.md` | ~200 | Production deployment | ✅ Appears current |

### 1.2 Assessment

**README.md** (Critical Gap):
- Only contains generic Envio template text
- No mention of THJ-specific domains
- No handler documentation
- No entity relationship overview

**CLAUDE.md** (Adequate):
- Correctly references `envio-patterns` skill
- Mentions key commands (`pnpm codegen`, `pnpm dev`)
- Brief but accurate

**DEPLOYMENT_GUIDE.md** (Good):
- Detailed production setup
- Environment configuration
- Likely maintained with deployments

---

## 2. Code-Documentation Drift

### 2.1 Undocumented Features (Code exists, docs missing)

| Feature | Code Location | Documentation |
|---------|---------------|---------------|
| 37 handler modules | `src/handlers/` | ❌ None |
| 60+ entity types | `schema.graphql` | ❌ None |
| Multi-chain config | `config.yaml` | ❌ None |
| RPC effects pattern | `sf-vaults.ts` | ❌ None |
| Action recording | `lib/actions.ts` | ❌ None |
| Burn source detection | `tracked-erc20/` | ❌ None |
| Strategy migration | `SFVaultStrategy` | ❌ None |

### 2.2 Documented Features (Docs exist, code matches)

| Feature | Documentation | Code Status |
|---------|---------------|-------------|
| `pnpm dev` command | CLAUDE.md | ✅ Works |
| `pnpm codegen` command | CLAUDE.md | ✅ Works |
| GraphQL playground | README.md | ✅ Localhost:8080 |

### 2.3 Stale/Incorrect Documentation

None found - docs are too minimal to have become incorrect.

---

## 3. User Context vs Code Reality

### 3.1 User Provided Context

> "This indexes THJ ecosystem contracts (S&F strategies, Henlo burns, CubQuests)"

**Validation**:
- ✅ S&F strategies: `sf-vaults.ts` (30k lines, most complex handler)
- ✅ Henlo burns: `tracked-erc20/burn-tracking.ts` + `HenloBurnStats`
- ✅ CubQuests: `badges1155.ts` + `Action` entity

> "Uses Envio's HyperIndex with config.yaml as the contract registry"

**Validation**:
- ✅ config.yaml: 671 lines, defines all contracts across 6 chains
- ✅ Contract count: 40+ unique contract types

> "Has GraphQL schema defining entities like Strategy, HenloProfile, etc."

**Validation**:
- ⚠️ `SFVaultStrategy` exists (not just "Strategy")
- ❌ `HenloProfile` does not exist → `HenloHolder` is the actual entity
- User context was hypothesis, code is truth

---

## 4. Critical Gaps

### 4.1 P0 - Must Document

1. **Handler Pattern Guide**: How to add new handlers
2. **Entity ID Conventions**: Prevent ID collisions
3. **Multi-chain Considerations**: Chain-specific logic patterns

### 4.2 P1 - Should Document

1. **Domain Overview**: What each handler module does
2. **Quest Verification Queries**: Standard GraphQL patterns
3. **RPC Effects Usage**: When and how to use

### 4.3 P2 - Nice to Have

1. **Entity Relationship Diagrams**: Visual documentation
2. **Testing Guide**: How to validate changes
3. **Performance Considerations**: Large entity handling

---

## 5. Technical Debt Identified

### 5.1 Commented Out Code

From `EventHandlers.ts`:
```typescript
// TODO: Fix TypeScript errors in trade handlers before uncommenting
// import { handleMiberaTradeProposed, ... } from "./handlers/mibera-trades";
// import { handleCandiesTradeProposed, ... } from "./handlers/cargo-trades";
```

**Impact**: Trade features are defined in schema but not indexed

### 5.2 Placeholder Implementations

| Handler | Issue |
|---------|-------|
| `handleCrayonsErc721Transfer` | Minimal implementation |
| `handleAquaberaWithdraw` | Not implemented (forwarder limitation) |

### 5.3 Hardcoded Fallbacks

`STRATEGY_TO_MULTI_REWARDS` in `sf-vaults.ts`:
- Hardcoded mapping for RPC fallback
- Must be updated when new strategies deploy

---

## 6. Recommendations

### 6.1 Immediate Actions

1. ✅ **Created**: `prd.md` - Product requirements from code
2. ✅ **Created**: `sdd.md` - Software design from code
3. ✅ **Created**: `reality/handler-patterns.md` - Handler documentation
4. ✅ **Created**: `reality/entity-relationships.md` - Entity documentation

### 6.2 Future Maintenance

1. **Update on Schema Changes**: Run `/adopt --phase reality` after `schema.graphql` changes
2. **Monitor Trade Handlers**: Uncomment when TypeScript errors fixed
3. **Track Strategy Migrations**: Update `STRATEGY_TO_MULTI_REWARDS` on new deployments

### 6.3 Legacy Doc Disposition

| File | Recommendation |
|------|----------------|
| `README.md` | Keep for Envio compatibility, link to Loa docs |
| `CLAUDE.md` | Superseded by Loa artifacts |
| `DEPLOYMENT_GUIDE.md` | Keep as operational runbook |

---

## 7. Drift Monitoring Setup

Add to CI/CD or manual checklist:

```bash
# Detect handler/schema drift
diff <(ls src/handlers/*.ts | wc -l) <(grep "handler:" reality/handler-patterns.md | wc -l)

# Detect entity drift
diff <(grep "^type " schema.graphql | wc -l) <(grep "Entity Types" prd.md)
```

---

*This drift report should be regenerated when significant codebase changes occur.*
