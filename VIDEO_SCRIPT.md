# Eigen Skills & Eigen MCP — Code Walkthrough Script

## Video Details
- **Target length**: ~10-12 minutes
- **Tone**: Developer-to-developer, casual but technically precise
- **Audience**: Devs interested in AI agent tooling, EigenLayer ecosystem

---

## FLOW (at a glance)

```
1. Hook & Context           (~1 min)
2. Project Overview          (~1 min)
3. Skills Deep Dive          (~3 min)
4. MCP Deep Dive             (~2 min)
5. Skills vs MCP — same data, two paths  (~1 min)
6. Live Demo                 (~3 min)
7. Chat UI & Deployment      (~1.5 min)
8. Wrap-up                   (~30s)
```

---

## SCRIPT

### 1. Hook & Context (0:00 – 1:00)

> "What if any AI agent — Claude Code, Cursor, Windsurf — could query live EigenLayer data just by reading a markdown file?
>
> That's what we built. This is `eigen-skills` — an open-source package that gives AI agents the ability to query operators, AVS data, staker positions, rewards, delegation events, TEE compute, and data availability blobs — all from the EigenLayer ecosystem.
>
> There are two integration paths: **Agent Skills** for Claude Code and compatible agents, and **MCP** for Claude Desktop, Cursor, and Windsurf. Let me walk you through the code."

---

### 2. Project Overview (1:00 – 2:00)

**[SCREEN: terminal, run `ls` or show file tree]**

> "Here's the repo structure. At the top level:
>
> - `skills/` — six skill modules, one per EigenLayer domain
> - `eigen-mcp/` — a standalone MCP server package
> - `index.js` — exports all six API client classes
> - `server.js` — a chat UI powered by Gemini with tool-use
> - `Dockerfile` + `entrypoint.sh` — for deploying into EigenCompute TEE
>
> The key insight is that **skills and MCP share the same API client layer**. Let me show you."

**[SCREEN: open `index.js`]**

> "Six classes. `EigenAPI`, `AVSAPI`, `RewardsAPI`, `DelegationAPI`, `EigenCompute`, `EigenDA`. Every integration path — skills, MCP, chat UI — uses these same clients underneath."

---

### 3. Skills Deep Dive (2:00 – 5:00)

**[SCREEN: open `skills/` directory]**

> "Each skill follows the same pattern: a `SKILL.md` file and a `scripts/` folder with the JS client."

**[SCREEN: open `skills/eigen-restaking/SKILL.md`]**

> "This is the magic. The `SKILL.md` is a markdown file that an agent reads to understand what it can do. It has:
>
> - A description of the skill's purpose
> - The base URL and auth headers
> - Complete curl examples for every endpoint
>
> When a user asks Claude Code something like 'show me the top EigenLayer operators by TVL', Claude reads this file, picks the right curl command, runs it, and formats the response. No SDK, no dependencies — just curl."

**[SCREEN: open `skills/eigen-avs/SKILL.md` briefly]**

> "Same pattern for AVS data — services, their operators, their stakers."

**[SCREEN: open `skills/eigen-rewards/SKILL.md` briefly]**

> "Rewards and APY rankings..."

**[SCREEN: open one API client, e.g. `skills/eigen-restaking/scripts/eigen-api.js`]**

> "And if you want to use these programmatically in your own Node app, each skill also has a JS client. Standard axios wrapper — constructor takes an API key, methods map to endpoints. Nothing fancy, deliberately simple."

**[SCREEN: open `scripts/postinstall.js`]**

> "One nice DX touch — when you `npm install eigen-skills`, the postinstall hook copies the unified `SKILL.md` into `~/.claude/skills/eigen/`. Claude Code auto-discovers skills in that directory, so installation is literally one command and you're done."

---

### 4. MCP Deep Dive (5:00 – 7:00)

**[SCREEN: open `eigen-mcp/` directory]**

> "Now the second integration path — MCP, the Model Context Protocol.
>
> MCP is a standard from Anthropic for exposing tools to AI agents over a structured RPC interface. Instead of the agent reading markdown and running curl, the agent calls named tools with typed parameters and gets structured JSON back."

