## freeside-sonar — THJ Onchain Indexer

Blockchain event indexer for the THJ ecosystem. Single source of truth for CubQuests, Score API, Set&Forgetti, ApiologyDAO governance, and Mibera substrate.

Built on [HyperIndex V3](https://docs.envio.dev/docs/HyperIndex). Indexes 6 chains: Ethereum, Optimism, Arbitrum, Base, Berachain (primary), and Zora.

> **Adding a contract source?** Read [SCALE.md](./SCALE.md) first. Skipping the source-addition checklist has cost the project multi-hour reindex windows that blocked downstream consumers (apdao governance, score-mibera, mibera-codex, dimensions). The PR template will prompt you for the relevant fields.

### Active Production Deployment

| Endpoint | ID | Status |
|---|---|---|
| `https://indexer.hyperindex.xyz/b5da47c/v1/graphql` | `b5da47c` | **Authoritative production** (until [Decision Log D1](./SCALE.md#decision-log-operator-pair-points)) |
| `https://indexer.hyperindex.xyz/914708e/v1/graphql` | `914708e` | Parallel mirror, identical state |

### Local Development

```bash
TUI_OFF=true pnpm dev
```

Visit http://localhost:8080 to see the GraphQL Playground.

> **LOCAL DEVELOPMENT ONLY**: The default password is `testing`. This is for local development only. Production endpoints require proper authentication.

### Generate files from `config.yaml` or `schema.graphql`

```bash
pnpm codegen
```

### Pre-requisites

- [Node.js v22+](https://nodejs.org/en/download/current) — V3 requirement
- [pnpm v8+](https://pnpm.io/installation)
- [Docker desktop](https://www.docker.com/products/docker-desktop/)
- `ENVIO_API_TOKEN` env var — required by V3 HyperSync

### Documentation

| Document | Purpose |
|----------|---------|
| [SCALE.md](./SCALE.md) | **Operator playbook** — 5 guardrails + Decision Log. Read before any `config.yaml` change. |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Deployment commands + reset semantics + verification queries |
| [FAST_TESTING_GUIDE.md](./FAST_TESTING_GUIDE.md) | Quick testing with block ranges |
| `CLAUDE.md` | AI assistant guide |
| `grimoires/loa/HANDLER_REGISTRY.md` | Contract → Handler mapping |
| `grimoires/loa/ENTITY_REFERENCE.md` | GraphQL entity reference |
| `grimoires/loa/SF_VAULT_SYSTEM.md` | Set & Forgetti vault docs |
| `grimoires/loa/freeside-sonar-perf-cycle.md` | Most recent optimization cycle design memo |
