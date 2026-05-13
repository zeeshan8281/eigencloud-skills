/**
 * eigen-skills — EigenCompute TEE deployment for AI agents
 *
 * MCP Server:  eigen-mcp (for Cursor, Claude Desktop, etc.)
 * Claude Code: Discovers SKILL.md automatically
 * Programmatic: require('eigen-skills')
 */

const EigenCompute = require('./skills/eigen-compute/scripts/compute-api');

module.exports = {
    EigenCompute,
    default: EigenCompute,
};
