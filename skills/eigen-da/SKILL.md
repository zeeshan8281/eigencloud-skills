---
name: eigen-da
description: "Store and retrieve data blobs on EigenDA (Data Availability layer) — disperse blobs, retrieve by commitment, check status via proxy or direct API"
version: 1.0.0
metadata:
  emoji: "📦"
  tags: ["eigenlayer", "eigenda", "data-availability", "blobs", "storage"]
user-invocable: true
---

# EigenDA Skill

Store and retrieve data blobs on EigenDA — EigenLayer's Data Availability layer. EigenDA provides high-throughput, low-cost data availability for rollups and applications.

## What is EigenDA?

EigenDA is a **data availability (DA) service** built on EigenLayer. It lets you:
- **Store blobs** — submit arbitrary data, get back a cryptographic commitment
- **Retrieve blobs** — fetch data using the commitment hash
- **Verify** — KZG commitments prove data integrity

## Architecture

```
Your App → EigenDA Proxy (localhost:3100) → EigenDA Disperser → EigenDA Operators
```

The **EigenDA Proxy** is a local REST server that handles encoding, KZG verification, and communication with the EigenDA disperser network.

## Prerequisites

Run the EigenDA Proxy locally via Docker:

```bash
docker run -d \
  --name eigenda-proxy \
  -p 3100:3100 \
  ghcr.io/layr-labs/eigenda-proxy:latest \
  --eigenda.disperser-rpc=disperser-sepolia.eigenda.xyz:443 \
  --eigenda.service-manager-addr=0xD4A7E1Bd8015057293f0D0A557088c286942e84b \
  --eigenda.eth-rpc=YOUR_SEPOLIA_RPC_URL \
  --eigenda.status-query-timeout=45s \
  --eigenda.signer-private-key-hex=YOUR_PRIVATE_KEY \
  --memstore.enabled=false \
  --eigenda.disable-tls=false
```

## When to use this skill

Use when the user asks about:
- Storing data on EigenDA
- Retrieving data from EigenDA by commitment
- Data availability for rollups
- Blob storage and retrieval
- EigenDA proxy setup
- Verifying data commitments
- EigenDA health/status checks

## How to use

### Store a blob via proxy

```bash
curl -s -X POST "http://127.0.0.1:3100/put?commitment_mode=standard" \
  -H "Content-Type: application/json" \
  -d '{"key": "value", "timestamp": "2025-01-01T00:00:00Z"}'
```

Returns: a hex commitment string (the blob's address on EigenDA).

### Retrieve a blob via proxy

```bash
curl -s "http://127.0.0.1:3100/get/COMMITMENT_HASH?commitment_mode=standard"
```

Returns: the original JSON data.

### Health check

```bash
curl -s "http://127.0.0.1:3100/health"
```

### View blob on explorer

After storing, view the blob at:
```
https://blobs-sepolia.eigenda.xyz/blobs/COMMITMENT_HASH
```

## EigenDA v2 Disperser API (Direct)

For direct access without the proxy (advanced):

### Disperse a blob
The v2 disperser uses gRPC at `disperser-sepolia.eigenda.xyz:443`:
- `DisperseBlob()` — enqueue a blob for dispersal
- `GetBlobStatus()` — poll dispersal status
- `GetBlobCommitment()` — get the KZG commitment

### Retrieve from relay
The v2 Relay API provides:
- `GetBlob(blob_key)` — retrieve blob from relay nodes

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `EIGENDA_PROXY_URL` | `http://127.0.0.1:3100` | Proxy address |
| `EIGENDA_COMMITMENT_MODE` | `standard` | `standard` or `optimistic` |
| `EIGENDA_TIMEOUT` | `60000` | Timeout in ms |

### Commitment modes

- **standard** — full KZG commitment, highest security
- **optimistic** — faster but with weaker guarantees

## Networks

| Network | Disperser RPC | Service Manager |
|---------|---------------|-----------------|
| Sepolia | `disperser-sepolia.eigenda.xyz:443` | `0xD4A7E1Bd8015057293f0D0A557088c286942e84b` |
| Mainnet | `disperser.eigenda.xyz:443` | Check EigenLayer docs |

## Programmatic Usage

```javascript
const EigenDA = require('eigen-skills/skills/eigen-da/scripts/da-api');

const da = new EigenDA({
  proxyUrl: 'http://127.0.0.1:3100',  // default
  commitmentMode: 'standard',          // default
  timeout: 60000,                      // default
});

// Store data
const commitment = await da.store({ key: 'value', timestamp: new Date() });
console.log('Commitment:', commitment);
console.log('Explorer:', da.getExplorerUrl(commitment));

// Retrieve data
const data = await da.retrieve(commitment);
console.log('Retrieved:', data);

// Health check
const healthy = await da.healthCheck();
```
