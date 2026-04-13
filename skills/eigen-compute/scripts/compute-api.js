/**
 * EigenCompute API — Wrapper around ecloud CLI for programmatic TEE management
 *
 * Provides a JS API over the ecloud CLI commands for app deployment,
 * lifecycle management, and TEE attestation.
 */

const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');

class EigenCompute {
    constructor() {
        this.cliAvailable = this._checkCLI();
    }

    _checkCLI() {
        try {
            execSync('ecloud --version', { stdio: 'pipe' });
            return true;
        } catch {
            return false;
        }
    }

    _exec(cmd) {
        if (!this.cliAvailable) throw new Error('ecloud CLI not installed. Run: npm install -g @layr-labs/ecloud-cli');
        try {
            return execSync(`ecloud ${cmd}`, { encoding: 'utf-8', timeout: 30000 }).trim();
        } catch (err) {
            throw new Error(`ecloud command failed: ${err.stderr || err.message}`);
        }
    }

    // ─── Authentication ───────────────────────────────────

    /**
     * Check which address the CLI is authenticated as.
     */
    whoami() {
        return this._exec('auth whoami');
    }

    // ─── App Management ───────────────────────────────────

    /**
     * List all deployed apps.
     */
    listApps() {
        const output = this._exec('compute app list');
        return output;
    }

    /**
     * Get info for a specific app.
     * @param {string} appId
     */
    getAppInfo(appId) {
        return this._exec(`compute app info ${appId}`);
    }

    /**
     * Get logs for a specific app.
     * @param {string} appId
     */
    getAppLogs(appId) {
        return this._exec(`compute app logs ${appId}`);
    }

    /**
     * Stop a running app.
     * @param {string} appId
     */
    stopApp(appId) {
        return this._exec(`compute app stop ${appId}`);
    }

    /**
     * Start a stopped app.
     * @param {string} appId
     */
    startApp(appId) {
        return this._exec(`compute app start ${appId}`);
    }

    // ─── TEE Attestation ──────────────────────────────────

    /**
     * Collect attestation data from inside a TEE container.
     * Call this from within a running EigenCompute deployment.
     */
    collectAttestation() {
        return {
            appId: process.env.ECLOUD_APP_ID || null,
            platform: 'Intel TDX (EigenCompute)',
            imageDigest: this._getImageDigest(),
            kmsKeyFingerprint: this._getKMSFingerprint(),
            nodeVersion: process.version,
            uptimeSeconds: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Hash config files to prove integrity.
     * @param {string[]} filePaths - paths to config files
     */
    computeConfigHash(filePaths) {
        const contents = [];
        const resolved = [];
        for (const p of filePaths) {
            try {
                const data = fs.readFileSync(p, 'utf-8');
                contents.push(data);
                resolved.push(p);
            } catch { /* skip missing files */ }
        }
        if (contents.length === 0) return { hash: null, files: [] };
        const hash = 'sha256:' + crypto.createHash('sha256').update(contents.join('\n')).digest('hex');
        return { hash, files: resolved };
    }

    _getKMSFingerprint() {
        try {
            const pem = fs.readFileSync('/usr/local/bin/kms-signing-public-key.pem', 'utf-8');
            return 'sha256:' + crypto.createHash('sha256').update(pem.trim()).digest('hex');
        } catch { return null; }
    }

    _getImageDigest() {
        if (process.env.IMAGE_DIGEST) return process.env.IMAGE_DIGEST;
        if (process.env.HOSTNAME) {
            try {
                const cgroup = fs.readFileSync('/proc/self/cgroup', 'utf-8');
                const match = cgroup.match(/docker[/-]([a-f0-9]{64})/);
                if (match) return 'container:' + match[1].substring(0, 12);
            } catch { /* not in docker */ }
        }
        return null;
    }

    // ─── Health ───────────────────────────────────────────

    healthCheck() {
        return {
            cliInstalled: this.cliAvailable,
            insideTEE: !!this._getKMSFingerprint(),
            hasAppId: !!process.env.ECLOUD_APP_ID,
        };
    }
}

module.exports = EigenCompute;
