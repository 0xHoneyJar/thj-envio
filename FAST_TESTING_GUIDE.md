# Fast Testing Guide for Envio Handler Development

## The Problem

Full chain sync takes hours (Berachain: 15M+ blocks at 24% = many hours wait).
**Solution**: Use targeted block ranges to test in seconds.

---

## Quick Start: Test a New Handler

### 1. Find Target Block(s)

Find a transaction with your event using Berascan or the API:

```bash
# Example: Find RebatePaid events
curl "https://api.routescan.io/v2/network/mainnet/evm/80094/etherscan/api?module=logs&action=getLogs&address=0x34b3668e2ad47ccfe3c53e24a0606b911d1f6a8f&topic0=0xfd14e822f4d36d039a259b4687659a5b8e8b57a8b5c581133d357b0eb4f9bd53&fromBlock=0&toBlock=latest" | jq '.result[0].blockNumber' | xargs printf "%d\n"
```

### 2. Create Test Config

Copy an existing config and add `end_block`:

```yaml
# config.test-myfeature.yaml
name: thj-indexer-test-myfeature
contracts:
  - name: SFMultiRewards
    handler: src/EventHandlers.ts
    events:
      - event: RebatePaid(address indexed user, uint256 amount)
        field_selection:
          transaction_fields:
            - hash

networks:
  - id: 80094
    start_block: 15739170  # Just before target block
    end_block: 15739180    # Just after target block (10 blocks)
    contracts:
      - name: SFMultiRewards
        address:
          - 0x34b3668e2AD47ccFe3C53e24a0606B911D1f6a8f

rollback_on_reorg: false  # Faster in dev
preload_handlers: true
```

### 3. Run Test

```bash
# Terminal 1: Start indexer with test config
TUI_OFF=true pnpm dev --config config.test-myfeature.yaml

# Wait ~30 seconds for sync to complete
```

### 4. Verify Results

```bash
# Terminal 2: Query GraphQL
curl -X POST 'http://localhost:8080/v1/graphql' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "query { Action(where: { actionType: { _eq: \"sf_rewards_rebate\" } }) { id actor actionType numeric1 timestamp } }"
  }' | jq
```

### 5. Iterate

Edit your handler, save, and the dev server auto-reloads. Query again to verify.

---

## Pre-Made Test Configs

| Config | Purpose | Block Range | Sync Time |
|--------|---------|-------------|-----------|
| `config.test-rebate.yaml` | RebatePaid handler | 15739170-15739180 | ~30s |
| `config.sf-vaults.yaml` | All SF Vault handlers | 13869572+ | ~10min |

---

## Event Signature Calculator

Need the topic hash for a new event?

```bash
# Using viem (in thj-envio directory)
node -e "const viem = require('viem'); console.log(viem.keccak256(viem.toHex('YourEvent(address,uint256)')))"

# Example: RebatePaid
# 0xfd14e822f4d36d039a259b4687659a5b8e8b57a8b5c581133d357b0eb4f9bd53
```

---

## Workflow: Adding a New Event Handler

```
1. Write handler code in src/handlers/*.ts
   ↓
2. Add event to config.yaml
   ↓
3. Run codegen: pnpm envio codegen
   ↓
4. Find a block with your event (Berascan/API)
   ↓
5. Create config.test-*.yaml with start_block/end_block
   ↓
6. Test: TUI_OFF=true pnpm dev --config config.test-*.yaml
   ↓
7. Query GraphQL to verify
   ↓
8. Expand block range to test edge cases
   ↓
9. Remove end_block for full test
   ↓
10. Merge & deploy
```

---

## Troubleshooting

### "No events found"

1. Verify block range includes your target event
2. Check contract address is correct
3. Verify event signature matches ABI exactly

### "Handler not found"

1. Run `pnpm envio codegen` after config changes
2. Check handler path in config matches actual file

### Clean restart

```bash
pnpm envio stop
pnpm envio local docker down
pnpm envio local docker up
pnpm dev --config config.test-*.yaml
```

---

## Performance Tips

| Setting | Dev Value | Prod Value | Impact |
|---------|-----------|------------|--------|
| `rollback_on_reorg` | `false` | `true` | Faster dev sync |
| `end_block` | Set it | Remove it | Limits sync range |
| `preload_handlers` | `true` | `true` | Always enable |
| Block range | 10-100 | Full chain | Test vs production |

---

## Integration Testing Checklist

Before promoting to production:

- [ ] Handler compiles: `pnpm envio codegen`
- [ ] Fast test passes: 10-block range with known event
- [ ] Edge cases: Multiple events in same block
- [ ] Full SF vault test: `config.sf-vaults.yaml`
- [ ] Query frontend app with local indexer
- [ ] No TypeScript errors in handler logic

---

## Connecting Frontend to Local Indexer

```bash
# In your app's .env.local
NEXT_PUBLIC_ENVIO_ENDPOINT=http://localhost:8080/v1/graphql
```

Then run your app and test the full flow.
