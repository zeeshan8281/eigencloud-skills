/**
 * EigenDA API Client — Blob Storage via Local Proxy
 *
 * Stores and retrieves data blobs on EigenDA through the local proxy.
 * Proxy handles KZG commitments, encoding, and disperser communication.
 *
 * Proxy endpoints:
 *   POST /put?commitment_mode=standard  → store blob, get commitment hash
 *   GET  /get/<commitment>?commitment_mode=standard → retrieve stored blob
 *   GET  /health → proxy health check
 */

const axios = require('axios');

class EigenDA {
    /**
     * @param {object} opts
     * @param {string} [opts.proxyUrl='http://127.0.0.1:3100']
     * @param {string} [opts.commitmentMode='standard'] - 'standard' | 'optimistic'
     * @param {number} [opts.timeout=60000]
     */
    constructor(opts = {}) {
        this.proxyUrl = opts.proxyUrl || process.env.EIGENDA_PROXY_URL || 'http://127.0.0.1:3100';
        this.commitmentMode = opts.commitmentMode || process.env.EIGENDA_COMMITMENT_MODE || 'standard';
        this.timeout = opts.timeout || parseInt(process.env.EIGENDA_TIMEOUT || '60000', 10);

        this.client = axios.create({
            baseURL: this.proxyUrl,
            timeout: this.timeout,
        });
    }

    /**
     * Store a JSON payload on EigenDA.
     * @param {object} data - the data to store
     * @returns {Promise<string>} commitment hash
     */
    async store(data) {
        const payload = JSON.stringify(data);
        console.log(`[EigenDA] Storing blob (${payload.length} bytes)...`);

        try {
            const response = await this.client.post(
                `/put?commitment_mode=${this.commitmentMode}`,
                payload,
                { headers: { 'Content-Type': 'application/json' } }
            );

            const commitment = response.data;
            if (!commitment || typeof commitment !== 'string') {
                throw new Error(`Invalid commitment: ${JSON.stringify(response.data)}`);
            }

            console.log(`[EigenDA] ✅ Stored. Commitment: ${commitment.substring(0, 40)}...`);
            return commitment;
        } catch (error) {
            const msg = this._formatError(error);
            console.error(`[EigenDA] ❌ Store failed: ${msg}`);
            throw new Error(`EigenDA store failed: ${msg}`);
        }
    }

    /**
     * Retrieve a blob from EigenDA by commitment.
     * @param {string} commitment
     * @returns {Promise<object>} parsed JSON
     */
    async retrieve(commitment) {
        console.log(`[EigenDA] Retrieving blob: ${commitment.substring(0, 40)}...`);

        try {
            const response = await this.client.get(
                `/get/${commitment}?commitment_mode=${this.commitmentMode}`
            );

            const payload = response.data;
            if (typeof payload === 'string') {
                return JSON.parse(payload);
            }
            return payload;
        } catch (error) {
            const msg = this._formatError(error);
            console.error(`[EigenDA] ❌ Retrieve failed: ${msg}`);
            throw new Error(`EigenDA retrieve failed: ${msg}`);
        }
    }

    /**
     * Get the EigenDA blob explorer URL for a commitment.
     * @param {string} commitment
     * @param {string} [network='sepolia']
     * @returns {string}
     */
    getExplorerUrl(commitment, network = 'sepolia') {
        const base = network === 'mainnet'
            ? 'https://blobs.eigenda.xyz/blobs'
            : 'https://blobs-sepolia.eigenda.xyz/blobs';
        return `${base}/${commitment}`;
    }

    /**
     * Health check — ping the proxy.
     * @returns {Promise<boolean>}
     */
    async healthCheck() {
        try {
            const response = await this.client.get('/health', {
                validateStatus: () => true,
                timeout: 5000,
            });
            return response.status === 200 || response.status === 404;
        } catch {
            return false;
        }
    }

    _formatError(error) {
        if (axios.isAxiosError(error) && error.response) {
            return `HTTP ${error.response.status}: ${typeof error.response.data === 'string'
                ? error.response.data
                : JSON.stringify(error.response.data)
                }`;
        }
        return error.message || String(error);
    }
}

module.exports = EigenDA;
