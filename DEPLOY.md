# Deploying eigen-skills to EigenCompute TEE

## Prerequisites
1. **Docker** running locally
2. **ecloud CLI**: `npm install -g @layr-labs/ecloud-cli`
3. **Authenticated**: `ecloud auth login` (or `ecloud auth generate --store`)

## Step 1: Build the Docker image

```bash
cd eigen-agent-skills
docker build -t eigen-skills-chat .
```

Test locally first:
```bash
docker run -p 4200:4200 \
  -e EIGEN_API_KEY=your_key_here \
  -e OPENROUTER_API_KEY=your_key_here \
  eigen-skills-chat
```

Open http://localhost:4200 to verify.

## Step 2: Deploy to EigenCompute

```bash
ecloud compute app deploy
```

The CLI will interactively ask you for:
- **Image**: `eigen-skills-chat`
- **Port**: `4200`
- **Secrets** (sealed inside TEE, never exposed):
  - `EIGEN_API_KEY` → your EigenExplorer API key
  - `OPENROUTER_API_KEY` → your OpenRouter API key

## Step 3: Verify

Once deployed, you'll get a public URL like:
```
https://your-app-id.eigencloud.xyz
```

Open it — the chat should work exactly like localhost, but now:
- ✅ Running inside a verified Intel TDX TEE
- ✅ TEE attestation returns real data
- ✅ Secrets are hardware-sealed (not in plaintext)
- ✅ Publicly accessible

## Step 4: Verify TEE attestation

In the chat, type:
```
TEE attestation
```

You should see:
- **Platform:** Intel TDX (EigenCompute)
- **App ID:** (your real app ID)
- **KMS Key:** (real fingerprint)
- **Uptime:** (actual uptime in seconds)

## Troubleshooting

### Secrets not loading
The TEE unseals secrets via `/usr/local/bin/compute-source-env.sh`. 
If secrets aren't loading, check the ecloud dashboard for sealed secret status.

### Port issues
EigenCompute maps your exposed port automatically. Make sure `EXPOSE 4200` 
is in the Dockerfile and the server listens on `0.0.0.0:4200`.

### Health checks
The chat server responds to HTTP on `:4200`. EigenCompute uses this for health monitoring.
