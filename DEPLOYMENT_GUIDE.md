# Indexer Deployment Guide

> Last Updated: 2026-01-27

## Production Indexer

- **URL**: https://indexer.hyperindex.xyz/914708e/v1/graphql
- **Deployment ID**: `914708e`
- **Start Block**: 866,405
- **Chain**: Berachain Mainnet (80094)

---

## Historical Issue: Tarot Mints (RESOLVED)

### Background
The tarot contract (0x4B08a069381EfbB9f08C73D6B2e975C9BE3c4684) was added to the GeneralMints handler AFTER users had already minted. Historical mints required an indexer reset.

### Original User Report
- **Address**: 0xd4920bb5a6c032eb3bce21e0c7fdac9eefa8d3f1
- **Transaction**: 0xb5ff5e83e337e801e3c0e0e0cfb10752acad01c6b9f931260839f10fa56becf0
- **Block**: 12,313,339
- **Date**: Oct 27, 2025 03:21 AM UTC

### Resolution
The indexer was reset to reprocess from start_block, capturing all historical tarot mints.

---

## Resetting the Indexer

When you need to capture historical events (e.g., after adding a new contract):

### Steps:
1. Go to https://hosted.envio.dev
2. Log in with your Envio account
3. Find deployment ID: `914708e`
4. Click "Reset" or "Redeploy from Start Block"
5. Wait for sync to complete (may take 30-60 minutes for full sync)

### Verification:
```bash
# Check if events are now indexed
curl -X POST 'https://indexer.hyperindex.xyz/914708e/v1/graphql' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "query { Action(where: { txHash: { _eq: \"YOUR_TX_HASH\" } }) { id actor actionType primaryCollection timestamp } }"
  }' | jq
```

---

## Local Testing Before Production Reset

### 1. Start Local Indexer
```bash
TUI_OFF=true pnpm dev
```

This will:
- Start local indexer on http://localhost:8080/v1/graphql
- Process from start_block: 866,405

### 2. Check Sync Status
```bash
curl -X POST 'http://localhost:8080/v1/graphql' \
  -H 'Content-Type: application/json' \
  -d '{"query": "query { Action(order_by: {timestamp: desc}, limit: 1) { timestamp } }"}' | jq
```

### 3. Test Your Query
```bash
curl -X POST 'http://localhost:8080/v1/graphql' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "query { Action(where: { actor: { _eq: \"0xYOUR_ADDRESS\" }, actionType: { _eq: \"mint\" } }) { id actor timestamp } }"
  }' | jq
```

---

## Fast Testing

For quick validation without full sync, use targeted block ranges:

```bash
# Use test config with limited block range
cp config.test-rebate.yaml config.yaml
TUI_OFF=true pnpm dev
```

See `FAST_TESTING_GUIDE.md` for details.

---

## Prevention for Future Contract Additions

When adding new contracts to handlers mid-stream:

1. ✅ Update config.yaml
2. ✅ Update handler constants
3. ✅ Run `pnpm codegen`
4. ✅ Commit changes
5. ⚠️ **IMPORTANT**: Reset indexer to reprocess from start_block
6. ✅ Verify historical events are captured
7. ✅ Deploy to production

**Rule**: Any contract added after initial deployment requires an indexer reset to capture historical events.

---

## Key Commits Reference

| Commit | Description |
|--------|-------------|
| 0879693 | Add mibera_tarot to GeneralMints handler |
| 4f3becc7 | Update quest to use mibera_tarot collection |

---

## Test Queries

```bash
# Check all tarot mints
curl -X POST 'https://indexer.hyperindex.xyz/914708e/v1/graphql' \
  -H 'Content-Type: application/json' \
  -d '{"query": "query { Action(where: { primaryCollection: { _eq: \"mibera_tarot\" }, actionType: { _eq: \"mint\" } }, limit: 10) { id actor timestamp } }"}' | jq

# Check specific user
curl -X POST 'https://indexer.hyperindex.xyz/914708e/v1/graphql' \
  -H 'Content-Type: application/json' \
  -d '{"query": "query { Action(where: { actor: { _eq: \"0xd4920bb5a6c032eb3bce21e0c7fdac9eefa8d3f1\" }, actionType: { _eq: \"mint\" } }) { id actionType primaryCollection timestamp } }"}' | jq
```
