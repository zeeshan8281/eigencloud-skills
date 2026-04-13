---
name: eigen-rewards
description: "Query EigenLayer rewards — operator rewards, staker rewards, AVS reward distributions, top yield operators and AVS"
version: 1.0.0
metadata:
  emoji: "💰"
  tags: ["eigenlayer", "rewards", "yield", "apy", "staking"]
user-invocable: true
---

# EigenLayer Rewards Skill

Query live rewards data from EigenLayer: operator rewards, staker rewards, AVS reward distributions, and find the best yield opportunities.

## Data Source

**EigenExplorer API** — `https://api.eigenexplorer.com`
- Auth: `x-api-token` header (free key at https://developer.eigenexplorer.com)

## When to use this skill

Use when the user asks about:
- EigenLayer rewards (operator or staker rewards)
- Best yield / highest APY operators
- Best yield / highest APY AVS
- Reward tokens and strategies for an operator
- How much a staker is earning
- AVS reward distributions
- Comparing restaking yields

## How to query

### Get top operators by APY
```bash
curl -s "https://api.eigenexplorer.com/operators?withTvl=true&sortByApy=desc&take=10" -H "x-api-token: $EIGEN_API_KEY"
```

### Get top AVS by APY
```bash
curl -s "https://api.eigenexplorer.com/avs?withTvl=true&sortByApy=desc&take=10" -H "x-api-token: $EIGEN_API_KEY"
```

### Get rewards for a specific operator
```bash
curl -s "https://api.eigenexplorer.com/operators/0xOPERATOR_ADDRESS/rewards" -H "x-api-token: $EIGEN_API_KEY"
```

### Get rewards for a specific staker
```bash
curl -s "https://api.eigenexplorer.com/stakers/0xSTAKER_ADDRESS/rewards" -H "x-api-token: $EIGEN_API_KEY"
```

### Get rewards distributed by a specific AVS
```bash
curl -s "https://api.eigenexplorer.com/avs/0xAVS_ADDRESS/rewards" -H "x-api-token: $EIGEN_API_KEY"
```

### Get all rewards data
```bash
curl -s "https://api.eigenexplorer.com/rewards?take=20" -H "x-api-token: $EIGEN_API_KEY"
```

## Response Format

Format results for the user with:
- **Bold operator/AVS names**
- APY as a percentage (e.g., "4.2% APY")
- Reward token names and amounts
- TVL alongside APY for context (high APY + low TVL = be cautious)
- Rank operators/AVS by APY when comparing yield
- Use bullet points, never tables in chat

## Programmatic Usage

```javascript
const RewardsAPI = require('eigen-agent-skills/skills/eigen-rewards/scripts/rewards-api');
const api = new RewardsAPI('YOUR_API_KEY');

const topOps = await api.getTopOperatorsByAPY(10);
const topAVS = await api.getTopAVSByAPY(10);
const opRewards = await api.getOperatorRewards('0x...');
const stakerRewards = await api.getStakerRewards('0x...');
```
