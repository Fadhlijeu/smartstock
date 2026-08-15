/**
 * run.js — Cross-platform test entry point
 * Spawns electron with ELECTRON_RUN_AS_NODE=1 to execute tests/runner.js
 */

'use strict';

const { spawn } = require('child_process');
const path = require('path');
const electronPath = require('electron');

const runnerPath = path.join(__dirname, 'runner.js');

const child = spawn(electronPath, [runnerPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
  },
});

child.on('close', (code) => {
  process.exit(code || 0);
});
