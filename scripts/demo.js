#!/usr/bin/env node

/**
 * Demo — run all eigen-agent-skills to verify they work.
 *
 * Usage:
 *   EIGEN_API_KEY=your_key node scripts/demo.js
 */

const EigenAPI = require('../skills/eigen-restaking/scripts/eigen-api');
const AVSAPI = require('../skills/eigen-avs/scripts/avs-api');
const RewardsAPI = require('../skills/eigen-rewards/scripts/rewards-api');
const DelegationAPI = require('../skills/eigen-delegation/scripts/delegation-api');

const API_KEY = process.env.EIGEN_API_KEY;

if (!API_KEY) {
    console.error('❌  Set EIGEN_API_KEY env var. Get a free key at https://developer.eigenexplorer.com');
    process.exit(1);
}

async function run() {
    console.log('\n🔄 ═════════════════════════════════════');
    console.log('   Eigen Agent Skills — Demo');
    console.log('═══════════════════════════════════════\n');

    const eigen = new EigenAPI(API_KEY);
    const avs = new AVSAPI(API_KEY);
    const rewards = new RewardsAPI(API_KEY);
    const delegation = new DelegationAPI(API_KEY);

    // 1. Health check
    console.log('📡 Health check...');
    const health = await eigen.healthCheck();
    console.log(`   Status: ${health.ok ? '✅ Healthy' : '❌ Failed'}`);
    if (health.tvl) console.log(`   EigenLayer TVL: ${JSON.stringify(health.tvl)}`);
    console.log('');

    // 2. Ecosystem metrics
    console.log('📊 Ecosystem Metrics...');
    const metrics = await eigen.getMetrics();
    console.log(`   ${JSON.stringify(metrics, null, 2).substring(0, 500)}`);
    console.log('');

    // 3. Top 5 operators by TVL
    console.log('👥 Top 5 Operators by TVL...');
    const ops = await eigen.getOperators({ sortByTvl: 'desc', take: 5 });
    if (ops.data) {
        ops.data.forEach((op, i) => {
            console.log(`   ${i + 1}. ${op.metadataName || op.address} — TVL: ${JSON.stringify(op.tvl?.tvl || 'N/A')} — Stakers: ${op.totalStakers}`);
        });
    }
    console.log('');

    // 4. Top 5 AVS by TVL
    console.log('🛡️  Top 5 AVS by TVL...');
    const avsList = await avs.getAllAVS({ sortByTvl: 'desc', take: 5 });
    if (avsList.data) {
        avsList.data.forEach((a, i) => {
            console.log(`   ${i + 1}. ${a.metadataName || a.address} — TVL: ${JSON.stringify(a.tvl?.tvl || 'N/A')}`);
        });
    }
    console.log('');

    // 5. Top 5 operators by APY
    console.log('💰 Top 5 Operators by APY...');
    const topApy = await rewards.getTopOperatorsByAPY(5);
    if (topApy.data) {
        topApy.data.forEach((op, i) => {
            console.log(`   ${i + 1}. ${op.metadataName || op.address} — APY: ${op.maxApy || 'N/A'}`);
        });
    }
    console.log('');

    // 6. Top 5 operators by delegation
    console.log('🤝 Top 5 Operators by Delegation (staker count)...');
    const topDel = await delegation.getTopDelegatedOperators(5);
    if (topDel.data) {
        topDel.data.forEach((op, i) => {
            console.log(`   ${i + 1}. ${op.metadataName || op.address} — Stakers: ${op.totalStakers} — AVS: ${op.totalAvs}`);
        });
    }
    console.log('');

    console.log('═══════════════════════════════════════');
    console.log('   ✅ Demo complete');
    console.log('═══════════════════════════════════════\n');
}

run().catch(err => {
    console.error('Demo failed:', err.message);
    process.exit(1);
});
