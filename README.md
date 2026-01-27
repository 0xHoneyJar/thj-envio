## THJ Envio Indexer

Blockchain event indexer for the THJ ecosystem. Single source of truth for CubQuests, Score API, and Set&Forgetti.

*Please refer to the [documentation website](https://docs.envio.dev) for a thorough guide on all [Envio](https://envio.dev) indexer features*

### Production

**GraphQL Endpoint**: https://indexer.hyperindex.xyz/914708e/v1/graphql

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

- [Node.js (use v18 or newer)](https://nodejs.org/en/download/current)
- [pnpm (use v8 or newer)](https://pnpm.io/installation)
- [Docker desktop](https://www.docker.com/products/docker-desktop/)

### Documentation

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | AI assistant guide |
| `FAST_TESTING_GUIDE.md` | Quick testing with block ranges |
| `grimoires/loa/HANDLER_REGISTRY.md` | Contract → Handler mapping |
| `grimoires/loa/ENTITY_REFERENCE.md` | GraphQL entity reference |
| `grimoires/loa/SF_VAULT_SYSTEM.md` | Set & Forgetti vault docs |
