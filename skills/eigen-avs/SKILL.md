---
name: eigen-avs
description: "Query EigenLayer AVS (Actively Validated Services) — list services, operators per AVS, stakers per AVS, registration events, and operator-sets"
version: 1.0.0
metadata:
  emoji: "🛡️"
  tags: ["eigenlayer", "avs", "services", "operators", "security"]
user-invocable: true
---

# EigenLayer AVS Skill

Query live data about Actively Validated Services (AVS) on EigenLayer: service listings, operators securing each AVS, staker delegations, registration events, and operator-sets.

## Data Source

**EigenExplorer API** — `https://api.eigenexplorer.com`
- Auth: `x-api-token` header (free key at https://developer.eigenexplorer.com)

## When to use this skill

Use when the user asks about:
- AVS (Actively Validated Services) on EigenLayer
- Which operators are securing a specific AVS
- Stakers delegated to a specific AVS
- AVS registration/deregistration events
- Operator-sets for an AVS
- Comparing AVS by TVL, staker count, or APY

## How to query

### Get all AVS (sorted by TVL)
```bash
curl -s "https://api.eigenexplorer.com/avs?withTvl=true&sortByTvl=desc&take=10" -H "x-api-token: $EIGEN_API_KEY"
```

### Search AVS by name
```bash
curl -s "https://api.eigenexplorer.com/avs?searchByText=eigenda&withTvl=true" -H "x-api-token: $EIGEN_API_KEY"
```

### Get a specific AVS
```bash
curl -s "https://api.eigenexplorer.com/avs/0xAVS_ADDRESS?withTvl=true" -H "x-api-token: $EIGEN_API_KEY"
```

### Get operators registered to an AVS
```bash
curl -s "https://api.eigenexplorer.com/avs/0xAVS_ADDRESS/operators?take=20" -H "x-api-token: $EIGEN_API_KEY"
```

### Get stakers for an AVS
```bash
curl -s "https://api.eigenexplorer.com/avs/0xAVS_ADDRESS/stakers?take=20" -H "x-api-token: $EIGEN_API_KEY"
```

### Get registration events for an AVS
```bash
curl -s "https://api.eigenexplorer.com/avs/0xAVS_ADDRESS/events/registration?take=20" -H "x-api-token: $EIGEN_API_KEY"
```

### Get operator-sets for an AVS
```bash
curl -s "https://api.eigenexplorer.com/avs/0xAVS_ADDRESS/operator-sets?take=20" -H "x-api-token: $EIGEN_API_KEY"
```

### Get all AVS addresses (lightweight)
```bash
curl -s "https://api.eigenexplorer.com/avs/addresses" -H "x-api-token: $EIGEN_API_KEY"
```

## Response Format

Format results for the user with:
- **Bold AVS names** and abbreviated addresses
- TVL in human-readable form (e.g., "$500M")
- Number of operators securing the AVS
- Number of stakers
- APY if available
- Active/inactive status for operator registrations
- Use bullet points, never tables in chat

## Programmatic Usage

```javascript
const AVSAPI = require('eigen-agent-skills/skills/eigen-avs/scripts/avs-api');
const api = new AVSAPI('YOUR_API_KEY');

const allAVS = await api.getAllAVS({ sortByTvl: 'desc', take: 10 });
const operators = await api.getAVSOperators('0xAVS_ADDRESS');
const stakers = await api.getAVSStakers('0xAVS_ADDRESS');
```
