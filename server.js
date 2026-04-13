const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const axios = require('axios');
const { EigenAPI, AVSAPI, RewardsAPI, DelegationAPI, EigenCompute, EigenDA } = require('./index');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.SKILLS_UI_PORT || 4200;
const API_KEY = process.env.EIGEN_API_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

app.use(express.static(path.join(__dirname, 'ui')));

// Init skill clients
const eigen = API_KEY ? new EigenAPI(API_KEY) : null;
const avsClient = API_KEY ? new AVSAPI(API_KEY) : null;
const rewards = API_KEY ? new RewardsAPI(API_KEY) : null;
const delegation = API_KEY ? new DelegationAPI(API_KEY) : null;
const compute = new EigenCompute();
const da = new EigenDA();

// ─── Tool definitions for the LLM ──────────

const TOOLS = [
    {
        type: 'function',
        function: {
            name: 'get_metrics',
            description: 'Get EigenLayer ecosystem-wide metrics: total TVL, staker count, operator count, strategy counts',
            parameters: { type: 'object', properties: {}, required: [] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_operators',
            description: 'List EigenLayer operators. Can sort by stakers, TVL, or APY. Use this for "top operators", "best operators", "operator list", etc.',
            parameters: {
                type: 'object',
                properties: {
                    take: { type: 'number', description: 'Number of results (default 10)' },
                    sortBy: { type: 'string', enum: ['stakers', 'tvl', 'apy'], description: 'Sort order (default: stakers)' },
                    search: { type: 'string', description: 'Search by name' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_operator',
            description: 'Get detailed info for a specific operator by their Ethereum address',
            parameters: {
                type: 'object',
                properties: { address: { type: 'string', description: 'Operator ETH address (0x...)' } },
                required: ['address']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_staker',
            description: 'Get staker info by their Ethereum address — shows delegation, deposits, position',
            parameters: {
                type: 'object',
                properties: { address: { type: 'string', description: 'Staker ETH address (0x...)' } },
                required: ['address']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_deposits',
            description: 'Get recent deposits. If address given, show deposits for that staker. Otherwise global.',
            parameters: {
                type: 'object',
                properties: {
                    address: { type: 'string', description: 'Optional staker address' },
                    take: { type: 'number', description: 'Number of results' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_withdrawals',
            description: 'Get recent withdrawals. If address given, show for that staker. Otherwise global.',
            parameters: {
                type: 'object',
                properties: {
                    address: { type: 'string', description: 'Optional staker address' },
                    take: { type: 'number', description: 'Number of results' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_historical_tvl',
            description: 'Get historical TVL data over time',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_delegation_events',
            description: 'Get recent delegation/undelegation events',
            parameters: {
                type: 'object',
                properties: { take: { type: 'number', description: 'Number of results' } }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_registration_events',
            description: 'Get operator registration/deregistration events',
            parameters: {
                type: 'object',
                properties: { take: { type: 'number', description: 'Number of results' } }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_avs_list',
            description: 'List all AVS (Actively Validated Services). Can sort by TVL, APY, or stakers.',
            parameters: {
                type: 'object',
                properties: {
                    take: { type: 'number', description: 'Number of results' },
                    sortBy: { type: 'string', enum: ['tvl', 'apy', 'stakers'] },
                    search: { type: 'string', description: 'Search by name' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_avs_detail',
            description: 'Get detailed info for a specific AVS by address',
            parameters: {
                type: 'object',
                properties: { address: { type: 'string', description: 'AVS contract address' } },
                required: ['address']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_avs_operators',
            description: 'Get operators registered to a specific AVS',
            parameters: {
                type: 'object',
                properties: {
                    address: { type: 'string', description: 'AVS address' },
                    take: { type: 'number' }
                },
                required: ['address']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_avs_stakers',
            description: 'Get stakers delegated to a specific AVS',
            parameters: {
                type: 'object',
                properties: {
                    address: { type: 'string', description: 'AVS address' },
                    take: { type: 'number' }
                },
                required: ['address']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_avs_rewards',
            description: 'Get rewards distributed by a specific AVS',
            parameters: {
                type: 'object',
                properties: { address: { type: 'string', description: 'AVS address' } },
                required: ['address']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_top_by_apy',
            description: 'Get top operators or AVS ranked by APY/yield',
            parameters: {
                type: 'object',
                properties: {
                    type: { type: 'string', enum: ['operators', 'avs'], description: 'Rank operators or AVS' },
                    take: { type: 'number' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_top_delegated',
            description: 'Get the most delegated operators (by staker count or TVL)',
            parameters: {
                type: 'object',
                properties: {
                    sortBy: { type: 'string', enum: ['stakers', 'tvl'] },
                    take: { type: 'number' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_operator_delegation',
            description: 'Get delegation profile for a specific operator (stakers, shares, TVL)',
            parameters: {
                type: 'object',
                properties: { address: { type: 'string', description: 'Operator address' } },
                required: ['address']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'compute_health',
            description: 'Check if EigenCompute ecloud CLI is installed and if we are inside a TEE',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'tee_attestation',
            description: 'Collect TEE attestation data (platform, app ID, KMS key, uptime)',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'da_health',
            description: 'Check if the EigenDA proxy is running',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'da_explorer_url',
            description: 'Generate an EigenDA blob explorer URL for a given commitment hash',
            parameters: {
                type: 'object',
                properties: { commitment: { type: 'string', description: 'Blob commitment hash' } },
                required: ['commitment']
            }
        }
    },
];

// ─── Tool execution ─────────────────────────

async function executeTool(name, args) {
    switch (name) {
        case 'get_metrics':
            return eigen.getMetrics();
        case 'get_operators': {
            const sortMap = { stakers: 'sortByTotalStakers', tvl: 'sortByTvl', apy: 'sortByApy' };
            const opts = { take: args.take || 10, withTvl: false };
            const key = sortMap[args.sortBy || 'stakers'];
            opts[key] = 'desc';
            if (args.search) opts.searchByText = args.search;
            return eigen.getOperators(opts);
        }
        case 'get_operator':
            return eigen.getOperator(args.address, true);
        case 'get_staker':
            return eigen.getStaker(args.address);
        case 'get_deposits':
            return args.address
                ? eigen.getStakerDeposits(args.address, { take: args.take || 10 })
                : eigen.getDeposits({ take: args.take || 10 });
        case 'get_withdrawals':
            return args.address
                ? eigen.getStakerWithdrawals(args.address, { take: args.take || 10 })
                : eigen.getWithdrawals({ take: args.take || 10 });
        case 'get_historical_tvl':
            return eigen.getHistoricalMetrics();
        case 'get_delegation_events':
            return eigen.getDelegationEvents({ take: args.take || 10 });
        case 'get_registration_events':
            return eigen.getRegistrationEvents({ take: args.take || 10 });
        case 'get_avs_list': {
            const opts = { take: args.take || 10, withTvl: false };
            if (args.sortBy === 'apy') opts.sortByApy = 'desc';
            else if (args.sortBy === 'tvl') opts.sortByTvl = 'desc';
            else if (args.sortBy === 'stakers') opts.sortByTotalStakers = 'desc';
            if (args.search) opts.searchByText = args.search;
            return avsClient.getAllAVS(opts);
        }
        case 'get_avs_detail':
            return avsClient.getAVS(args.address, false);
        case 'get_avs_operators':
            return avsClient.getAVSOperators(args.address, { take: args.take || 10 });
        case 'get_avs_stakers':
            return avsClient.getAVSStakers(args.address, { take: args.take || 10 });
        case 'get_avs_rewards':
            return rewards.getAVSRewards(args.address);
        case 'get_top_by_apy':
            return args.type === 'avs'
                ? rewards.getTopAVSByAPY(args.take || 10)
                : rewards.getTopOperatorsByAPY(args.take || 10);
        case 'get_top_delegated':
            return args.sortBy === 'tvl'
                ? delegation.getTopOperatorsByTVL(args.take || 10)
                : delegation.getTopDelegatedOperators(args.take || 10);
        case 'get_operator_delegation':
            return delegation.getOperatorDelegation(args.address);
        case 'compute_health':
            return compute.healthCheck();
        case 'tee_attestation':
            return compute.collectAttestation();
        case 'da_health':
            return da.healthCheck().then(ok => ({ proxyRunning: ok, proxyUrl: da.proxyUrl }));
        case 'da_explorer_url':
            return { url: da.getExplorerUrl(args.commitment), network: 'sepolia' };
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
}

// ─── LLM chat with tool calling ─────────────

const SYSTEM_PROMPT = `You are the eigen-skills assistant — a friendly, concise helper that provides live EigenLayer data.

You have tools that call the EigenExplorer API to fetch real-time EigenLayer data: operators, AVS, stakers, TVL, rewards, delegation, deposits, withdrawals, plus EigenCompute (TEE) and EigenDA (blob storage) status.

Rules:
- Be conversational, short, and friendly. No walls of text.
- When showing data, format it nicely with bullet points and bold.
- When listing items, show a numbered list with key stats.
- For addresses, wrap in backticks.
- Always use the tools when the user asks for data — don't make up numbers.
- If the user is just chatting (greetings, jokes, etc.), respond naturally without calling tools.
- Keep responses under 300 words.
- Use emojis sparingly but tastefully.`;

async function chat(messages) {
    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'google/gemini-2.0-flash-001',
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1024,
    }, {
        headers: {
            'Authorization': `Bearer ${OPENROUTER_KEY}`,
            'Content-Type': 'application/json',
        },
        timeout: 30000,
    });
    return res.data.choices[0].message;
}

// Per-socket conversation history
const conversations = new Map();

io.on('connection', (socket) => {
    console.log(`[WS] Connected: ${socket.id}`);
    conversations.set(socket.id, [{ role: 'system', content: SYSTEM_PROMPT }]);
    socket.emit('system', { hasApiKey: !!API_KEY, hasLLM: !!OPENROUTER_KEY });

    socket.on('chat', async (msg) => {
        const text = msg.text?.trim();
        if (!text) return;

        const history = conversations.get(socket.id);
        history.push({ role: 'user', content: text });

        // Keep history manageable (last 20 messages + system)
        if (history.length > 22) {
            history.splice(1, history.length - 21);
        }

        try {
            socket.emit('reply', { text: '', type: 'thinking' });

            let response = await chat(history);

            // Handle tool calls (possibly multiple rounds)
            let rounds = 0;
            while (response.tool_calls && response.tool_calls.length > 0 && rounds < 5) {
                rounds++;
                history.push(response);

                // Execute all tool calls
                for (const tc of response.tool_calls) {
                    const args = JSON.parse(tc.function.arguments || '{}');
                    console.log(`[Tool] ${tc.function.name}(${JSON.stringify(args)})`);

                    let result;
                    try {
                        result = await executeTool(tc.function.name, args);
                    } catch (err) {
                        result = { error: err.message };
                    }

                    history.push({
                        role: 'tool',
                        tool_call_id: tc.id,
                        content: JSON.stringify(result).substring(0, 8000),
                    });
                }

                // Get next response (may have more tool calls or final answer)
                response = await chat(history);
            }

            // Final text response
            const content = response.content || 'hmm, I got the data but couldn\'t format a response. try again?';
            history.push({ role: 'assistant', content });
            socket.emit('reply', { text: content, type: 'success' });

        } catch (err) {
            console.error('[Error]', err.message);
            socket.emit('reply', {
                text: `sorry, something went wrong: ${err.message}`,
                type: 'error'
            });
        }
    });

    socket.on('disconnect', () => {
        conversations.delete(socket.id);
        console.log(`[WS] Disconnected: ${socket.id}`);
    });
});

server.listen(PORT, () => console.log(`\n⚡ eigen-skills chat at http://localhost:${PORT}\n`));
