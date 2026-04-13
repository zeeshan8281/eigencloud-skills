#!/bin/bash
echo "=== eigen-skills TEE Startup ==="

# Source TEE-sealed secrets
if [ -f "/usr/local/bin/compute-source-env.sh" ]; then
    echo "[TEE] Unsealing secrets..."
    source /usr/local/bin/compute-source-env.sh
fi

echo "[Debug] Date: $(date -u)"
echo "[Debug] Node: $(node --version)"

cd /app

# Write .env from TEE secrets
echo "[Config] Writing .env from TEE environment..."
cat > /app/.env << EOF
EIGEN_API_KEY=${EIGEN_API_KEY:-}
OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-}
SKILLS_UI_PORT=4200
EOF

# Check what we got
if [ -z "$EIGEN_API_KEY" ]; then
    echo "[WARN] EIGEN_API_KEY not set — EigenExplorer queries will fail"
else
    echo "[OK] EIGEN_API_KEY is set"
fi

if [ -z "$OPENROUTER_API_KEY" ]; then
    echo "[WARN] OPENROUTER_API_KEY not set — LLM chat will fail"
else
    echo "[OK] OPENROUTER_API_KEY is set"
fi

echo "[Start] Launching eigen-skills chat on port 4200..."
exec node server.js
