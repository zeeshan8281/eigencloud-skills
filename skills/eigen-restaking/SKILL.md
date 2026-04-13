---
name: eigen-restaking
description: "Query EigenLayer restaking data — operators, stakers, TVL, deposits, withdrawals, and ecosystem metrics via EigenExplorer API"
version: 1.0.0
metadata:
  emoji: "🔄"
  tags: ["eigenlayer", "restaking", "operators", "tvl", "stakers"]
user-invocable: true
---

# EigenLayer Restaking Skill

Query live EigenLayer restaking data: operators, stakers, TVL, deposits, withdrawals, and ecosystem metrics.

## Data Source

**EigenExplorer API** — `https://api.eigenexplorer.com`
- Auth: `x-api-token` header (free key at https://developer.eigenexplorer.com)
- Holesky testnet: `https://api-holesky.eigenexplorer.com`

## When to use this skill

Use when the user asks about:
- EigenLayer operators (who they are, how much TVL, how many stakers)
- Restaking stats or metrics (total TVL, total stakers, total operators)
- Individual staker positions (deposits, withdrawals, delegations)
- Historical EigenLayer metrics
- EigenLayer ecosystem overview

## How to query

Use the `exec` tool to curl the EigenExplorer API. **Always include your API key.**

### Get ecosystem metrics
```bash
curl -s "https://api.eigenexplorer.com/metrics" -H "x-api-token: $EIGEN_API_KEY"
```

### Get top operators by TVL
```bash
curl -s "https://api.eigenexplorer.com/operators?withTvl=true&sortByTvl=desc&take=10" -H "x-api-token: $EIGEN_API_KEY"
```

### Search operators by name
```bash
curl -s "https://api.eigenexplorer.com/operators?searchByText=p2p&withTvl=true" -H "x-api-token: $EIGEN_API_KEY"
```

### Get a specific operator
```bash
curl -s "https://api.eigenexplorer.com/operators/0x09e6eb09213bdd3698bd8afb43ec3cb0ecff683a?withTvl=true" -H "x-api-token: $EIGEN_API_KEY"
```

### Get staker info
```bash
curl -s "https://api.eigenexplorer.com/stakers/0xYOUR_STAKER_ADDRESS" -H "x-api-token: $EIGEN_API_KEY"
```

### Get recent deposits
```bash
curl -s "https://api.eigenexplorer.com/deposits?take=20" -H "x-api-token: $EIGEN_API_KEY"
```

### Get recent withdrawals
```bash
curl -s "https://api.eigenexplorer.com/withdrawals?take=20" -H "x-api-token: $EIGEN_API_KEY"
```

### Get historical metrics
```bash
curl -s "https://api.eigenexplorer.com/metrics/historical" -H "x-api-token: $EIGEN_API_KEY"
```

## Response Format

Format results for the user with:
- **Bold operator names** and addresses (abbreviated)
- TVL in human-readable form (e.g., "$1.2B" not "1200000000")
- Staker counts
- APY where available
- Use bullet points, never tables in chat

## Programmatic Usage

```javascript
const EigenAPI = require('eigen-agent-skills/skills/eigen-restaking/scripts/eigen-api');
const api = new EigenAPI('YOUR_API_KEY');

const metrics = await api.getMetrics();
const topOps = await api.getOperators({ sortByTvl: 'desc', take: 10 });
const operator = await api.getOperator('0x...');
```
