# Indexer Deployment Guide

## Problem: Historical Tarot Mints Not Indexed

### Root Cause
The tarot contract (0x4B08a069381EfbB9f08C73D6B2e975C9BE3c4684) was added to the GeneralMints handler AFTER users had already minted. The indexer needs to reprocess historical blocks to capture these mints.

### User Details
- **Address**: 0xd4920bb5a6c032eb3bce21e0c7fdac9eefa8d3f1
- **Transaction**: 0xb5ff5e83e337e801e3c0e0e0cfb10752acad01c6b9f931260839f10fa56becf0
- **Block**: 12,313,339
- **Date**: Oct 27, 2025 03:21 AM UTC

### Current Status
✅ Config is correct (commit 0879693)
✅ New tarot mints are being captured
❌ Historical mints before deployment are NOT captured

---

## Solution 1: Reset HyperIndex Deployment (RECOMMENDED)

### Steps:
1. Go to https://hosted.envio.dev
2. Log in with your Envio account
3. Find deployment ID: `029ffba`
4. Click "Reset" or "Redeploy from Start Block"
5. Wait for sync to complete (may take 30-60 minutes)

### Verification:
```bash
# Check if user's mint is now indexed
curl -X POST 'https://indexer.hyperindex.xyz/029ffba/v1/graphql' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "query { Action(where: { txHash: { _eq: \"0xb5ff5e83e337e801e3c0e0e0cfb10752acad01c6b9f931260839f10fa56becf0\" } }) { id actor actionType primaryCollection timestamp } }"
  }' | jq
```

Expected: Should return the mint event with `actionType: "mint"` and `primaryCollection: "mibera_tarot"`

---

## Solution 2: Test Locally Before Production Reset

### 1. Start Local Indexer
```bash
cd /Users/zksoju/Documents/GitHub/thj-api/thj-envio
TUI_OFF=true pnpm dev
```

This will:
- Start local indexer on http://localhost:8080/v1/graphql
- Process from start_block: 866,405
- Capture the user's mint at block 12,313,339

### 2. Wait for Sync
Monitor logs until you see:
```
Syncing block 12,313,339...
```

Or check current sync status:
```bash
curl -X POST 'http://localhost:8080/v1/graphql' \
  -H 'Content-Type: application/json' \
  -d '{"query": "query { Action(order_by: {timestamp: desc}, limit: 1) { timestamp } }"}' | jq
```

### 3. Test Query
Once synced past block 12,313,339:
```bash
curl -X POST 'http://localhost:8080/v1/graphql' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "query { Action(where: { actor: { _eq: \"0xd4920bb5a6c032eb3bce21e0c7fdac9eefa8d3f1\" }, actionType: { _eq: \"mint\" }, primaryCollection: { _eq: \"mibera_tarot\" } }) { id actor timestamp } }"
  }' | jq
```

Expected: Should return the user's mint

### 4. Test CubQuests Locally
```bash
cd /Users/zksoju/Documents/GitHub/thj-api/cubquests-interface

# Update .env.local to use local indexer
echo "NEXT_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:8080/v1/graphql" >> .env.local

npm run dev
```

Visit http://localhost:3001/quests/harbor-initiation and test verification.

---

## Solution 3: Temporary Workaround (NOT RECOMMENDED)

Ask the user to mint another tarot NFT. The new mint will be captured by the current indexer configuration.

**Downsides:**
- Costs gas
- Doesn't solve the problem for other users
- Only a band-aid fix

---

## After Reset: Update Documentation

Once the reset is complete and verified:

1. Update `cubquests-interface/docs/TAROT_MINT_VERIFICATION_TROUBLESHOOTING.md`:
   - Change status to "RESOLVED"
   - Document the solution
   - Note the reset date/time

2. Test with the failing user:
   - Address: 0xd4920bb5a6c032eb3bce21e0c7fdac9eefa8d3f1
   - Quest: Harbor Initiation, Step 2
   - Expected: Verification succeeds ✅

---

## Prevention for Future Contract Additions

When adding new contracts to handlers mid-stream:

1. ✅ Update config.yaml
2. ✅ Update handler constants
3. ✅ Commit changes
4. ⚠️ **IMPORTANT**: Reset indexer to reprocess from start_block
5. ✅ Verify historical events are captured
6. ✅ Deploy to production

**Rule**: Any contract added after initial deployment requires an indexer reset to capture historical events.

---

## Quick Reference

### Production Indexer
- **URL**: https://indexer.hyperindex.xyz/029ffba/v1/graphql
- **Deployment ID**: 029ffba
- **Start Block**: 866,405
- **Chain**: Berachain Mainnet (80094)

### Key Commits
- **0879693**: Add mibera_tarot to GeneralMints handler
- **4f3becc7**: Update quest to use mibera_tarot collection

### Test Queries
```bash
# Check all tarot mints
curl -X POST 'https://indexer.hyperindex.xyz/029ffba/v1/graphql' \
  -H 'Content-Type: application/json' \
  -d '{"query": "query { Action(where: { primaryCollection: { _eq: \"mibera_tarot\" }, actionType: { _eq: \"mint\" } }, limit: 10) { id actor timestamp } }"}' | jq

# Check specific user
curl -X POST 'https://indexer.hyperindex.xyz/029ffba/v1/graphql' \
  -H 'Content-Type: application/json' \
  -d '{"query": "query { Action(where: { actor: { _eq: \"0xd4920bb5a6c032eb3bce21e0c7fdac9eefa8d3f1\" }, actionType: { _eq: \"mint\" } }) { id actionType primaryCollection timestamp } }"}' | jq
```

---

**Status**: Awaiting HyperIndex reset to capture historical tarot mints
**Next Action**: Log in to hosted.envio.dev and reset deployment 029ffba
