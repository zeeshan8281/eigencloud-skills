---
name: eigen-delegation
description: "Query EigenLayer delegation data — delegation events, operator delegations, staker positions, operator-sets, and top delegated operators"
version: 1.0.0
metadata:
  emoji: "🤝"
  tags: ["eigenlayer", "delegation", "operators", "stakers", "operator-sets"]
user-invocable: true
---

# EigenLayer Delegation Skill

Query live delegation data from EigenLayer: delegation/undelegation events, operator delegation profiles, staker delegation positions, operator-sets, and find the most delegated operators.

## Data Source

**EigenExplorer API** — `https://api.eigenexplorer.com`
- Auth: `x-api-token` header (free key at https://developer.eigenexplorer.com)

## When to use this skill

Use when the user asks about:
- Who is delegating to whom
- Delegation/undelegation events
- Top operators by delegation (most stakers, most TVL)
- A specific staker's delegation position
- Which operator a staker is delegated to
- Operator-sets
- Withdrawal queue or pending undelegations

## How to query

### Get top operators by total stakers (most delegated)
```bash
curl -s "https://api.eigenexplorer.com/operators?withTvl=true&sortByTotalStakers=desc&take=10" -H "x-api-token: $EIGEN_API_KEY"
```

### Get top operators by TVL (most capital delegated)
```bash
curl -s "https://api.eigenexplorer.com/operators?withTvl=true&sortByTvl=desc&take=10" -H "x-api-token: $EIGEN_API_KEY"
```

### Get a specific operator's delegation profile
```bash
curl -s "https://api.eigenexplorer.com/operators/0xOPERATOR_ADDRESS?withTvl=true" -H "x-api-token: $EIGEN_API_KEY"
```

### Get stakers delegating to an operator
```bash
curl -s "https://api.eigenexplorer.com/operators/0xOPERATOR_ADDRESS/stakers?take=20" -H "x-api-token: $EIGEN_API_KEY"
```

### Get which operator a staker has delegated to
```bash
curl -s "https://api.eigenexplorer.com/stakers/0xSTAKER_ADDRESS" -H "x-api-token: $EIGEN_API_KEY"
```

### Get staker withdrawals (undelegations)
```bash
curl -s "https://api.eigenexplorer.com/stakers/0xSTAKER_ADDRESS/withdrawals?take=20" -H "x-api-token: $EIGEN_API_KEY"
```

### Get delegation events
```bash
curl -s "https://api.eigenexplorer.com/events?take=20" -H "x-api-token: $EIGEN_API_KEY"
```

### Get all operator-sets
```bash
curl -s "https://api.eigenexplorer.com/operator-sets?take=20" -H "x-api-token: $EIGEN_API_KEY"
```

### Get operator-sets for a specific AVS
```bash
curl -s "https://api.eigenexplorer.com/avs/0xAVS_ADDRESS/operator-sets?take=20" -H "x-api-token: $EIGEN_API_KEY"
```

## Response Format

Format results for the user with:
- **Bold operator names** and abbreviated addresses
- Total stakers count
- TVL in human-readable form
- Shares breakdown by strategy where relevant
- Active vs inactive AVS registrations
- Use bullet points, never tables in chat

## Programmatic Usage

```javascript
const DelegationAPI = require('eigen-agent-skills/skills/eigen-delegation/scripts/delegation-api');
const api = new DelegationAPI('YOUR_API_KEY');

const topDelegated = await api.getTopDelegatedOperators(10);
const topByTVL = await api.getTopOperatorsByTVL(10);
const opProfile = await api.getOperatorDelegation('0x...');
const stakerPos = await api.getStakerDelegation('0x...');
```
