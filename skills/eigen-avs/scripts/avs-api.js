/**
 * EigenLayer AVS (Actively Validated Services) API Client
 *
 * Data source: EigenExplorer REST API
 * Covers: AVS listing, detail, operators per AVS, stakers per AVS, registration events
 */

const axios = require('axios');

const MAINNET = 'https://api.eigenexplorer.com';
const HOLESKY = 'https://api-holesky.eigenexplorer.com';

class AVSAPI {
    constructor(apiKey, { network = 'mainnet' } = {}) {
        if (!apiKey) throw new Error('EigenExplorer API key required. Get one free at https://developer.eigenexplorer.com');
        this.client = axios.create({
            baseURL: network === 'holesky' ? HOLESKY : MAINNET,
            headers: {
                'x-api-token': apiKey,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
    }

    // ─── AVS Listing ──────────────────────────────────────

    /**
     * Get all AVS with optional filtering and sorting.
     * @param {object} opts
     * @param {boolean} [opts.withTvl=true]
     * @param {string}  [opts.searchByText] - search AVS by name
     * @param {'asc'|'desc'} [opts.sortByTvl]
     * @param {'asc'|'desc'} [opts.sortByApy]
     * @param {'asc'|'desc'} [opts.sortByTotalStakers]
     * @param {number} [opts.skip=0]
     * @param {number} [opts.take=12]
     */
    async getAllAVS(opts = {}) {
        const params = {
            withTvl: opts.withTvl !== false ? 'true' : 'false',
            skip: opts.skip || 0,
            take: opts.take || 12,
        };
        if (opts.searchByText) params.searchByText = opts.searchByText;
        if (opts.sortByTvl) params.sortByTvl = opts.sortByTvl;
        if (opts.sortByApy) params.sortByApy = opts.sortByApy;
        if (opts.sortByTotalStakers) params.sortByTotalStakers = opts.sortByTotalStakers;

        const { data } = await this.client.get('/avs', { params });
        return data;
    }

    /**
     * Get AVS addresses only (lightweight).
     */
    async getAVSAddresses() {
        const { data } = await this.client.get('/avs/addresses');
        return data;
    }

    /**
     * Get detailed info for a single AVS.
     * @param {string} address - AVS contract address
     * @param {boolean} [withTvl=true]
     */
    async getAVS(address, withTvl = true) {
        const { data } = await this.client.get(`/avs/${address}`, {
            params: { withTvl: withTvl ? 'true' : 'false' },
        });
        return data;
    }

    // ─── AVS ↔ Operators ─────────────────────────────────

    /**
     * Get operators registered to a specific AVS.
     * @param {string} avsAddress
     * @param {object} opts
     */
    async getAVSOperators(avsAddress, opts = {}) {
        const { data } = await this.client.get(`/avs/${avsAddress}/operators`, {
            params: { skip: opts.skip || 0, take: opts.take || 12 },
        });
        return data;
    }

    // ─── AVS ↔ Stakers ───────────────────────────────────

    /**
     * Get stakers delegated to a specific AVS.
     * @param {string} avsAddress
     * @param {object} opts
     */
    async getAVSStakers(avsAddress, opts = {}) {
        const { data } = await this.client.get(`/avs/${avsAddress}/stakers`, {
            params: { skip: opts.skip || 0, take: opts.take || 12 },
        });
        return data;
    }

    // ─── AVS Registration Events ──────────────────────────

    /**
     * Get registration/deregistration events for a specific AVS.
     * @param {string} avsAddress
     * @param {object} opts
     */
    async getAVSRegistrationEvents(avsAddress, opts = {}) {
        const { data } = await this.client.get(`/avs/${avsAddress}/events/registration-status`, {
            params: { skip: opts.skip || 0, take: opts.take || 12 },
        });
        return data;
    }
}

module.exports = AVSAPI;
