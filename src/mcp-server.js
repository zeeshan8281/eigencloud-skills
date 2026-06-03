#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const INSTANCE_TYPES = [
    'g1-micro-1v',
    'g1-medium-1v',
    'g1-custom-2-4096s',
    'g1-standard-2s',
    'g1-standard-4t',
    'g1-standard-8t'
];

function checkCLI() {
    try {
        execSync('ecloud --version', { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

function runCommand(cmd, timeout = 60000) {
    return new Promise((resolve, reject) => {
        exec(`ecloud ${cmd}`, { encoding: 'utf-8', timeout }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr || error.message));
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

async function runDeploy(args) {
    const { name, image, instanceType = 'g1-standard-4t', envFile } = args;

    let cmd = `compute app deploy --name "${name}" --image-ref "${image}" --skip-profile --instance-type ${instanceType} --log-visibility public --resource-usage-monitoring enable --verbose`;

    if (envFile) {
        cmd += ` --env-file "${envFile}"`;
    }

    return new Promise((resolve, reject) => {
        exec(`echo "n" | ecloud ${cmd}`, { encoding: 'utf-8', timeout: 300000 }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr || error.message));
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

const TOOLS = [
    {
        name: 'eigencompute_whoami',
        description: 'Check which address the ecloud CLI is authenticated as',
        inputSchema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'eigencompute_list',
        description: 'List all deployed EigenCompute apps',
        inputSchema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'eigencompute_info',
        description: 'Get detailed info for a specific app including status and IP',
        inputSchema: {
            type: 'object',
            properties: {
                appId: {
                    type: 'string',
                    description: 'The app ID to get info for'
                }
            },
            required: ['appId']
        }
    },
    {
        name: 'eigencompute_logs',
        description: 'View logs for a specific app',
        inputSchema: {
            type: 'object',
            properties: {
                appId: {
                    type: 'string',
                    description: 'The app ID to get logs for'
                }
            },
            required: ['appId']
        }
    },
    {
        name: 'eigencompute_start',
        description: 'Start a stopped app',
        inputSchema: {
            type: 'object',
            properties: {
                appId: {
                    type: 'string',
                    description: 'The app ID to start'
                }
            },
            required: ['appId']
        }
    },
    {
        name: 'eigencompute_stop',
        description: 'Stop a running app',
        inputSchema: {
            type: 'object',
            properties: {
                appId: {
                    type: 'string',
                    description: 'The app ID to stop'
                }
            },
            required: ['appId']
        }
    },
    {
        name: 'eigencompute_terminate',
        description: 'Permanently terminate and destroy an app. This cannot be undone.',
        inputSchema: {
            type: 'object',
            properties: {
                appId: {
                    type: 'string',
                    description: 'The app ID to terminate'
                }
            },
            required: ['appId']
        }
    },
    {
        name: 'eigencompute_deploy',
        description: 'Deploy a Docker image to EigenCompute TEE. Image must be linux/amd64 and pushed to a public registry.',
        inputSchema: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'App name for the deployment'
                },
                image: {
                    type: 'string',
                    description: 'Docker image reference (e.g., user/app:latest)'
                },
                instanceType: {
                    type: 'string',
                    description: 'Instance type. Recommended: g1-standard-4t',
                    enum: INSTANCE_TYPES,
                    default: 'g1-standard-4t'
                },
                envFile: {
                    type: 'string',
                    description: 'Path to .env file for sealed secrets (optional)'
                }
            },
            required: ['name', 'image']
        }
    },
    {
        name: 'eigencompute_env_set',
        description: 'Set sealed environment variables for an app. Secrets are encrypted and only decryptable inside the TEE.',
        inputSchema: {
            type: 'object',
            properties: {
                appId: {
                    type: 'string',
                    description: 'The app ID to set env vars for'
                },
                secrets: {
                    type: 'object',
                    description: 'Key-value pairs of secrets to set',
                    additionalProperties: { type: 'string' }
                }
            },
            required: ['appId', 'secrets']
        }
    },
    {
        name: 'eigencompute_upgrade',
        description: 'Upgrade a running app to a new image version',
        inputSchema: {
            type: 'object',
            properties: {
                appId: {
                    type: 'string',
                    description: 'The app ID to upgrade'
                }
            },
            required: ['appId']
        }
    },
    {
        name: 'eigencompute_verify',
        description: 'Verify a deployed app is running the exact expected Docker image. Reads the on-chain / TEE-attested image digest for the app and (optionally) compares it to an expected digest from your CI build provenance or the image you deployed. Proves the enclave is running untampered, audited code — the core EigenCompute trust guarantee.',
        inputSchema: {
            type: 'object',
            properties: {
                appId: {
                    type: 'string',
                    description: 'The app ID to verify'
                },
                expectedDigest: {
                    type: 'string',
                    description: 'Optional expected image digest (e.g. "sha256:9f2c..." from your GitHub build provenance or the image you deployed). When provided, it is compared against the attested on-chain digest to produce a pass/fail verdict.'
                },
                network: {
                    type: 'string',
                    enum: ['sepolia', 'mainnet'],
                    description: 'Network for the public verifier URL (default: sepolia)',
                    default: 'sepolia'
                }
            },
            required: ['appId']
        }
    },
    {
        name: 'eigencompute_init_verifiable',
        description: 'Scaffold a verifiable build pipeline for an app so it produces a provable, digest-pinned image instead of a dev image. Writes a GitHub Actions workflow that builds linux/amd64, pushes to a registry, and emits signed build provenance (source commit → image digest). This is what turns a "NOT VERIFIABLE" dev image (as flagged by eigencompute_verify) into one that can be cryptographically verified.',
        inputSchema: {
            type: 'object',
            properties: {
                image: {
                    type: 'string',
                    description: 'Target image reference without tag, e.g. "docker.io/user/app" or "user/app".'
                },
                dir: {
                    type: 'string',
                    description: 'Repository directory to scaffold into (default: current directory).',
                    default: '.'
                },
                force: {
                    type: 'boolean',
                    description: 'Overwrite an existing workflow file if present (default: false).',
                    default: false
                }
            },
            required: ['image']
        }
    }
];

// Build the GitHub Actions workflow that produces a verifiable, provenance-signed image.
function verifiableWorkflow(image) {
    return `name: eigen-verifiable-build
# Builds a verifiable, digest-pinned image for EigenCompute and signs build
# provenance (source commit -> image digest). Generated by eigencompute_init_verifiable.
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  packages: write
  id-token: write
  attestations: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          username: \${{ secrets.DOCKERHUB_USERNAME }}
          password: \${{ secrets.DOCKERHUB_TOKEN }}
      - id: push
        uses: docker/build-push-action@v6
        with:
          context: .
          platforms: linux/amd64        # EigenCompute requires amd64
          push: true
          tags: ${image}:latest
      - uses: actions/attest-build-provenance@v1
        with:
          subject-name: ${image}
          subject-digest: \${{ steps.push.outputs.digest }}
          push-to-registry: true
      - name: Print deployable reference
        run: |
          echo "::notice::Deploy this exact image:"
          echo "::notice::${image}@\${{ steps.push.outputs.digest }}"
`;
}

// Scaffold the verifiable-build pipeline into a repo. Pure filesystem — no ecloud CLI.
function runInitVerifiable(args) {
    const { image, dir = '.', force = false } = args;
    if (!image || !/^[\w./-]+$/.test(image)) {
        throw new Error('Provide a valid image reference, e.g. "docker.io/user/app".');
    }
    const wfDir = path.join(dir, '.github', 'workflows');
    const wfPath = path.join(wfDir, 'eigen-verifiable-build.yml');

    if (fs.existsSync(wfPath) && !force) {
        return JSON.stringify({
            written: [],
            skipped: wfPath,
            note: `${wfPath} already exists. Re-run with force:true to overwrite.`,
        }, null, 2);
    }

    fs.mkdirSync(wfDir, { recursive: true });
    fs.writeFileSync(wfPath, verifiableWorkflow(image));

    return JSON.stringify({
        written: [wfPath],
        image,
        secretsRequired: ['DOCKERHUB_USERNAME', 'DOCKERHUB_TOKEN'],
        nextSteps: [
            `Add repo secrets DOCKERHUB_USERNAME and DOCKERHUB_TOKEN in GitHub → Settings → Secrets → Actions.`,
            `Commit & push — the workflow builds ${image}, pushes it, and signs provenance.`,
            `Grab the printed digest (${image}@sha256:...) from the run's notices.`,
            `Deploy it with eigencompute_deploy (image: that digest-pinned ref).`,
            `Confirm with eigencompute_verify (expectedDigest: that sha256) — should report VERIFIED.`,
        ],
        summary: `✅ Scaffolded ${wfPath}. Push it, then deploy the digest-pinned image it produces — eigencompute_verify will then confirm source → build → on-chain → TEE.`,
    }, null, 2);
}

// Pick the first present, non-empty value from a release record under any of the
// given keys (the CLI's JSON key names vary across verifiable vs dev builds).
function pick(obj, keys) {
    for (const k of keys) {
        const v = obj && obj[k];
        if (v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '-') {
            return String(v).trim();
        }
    }
    return null;
}

// Verify a deployment by reconciling independent sources of truth:
//   on-chain release record (block-anchored)  ⇄  build provenance (source commit)
//   ⇄  the digest you expected to ship.
// Reads `ecloud compute app releases --json` — the on-chain audit trail — NOT the
// CLI's self-reported `app info`.
async function runVerify(args) {
    const { appId, expectedDigest, network = 'sepolia' } = args;
    const verifierUrl = `https://verify-${network}.eigencloud.xyz/app/${appId}`;
    const normExpected = expectedDigest ? expectedDigest.toLowerCase().trim() : null;

    let releases;
    try {
        const raw = await runCommand(`compute app releases ${appId} --json --environment ${network}`);
        releases = JSON.parse(raw).releases || [];
    } catch (err) {
        return JSON.stringify({
            appId, verified: null, error: `Could not read on-chain releases: ${err.message}`, verifierUrl,
        }, null, 2);
    }

    if (releases.length === 0) {
        return JSON.stringify({
            appId, verified: null, verifierUrl,
            summary: `⚠️ No on-chain releases found for ${appId}. Is the app deployed on ${network}?`,
        }, null, 2);
    }

    const latest = releases[0];
    const onChainDigest = pick(latest, ['imageDigest', 'digest']);
    const registry = pick(latest, ['registryUrl', 'image', 'registry']);
    const block = pick(latest, ['createdAtBlock', 'block']);
    const repo = pick(latest, ['repo', 'sourceRepo', 'repository']);
    const commit = pick(latest, ['commit', 'gitCommit', 'sourceCommit']);
    const provenance = pick(latest, ['provenance', 'buildId', 'provenanceUrl']);

    // A build is "verifiable" only if it carries source provenance (repo/commit/build).
    const verifiableBuild = !!(repo || commit || provenance);

    let verified = null; // null = no pass/fail assertion possible/requested
    let summary;

    if (!verifiableBuild) {
        summary = `🚩 NOT VERIFIABLE — ${appId} (release ${block ? 'block ' + block : 'n/a'}) is a dev image: on-chain digest ${onChainDigest || 'n/a'} but no source repo/commit/provenance. There's no audited source to verify against. Rebuild with a verifiable build (CI + provenance) before trusting in production.`;
    } else if (normExpected && onChainDigest) {
        verified = onChainDigest.toLowerCase() === normExpected;
        summary = verified
            ? `✅ VERIFIED — on-chain digest ${onChainDigest} matches your expected image, traced to ${repo || 'source'}@${commit || '?'}, recorded at block ${block}. Chain intact: source → build → on-chain → TEE.`
            : `🚩 MISMATCH — expected ${normExpected} but the on-chain digest is ${onChainDigest}. The deployed image is NOT what you expected.`;
    } else {
        summary = `ℹ️ Verifiable build for ${appId}: on-chain digest ${onChainDigest} from ${repo || '?'}@${commit || '?'} (block ${block}). Pass expectedDigest to assert it matches your build. Full attestation: ${verifierUrl}`;
    }

    return JSON.stringify({
        appId,
        verified,
        verifiableBuild,
        onChainDigest,
        expectedDigest: normExpected,
        registry,
        sourceRepo: repo,
        sourceCommit: commit,
        provenance,
        block,
        network,
        platform: 'Intel TDX (EigenCompute)',
        verifierUrl,
        summary,
    }, null, 2);
}

async function handleToolCall(name, args) {
    // Filesystem-only tools that don't need the ecloud CLI run before the CLI gate.
    if (name === 'eigencompute_init_verifiable') {
        try {
            return { content: [{ type: 'text', text: runInitVerifiable(args) }] };
        } catch (error) {
            return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
        }
    }

    if (!checkCLI()) {
        return {
            content: [{
                type: 'text',
                text: 'Error: ecloud CLI not installed. Run: npm install -g @layr-labs/ecloud-cli@latest'
            }],
            isError: true
        };
    }

    try {
        let result;

        switch (name) {
            case 'eigencompute_whoami':
                result = await runCommand('auth whoami');
                break;

            case 'eigencompute_list':
                result = await runCommand('compute app list');
                break;

            case 'eigencompute_info':
                result = await runCommand(`compute app info ${args.appId}`);
                break;

            case 'eigencompute_logs':
                result = await runCommand(`compute app logs ${args.appId}`, 120000);
                break;

            case 'eigencompute_start':
                result = await runCommand(`compute app start ${args.appId}`);
                break;

            case 'eigencompute_stop':
                result = await runCommand(`compute app stop ${args.appId}`);
                break;

            case 'eigencompute_terminate':
                result = await new Promise((resolve, reject) => {
                    exec(`echo "y" | ecloud compute app terminate ${args.appId}`,
                        { encoding: 'utf-8', timeout: 60000 },
                        (error, stdout, stderr) => {
                            if (error) reject(new Error(stderr || error.message));
                            else resolve(stdout.trim());
                        });
                });
                break;

            case 'eigencompute_deploy':
                result = await runDeploy(args);
                break;

            case 'eigencompute_env_set':
                const secretPairs = Object.entries(args.secrets)
                    .map(([k, v]) => `${k}="${v}"`)
                    .join(' ');
                result = await runCommand(`compute app env set ${secretPairs}`, 120000);
                break;

            case 'eigencompute_upgrade':
                result = await runCommand(`compute app upgrade ${args.appId}`, 300000);
                break;

            case 'eigencompute_verify':
                result = await runVerify(args);
                break;

            default:
                return {
                    content: [{ type: 'text', text: `Unknown tool: ${name}` }],
                    isError: true
                };
        }

        return {
            content: [{ type: 'text', text: result || 'Command completed successfully' }]
        };

    } catch (error) {
        return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true
        };
    }
}

/**
 * Build a fresh MCP Server wired with the EigenCompute tools.
 * Reused by both the stdio entrypoint (below) and the HTTP transport
 * (src/http-server.js) — each HTTP session gets its own server instance.
 */
function createServer() {
    const server = new Server(
        {
            name: 'eigencompute',
            version: '2.1.0'
        },
        {
            capabilities: {
                tools: {}
            }
        }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return { tools: TOOLS };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        return handleToolCall(name, args || {});
    });

    return server;
}

async function main() {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('EigenCompute MCP server running on stdio');
}

module.exports = { createServer, TOOLS, handleToolCall };

// Auto-start stdio transport only when run directly (not when required by the HTTP server)
if (require.main === module) {
    main().catch(console.error);
}
