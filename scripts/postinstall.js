#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Resolve symlinks to get the real path, then find the package root
const scriptDir = fs.realpathSync(__dirname);
const packageDir = path.resolve(scriptDir, '..');
const src = path.join(packageDir, 'SKILL.md');

if (!fs.existsSync(src)) {
    process.exit(0);
}

// Walk up from the original __dirname (may be symlinked) to find project root
// npm sets INIT_CWD to where `npm install` was run
const projectRoot = process.env.INIT_CWD || path.resolve(packageDir, '..', '..');

// Don't run if we're installing our own deps
if (path.resolve(projectRoot) === path.resolve(packageDir)) {
    process.exit(0);
}

if (!fs.existsSync(path.join(projectRoot, 'package.json'))) {
    process.exit(0);
}

const destDir = path.join(projectRoot, '.claude', 'skills', 'eigen');
const dest = path.join(destDir, 'SKILL.md');

try {
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
    console.log('\n⚡ eigen-skills: SKILL.md installed to .claude/skills/eigen/');
    console.log('  Claude Code can now query live EigenLayer data.');
    console.log('  Set your API key: export EIGEN_API_KEY="your-key"\n');
} catch (err) {
    // Silent fail — don't break the user's install
}
