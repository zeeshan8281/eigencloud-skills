#!/usr/bin/env node

/**
 * EigenCompute MCP — HTTP transport for web IDEs.
 *
 * Web IDEs (Cursor web, VS Code for Web, etc.) run in a browser sandbox and
 * can't spawn a local stdio subprocess, so they connect to MCP servers over a
 * URL. This exposes the same tools as src/mcp-server.js over HTTP:
 *
 *   POST/GET/DELETE  /mcp   — Streamable HTTP transport (current MCP standard)
 *   GET              /sse   — legacy SSE transport (older web-IDE clients)
 *   POST             /messages?sessionId=...  — legacy SSE message channel
 *   GET              /health — liveness probe
 *
 * Run: npm run mcp:http   (PORT defaults to 3333, override with MCP_HTTP_PORT)
 */

const express = require('express');
const { randomUUID } = require('crypto');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { isInitializeRequest } = require('@modelcontextprotocol/sdk/types.js');
const { createServer } = require('./mcp-server.js');

// PORT is injected by most hosts (Railway, Render, etc.); fall back to MCP_HTTP_PORT, then 3333.
const PORT = process.env.PORT || process.env.MCP_HTTP_PORT || 3333;
const HOST = process.env.MCP_HTTP_HOST || '0.0.0.0';

// Bearer-token auth. When MCP_AUTH_TOKEN is set, every MCP request must send
// `Authorization: Bearer <token>`. When unset, auth is OFF (local dev) and we
// warn loudly — never run a public instance without it.
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || '';

const app = express();

// CORS — browser-based IDEs enforce it. Expose Mcp-Session-Id so the client
// can read the session header the Streamable HTTP transport returns.
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.MCP_CORS_ORIGIN || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, mcp-session-id, last-event-id');
    res.header('Access-Control-Expose-Headers', 'Mcp-Session-Id');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// /health is intentionally public (liveness probes). Everything else needs the token.
app.get('/health', (req, res) => {
    res.json({ ok: true, server: 'eigencompute', transports: ['streamable-http', 'sse'], authRequired: !!AUTH_TOKEN });
});

app.use((req, res, next) => {
    if (!AUTH_TOKEN) return next(); // auth disabled — local dev only
    const hdr = req.headers['authorization'] || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7).trim() : '';
    if (token !== AUTH_TOKEN) {
        return res.status(401).json({
            jsonrpc: '2.0',
            error: { code: -32001, message: 'Unauthorized: missing or invalid bearer token' },
            id: null,
        });
    }
    next();
});

// ─── Streamable HTTP transport (modern) ─────────────────────────
// One transport per session, keyed by the Mcp-Session-Id header.

const streamTransports = {};

app.post('/mcp', express.json(), async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    let transport;

    if (sessionId && streamTransports[sessionId]) {
        transport = streamTransports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sid) => { streamTransports[sid] = transport; },
        });
        transport.onclose = () => {
            if (transport.sessionId) delete streamTransports[transport.sessionId];
        };
        await createServer().connect(transport);
    } else {
        return res.status(400).json({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Bad Request: no valid session ID' },
            id: null,
        });
    }

    await transport.handleRequest(req, res, req.body);
});

// GET (server->client stream) and DELETE (session teardown) share a handler.
async function handleStreamSession(req, res) {
    const sessionId = req.headers['mcp-session-id'];
    if (!sessionId || !streamTransports[sessionId]) {
        return res.status(400).send('Invalid or missing session ID');
    }
    await streamTransports[sessionId].handleRequest(req, res);
}

app.get('/mcp', handleStreamSession);
app.delete('/mcp', handleStreamSession);

// ─── Legacy SSE transport (older web-IDE clients) ───────────────

const sseTransports = {};

app.get('/sse', async (req, res) => {
    const transport = new SSEServerTransport('/messages', res);
    sseTransports[transport.sessionId] = transport;
    res.on('close', () => { delete sseTransports[transport.sessionId]; });
    await createServer().connect(transport);
});

app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId;
    const transport = sseTransports[sessionId];
    if (!transport) {
        return res.status(400).send('No transport found for sessionId');
    }
    // Note: SSEServerTransport parses the raw body itself — do not json()-parse first.
    await transport.handlePostMessage(req, res);
});

app.listen(PORT, HOST, () => {
    console.error(`EigenCompute MCP HTTP server listening on http://${HOST}:${PORT}`);
    console.error(`  Streamable HTTP:  http://localhost:${PORT}/mcp`);
    console.error(`  Legacy SSE:       http://localhost:${PORT}/sse`);
    console.error(AUTH_TOKEN
        ? '  Auth:             ON (Bearer token required)'
        : '  Auth:             OFF — set MCP_AUTH_TOKEN before exposing publicly!');
});
