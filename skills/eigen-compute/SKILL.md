---
name: eigen-compute
description: "Deploy and manage applications on EigenCompute TEE (Trusted Execution Environment) — deploy, monitor, attest, and manage lifecycle via ecloud CLI"
version: 2.0.0
metadata:
  emoji: "🔒"
  tags: ["eigenlayer", "eigencompute", "tee", "tdx", "deploy", "attestation"]
user-invocable: true
---

# EigenCompute Skill

Deploy, manage, and attest applications running inside EigenCompute TEE (Trusted Execution Environment) powered by Intel TDX.

## Prerequisites

```bash
npm install -g @layr-labs/ecloud-cli  # minimum v0.4.3
ecloud auth login
ecloud auth whoami
```

**CRITICAL:** CLI v0.4.3+ is required. Older versions have broken ITA attestation metadata causing deploy failures on all instance types.

## Instance Types

| Type | vCPUs | Memory | TEE | Notes |
|------|-------|--------|-----|-------|
| g1-micro-1v | 2 shared | 1 GB | Shielded VM | Cheapest, attestation can be flaky |
| g1-medium-1v | 2 shared | 4 GB | Shielded VM | |
| g1-custom-2-4096s | 2 | 4 GB | SEV-SNP | |
| g1-standard-2s | 2 | 8 GB | SEV-SNP | |
| g1-standard-4t | 4 | 16 GB | TDX | **Recommended — most reliable** |
| g1-standard-8t | 8 | 32 GB | TDX | |

## Scaffold a New App (Optional)

```bash
ecloud compute app create --name my-app --language typescript --template-repo minimal
# Languages: typescript, python, golang, rust
```

## Deploy (Non-Interactive, Agent-Friendly)

`ecloud compute app deploy` has 6+ interactive prompts. Use the full flag set:

### Step 1: Build & push Docker image (must be linux/amd64)

```bash
docker build --platform linux/amd64 -t <registry/image:tag> .
docker push <registry/image:tag>
```

### Step 2: Deploy

```bash
# Remove Dockerfile to avoid "Choose deployment method" prompt
rm -f Dockerfile
touch .env  # create empty .env if no secrets

echo "n" | ecloud compute app deploy \
  --name <app-name> \
  --image-ref <registry/image:tag> \
  --skip-profile \
  --env-file .env \
  --instance-type g1-standard-4t \
  --log-visibility public \
  --resource-usage-monitoring enable \
  --verbose
```

### Dockerfile requirements

- Use `EXPOSE <port>` to declare your port
- App must listen on `0.0.0.0`, not `localhost`
- EigenCompute wraps your CMD with `compute-source-env.sh` entrypoint — do NOT set your own ENTRYPOINT to source it manually

## Manage Apps

```bash
ecloud compute app list
ecloud compute app info <APP_ID>
ecloud compute app logs <APP_ID>
ecloud compute app start <APP_ID>
ecloud compute app stop <APP_ID>
ecloud compute app upgrade <APP_ID>
```

### Terminate (interactive confirm — pipe "y")
```bash
echo "y" | ecloud compute app terminate <APP_ID>
```

## Sealed Secrets

```bash
ecloud compute app env set MY_SECRET="value" API_KEY="key"
```

Secrets are encrypted and only decryptable inside the TEE via KMS attestation. At boot, `compute-source-env.sh` fetches them and writes to `/tmp/.env`.

## TEE Internals

| Path | What |
|------|------|
| `/usr/local/bin/compute-source-env.sh` | Entrypoint — fetches secrets, then runs your CMD |
| `/usr/local/bin/kms-signing-public-key.pem` | KMS signing public key |
| `/usr/local/bin/kms-client` | KMS client binary |

Verify at: `https://verify-sepolia.eigencloud.xyz/app/<APP_ID>`

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `no ITA verifier client present` | CLI too old (< v0.4.3) | `sudo npm install -g @layr-labs/ecloud-cli@latest` |
| `failed to quote: error code 0x15` | CLI too old or flaky Shielded VM | Update CLI, use `g1-standard-4t` |
| `No space left on device` during layering | Docker disk full | `docker system prune -f && docker builder prune -f` |
| "Choose deployment method" prompt hangs | Dockerfile present in deploy dir | `rm -f Dockerfile` before deploying |
| App "Running" but port refuses connections | Attestation failed, app never started | Check `ecloud compute app logs <APP_ID>` |
| IP changes on every deploy | Expected behavior | Don't hardcode IPs |
| App ID changes on terminate + redeploy | Expected behavior | No persistent identity across deploys |
