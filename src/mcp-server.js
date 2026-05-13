#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { execSync, exec } = require('child_process');

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
    }
];

async function handleToolCall(name, args) {
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

async function main() {
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

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('EigenCompute MCP server running on stdio');
}

main().catch(console.error);
