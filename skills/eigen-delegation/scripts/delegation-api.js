/**
 * EigenLayer Delegation API Client
 *
 * Data source: EigenExplorer REST API
 * Covers: delegation events, operator-sets, staker ↔ operator delegation tracking
 */

const axios = require('axios');

const MAINNET = 'https://api.eigenexplorer.com';
const HOLESKY = 'https://api-holesky.eigenexplorer.com';

class DelegationAPI {
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

    // ─── Delegation Events ────────────────────────────────

    /**
     * Get recent delegation/undelegation events across the protocol.
     * @param {object} opts
     * @param {string} [opts.type] - 'DELEGATION' | 'UNDELEGATION'
     * @param {number} [opts.skip=0]
     * @param {number} [opts.take=12]
     */
    async getDelegationEvents(opts = {}) {
        const params = {
            skip: opts.skip || 0,
            take: opts.take || 12,
        };
        if (opts.type) params.type = opts.type;

        const { data } = await this.client.get('/events/delegation', { params });
        return data;
    }

    // ─── Operator Delegation Details ──────────────────────

    /**
     * Get an operator's full delegation profile (stakers, shares, strategies, TVL).
     * @param {string} operatorAddress
     */
    async getOperatorDelegation(operatorAddress) {
        const { data } = await this.client.get(`/operators/${operatorAddress}`, {
            params: { withTvl: 'true' },
        });
        return {
            address: data.address,
            name: data.metadataName,
            totalStakers: data.totalStakers,
            totalAvs: data.totalAvs,
            shares: data.shares,
            tvl: data.tvl,
            avsRegistrations: data.avsRegistrations,
        };
    }

    // ─── Top Delegated Operators ──────────────────────────

    /**
     * Get operators sorted by total stakers (most delegated first).
     * @param {number} [limit=10]
     */
    async getTopDelegatedOperators(limit = 10) {
        const { data } = await this.client.get('/operators', {
            params: {
                withTvl: 'true',
                sortByTotalStakers: 'desc',
                take: limit,
                skip: 0,
            },
        });
        return data;
    }

    /**
     * Get operators sorted by TVL (most capital delegated first).
     * @param {number} [limit=10]
     */
    async getTopOperatorsByTVL(limit = 10) {
        const { data } = await this.client.get('/operators', {
            params: {
                withTvl: 'true',
                sortByTvl: 'desc',
                take: limit,
                skip: 0,
            },
        });
        return data;
    }
}

module.exports = DelegationAPI;
