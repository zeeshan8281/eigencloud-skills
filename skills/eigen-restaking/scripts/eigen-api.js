/**
 * EigenLayer Restaking API Client
 *
 * Data source: EigenExplorer REST API (https://api.eigenexplorer.com)
 * Auth: x-api-token header (free tier available at https://developer.eigenexplorer.com)
 *
 * Covers: operators, stakers, TVL, deposits, withdrawals
 */

const axios = require('axios');

const MAINNET = 'https://api.eigenexplorer.com';
const HOLESKY = 'https://api-holesky.eigenexplorer.com';

class EigenAPI {
    constructor(apiKey, { network = 'mainnet' } = {}) {
        if (!apiKey) throw new Error('EigenExplorer API key required. Get one free at https://developer.eigenexplorer.com');
        this.apiKey = apiKey;
        this.baseUrl = network === 'holesky' ? HOLESKY : MAINNET;
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'x-api-token': this.apiKey,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
    }

    // ─── Operators ────────────────────────────────────────

    /**
     * Get all operators with optional filtering and sorting.
     * @param {object} opts
     * @param {boolean} [opts.withTvl=true] - include TVL calculations
     * @param {string}  [opts.searchByText] - case-insensitive name search
     * @param {'asc'|'desc'} [opts.sortByTvl] - sort by TVL
     * @param {'asc'|'desc'} [opts.sortByApy] - sort by APY
     * @param {'asc'|'desc'} [opts.sortByTotalStakers] - sort by staker count
     * @param {number} [opts.skip=0]
     * @param {number} [opts.take=12]
     */
    async getOperators(opts = {}) {
        const params = {
            withTvl: opts.withTvl !== false ? 'true' : 'false',
            skip: opts.skip || 0,
            take: opts.take || 12,
        };
        if (opts.searchByText) params.searchByText = opts.searchByText;
        if (opts.sortByTvl) params.sortByTvl = opts.sortByTvl;
        if (opts.sortByApy) params.sortByApy = opts.sortByApy;
        if (opts.sortByTotalStakers) params.sortByTotalStakers = opts.sortByTotalStakers;
        if (opts.sortByTotalAvs) params.sortByTotalAvs = opts.sortByTotalAvs;

        const { data } = await this.client.get('/operators', { params });
        return data;
    }

    /**
     * Get a single operator by address.
     * @param {string} address - operator ETH address
     * @param {boolean} [withTvl=true]
     */
    async getOperator(address, withTvl = true) {
        const { data } = await this.client.get(`/operators/${address}`, {
            params: { withTvl: withTvl ? 'true' : 'false' },
        });
        return data;
    }

    /**
     * Get all operator addresses (lightweight, no metadata).
     */
    async getOperatorAddresses() {
        const { data } = await this.client.get('/operators/addresses');
        return data;
    }

    // ─── Stakers ──────────────────────────────────────────

    /**
     * Get staker info by address.
     * @param {string} address - staker wallet address
     */
    async getStaker(address) {
        const { data } = await this.client.get(`/stakers/${address}`);
        return data;
    }

    /**
     * Get withdrawals for a staker.
     * @param {string} address
     * @param {object} opts
     */
    async getStakerWithdrawals(address, opts = {}) {
        const { data } = await this.client.get(`/stakers/${address}/withdrawals`, {
            params: { skip: opts.skip || 0, take: opts.take || 12 },
        });
        return data;
    }

    /**
     * Get deposits for a staker.
     * @param {string} address
     * @param {object} opts
     */
    async getStakerDeposits(address, opts = {}) {
        const { data } = await this.client.get(`/stakers/${address}/deposits`, {
            params: { skip: opts.skip || 0, take: opts.take || 12 },
        });
        return data;
    }

    // ─── Deposits & Withdrawals (global) ──────────────────

    /**
     * Get all deposits.
     */
    async getDeposits(opts = {}) {
        const { data } = await this.client.get('/deposits', {
            params: { skip: opts.skip || 0, take: opts.take || 12 },
        });
        return data;
    }

    /**
     * Get all withdrawals.
     */
    async getWithdrawals(opts = {}) {
        const { data } = await this.client.get('/withdrawals', {
            params: { skip: opts.skip || 0, take: opts.take || 12 },
        });
        return data;
    }

    // ─── Ecosystem Metrics ────────────────────────────────

    /**
     * Get ecosystem-wide metrics (total TVL, staker count, operator count, etc.)
     */
    async getMetrics() {
        const { data } = await this.client.get('/metrics');
        return data;
    }

    /**
     * Get historical TVL metrics.
     * @param {object} opts
     */
    async getHistoricalMetrics(opts = {}) {
        const { data } = await this.client.get('/metrics/historical/tvl', {
            params: opts,
        });
        return data;
    }

    // ─── Events ───────────────────────────────────────────

    /**
     * Get delegation events (shares increased/decreased, staker delegated/undelegated).
     * @param {object} opts
     */
    async getDelegationEvents(opts = {}) {
        const { data } = await this.client.get('/events/delegation', {
            params: { skip: opts.skip || 0, take: opts.take || 12 },
        });
        return data;
    }

    /**
     * Get operator registration/deregistration events.
     * @param {object} opts
     */
    async getRegistrationEvents(opts = {}) {
        const { data } = await this.client.get('/events/registration-status', {
            params: { skip: opts.skip || 0, take: opts.take || 12 },
        });
        return data;
    }

    // ─── Health ───────────────────────────────────────────

    /**
     * Health check — hit the metrics endpoint as a lightweight ping.
     */
    async healthCheck() {
        try {
            const { data } = await this.client.get('/metrics');
            return { ok: true, tvl: data?.tvl?.tvl || data?.tvl };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    }
}

module.exports = EigenAPI;
