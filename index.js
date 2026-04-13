/**
 * eigen-skills — EigenLayer data & infra skills for AI agents
 *
 * Install:  npx skills add zeeshan8281/eigen-skills
 * Usage:    Agents discover SKILL.md files in skills/ automatically.
 *           For programmatic use, require this module.
 */

const EigenAPI = require('./skills/eigen-restaking/scripts/eigen-api');
const AVSAPI = require('./skills/eigen-avs/scripts/avs-api');
const RewardsAPI = require('./skills/eigen-rewards/scripts/rewards-api');
const DelegationAPI = require('./skills/eigen-delegation/scripts/delegation-api');
const EigenCompute = require('./skills/eigen-compute/scripts/compute-api');
const EigenDA = require('./skills/eigen-da/scripts/da-api');

module.exports = {
    EigenAPI,
    AVSAPI,
    RewardsAPI,
    DelegationAPI,
    EigenCompute,
    EigenDA,
};