**[SCREEN: open `eigen-mcp/mcp.js`]**

> "Here's the server. It imports the same six API clients from `eigen-skills`, then registers 21 tools.
>
> Each tool has a name, description, and a Zod schema for parameter validation. When Claude Desktop or Cursor calls `get_operators`, the MCP server runs `eigenAPI.getOperators()` and returns the result.
>
> Look — the tool implementations are just thin wrappers around the same API clients the skills use. Same data, different delivery mechanism."

**[SCREEN: show the tool registration pattern — pick `get_metrics` and `get_operators`]**

> "Simple example: `get_metrics` takes no parameters, calls `eigenAPI.getMetrics()`, returns JSON. `get_operators` takes optional skip, take, and search parameters with Zod validation."

**[SCREEN: open `eigen-mcp/README.md` — show config snippets]**

> "To use it, you register it with your client. For Claude Desktop, add it to `claude_desktop_config.json`. For Cursor or Windsurf, similar JSON config. One line: `npx eigen-mcp`."

---

### 5. Skills vs MCP — Same Data, Two Paths (7:00 – 8:00)

**[SCREEN: side-by-side or diagram]**

> "So why two paths?
>
> **Skills** are the agent-native approach. The agent reads a markdown file, understands the API surface, and runs curl commands. No server process, no extra dependencies. Works great with Claude Code and any agent that supports the skills spec.
>
> **MCP** is the protocol-native approach. A server process exposes typed tools over stdio. Better for IDE integrations like Cursor and Windsurf where you want structured tool calling.
>
> Both hit the same EigenExplorer API. Both return the same data. It's about meeting agents where they are."

---

### 6. Live Demo (8:00 – 11:00)

**[SCREEN: terminal with Claude Code open]**

> "Let me show you this working. I've got Claude Code open with eigen-skills installed."

**Demo queries (pick 3-4):**

1. **"What's the current EigenLayer TVL?"** — hits `get_metrics`, shows ecosystem stats
2. **"Show me the top 5 operators by TVL"** — hits `get_operators`, tabular output
3. **"What AVS has the most operators?"** — hits `get_avs_list`, cross-references data
4. **"Show me the highest APY strategies"** — hits rewards skill, shows yield data

> *(narrate what Claude is doing as it runs — "it's reading the skill file... picking the right endpoint... running the curl... formatting the response")*

**[Optional: show the MCP path too in Claude Desktop or Cursor if set up]**

---

### 7. Chat UI & TEE Deployment (11:00 – 12:30)

**[SCREEN: open `server.js` briefly]**

> "Bonus — there's also a web chat UI. Express server, Socket.io for real-time chat, Gemini as the LLM via OpenRouter. It has the same 21 tools defined inline. You can ask EigenLayer questions in a browser."

**[SCREEN: open `ui/index.html` or show the running UI briefly]**

**[SCREEN: open `Dockerfile` and `entrypoint.sh`]**

> "And the whole thing can be deployed into EigenCompute — Intel TDX trusted execution environments. The entrypoint script sources sealed secrets from the TEE, writes the env file, and starts the server. Your API keys never leave the enclave."

---

### 8. Wrap-up (12:30 – 13:00)

> "That's eigen-skills. Six EigenLayer domains, two integration paths, same underlying clients.
>
> `npm install eigen-skills` for Claude Code. `npx eigen-mcp` for Claude Desktop and Cursor. Or use the JS clients directly in your own app.
>
> Links in the description. Star the repo, open issues, PRs welcome."

---

## Production Notes

- **Screen recordings**: Use a clean terminal theme, large font (16-18pt)
- **Code highlights**: When showing files, zoom into the relevant section — don't scroll through entire files
- **Transitions**: Cut between terminal and editor, avoid long pauses
- **B-roll ideas**: EigenExplorer website, EigenLayer docs, Claude Code in action
- **Thumbnail**: Terminal with EigenLayer logo + "AI Agent Skills" text
