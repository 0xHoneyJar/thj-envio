# THJ Envio Indexer

Multi-chain blockchain indexer for the THJ ecosystem, built with [Envio HyperIndex](https://envio.dev).

## What It Indexes

- **HoneyJar/Honeycomb** - NFT ownership across 6 generations
- **Henlo** - Token burns, holder balances, vault deposits
- **Set & Forgetti** - ERC4626 vault positions and staking rewards
- **Mibera** - NFTs, treasury marketplace, lending (PaddleFi)
- **CubQuests** - Badge verification and mint tracking

### Chains

| Chain | Products |
|-------|----------|
| Berachain | All THJ products |
| Ethereum | HoneyJar, Honeycomb, Milady burns |
| Optimism | Mibera articles, Sets |
| Base | HoneyJar, friend.tech keys |
| Arbitrum | HoneyJar |
| Zora | HoneyJar |

## Quick Start

### Pre-requisites

- [Node.js v18+](https://nodejs.org/en/download/current)
- [pnpm v8+](https://pnpm.io/installation)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Run

```bash
pnpm dev
```

Visit http://localhost:8080 for GraphQL Playground (password: `testing`).

### Generate Types

After modifying `config.yaml` or `schema.graphql`:

```bash
pnpm codegen
```

### Deploy

```bash
pnpm deploy
```

## Documentation

- [Product Requirements](loa-grimoire/prd.md) - What this indexer does
- [Software Design](loa-grimoire/sdd.md) - How it's built
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Production setup

## Structure

```
src/
├── EventHandlers.ts     # Main entry point
├── handlers/            # 37 domain-specific handlers
│   ├── sf-vaults.ts     # Set & Forgetti
│   ├── henlo-vault.ts   # Henlocker
│   ├── mibera-*.ts      # Mibera ecosystem
│   └── ...
└── lib/                 # Utilities
```

See [Envio docs](https://docs.envio.dev) for framework details.
