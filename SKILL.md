---
name: eigen-skills
description: "Deploy and manage apps on EigenCompute TEE — trusted execution environments with hardware-level isolation, encrypted secrets, and attestation"
version: 2.0.0
metadata:
  emoji: "🔒"
  tags: ["eigencompute", "tee", "deployment", "eigencloud"]
user-invocable: true
---

# EigenCompute Skills for Claude Code

Deploy apps to EigenCompute's Trusted Execution Environment (TEE) with one command.

## Setup

**Requires:** `npm install -g @layr-labs/ecloud-cli` (minimum **v0.4.3** — older versions have broken attestation)

```bash
ecloud auth login
ecloud auth whoami
```

---

## Instance Types

| Type | vCPUs | Memory | TEE | Notes |
|------|-------|--------|-----|-------|
| g1-micro-1v | 2 shared | 1 GB | Shielded VM | Cheapest, attestation can be flaky |
| g1-medium-1v | 2 shared | 4 GB | Shielded VM | |
| g1-custom-2-4096s | 2 | 4 GB | SEV-SNP | |
| g1-standard-2s | 2 | 8 GB | SEV-SNP | |
| g1-standard-4t | 4 | 16 GB | TDX | **Recommended — most reliable** |
| g1-standard-8t | 8 | 32 GB | TDX | |

---

## Scaffold a New App (Optional)

```bash
ecloud compute app create --name my-app --language typescript --template-repo minimal
# Languages: typescript, python, golang, rust
```

This creates a template project with a Dockerfile and tsconfig. You can skip this if you already have an app — just write your own Dockerfile.

---

## Deploy an App (Non-Interactive)

`ecloud compute app deploy` has many interactive prompts that break in agent/CI contexts. Use the full flag set below.

### Step 1: Build & push Docker image

The image **must** be `linux/amd64`. Your Dockerfile must include `EXPOSE <port>` and the app must listen on `0.0.0.0` (not localhost).

```bash
docker build --platform linux/amd64 -t <registry/image:tag> .
docker push <registry/image:tag>
```

### Step 2: Deploy

Remove any local Dockerfile first (avoids the "Choose deployment method" interactive prompt), then deploy:

```bash
rm -f Dockerfile
touch .env  # create empty .env if no secrets needed

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

### What happens under the hood

EigenCompute layers your image with TEE components:
- `compute-source-env.sh` — becomes the entrypoint, wraps your CMD
- `kms-client` — fetches sealed secrets via KMS attestation
- `kms-signing-public-key.pem` — TEE signing key

At boot: `compute-source-env.sh` performs TEE attestation → fetches sealed secrets from KMS → writes to `/tmp/.env` → runs your app's CMD.

---

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

---

## Sealed Secrets

Secrets are encrypted and only decryptable inside the TEE:

```bash
ecloud compute app env set MY_SECRET="value" API_KEY="key"
```

---

## TEE Attestation

Inside the TEE, the KMS signing key is at `/usr/local/bin/kms-signing-public-key.pem`.

Verify your app: `https://verify-sepolia.eigencloud.xyz/app/<APP_ID>`

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `no ITA verifier client present` | CLI too old (< v0.4.3) | `sudo npm install -g @layr-labs/ecloud-cli@latest` |
| `failed to quote: error code 0x15` | CLI too old or flaky Shielded VM | Update CLI, use `g1-standard-4t` instead |
| `No space left on device` during layering | Docker disk full | `docker system prune -f && docker builder prune -f` |
| "Choose deployment method" prompt hangs | Dockerfile present in deploy dir | `rm -f Dockerfile` before deploying |
| App shows "Running" but port refuses connections | Attestation failed, app never started | Check `ecloud compute app logs <APP_ID>` |
