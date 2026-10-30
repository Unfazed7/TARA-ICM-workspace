'use strict';
// Runs a real Stage 04 to 10 program with no model. FAKE_FAIL=stageNN makes that stage stop, as a failing agent would.
const { spawnSync } = require('child_process');
const path = require('path');

module.exports = function runOffline(number, folder) {
  if (process.env.FAKE_FAIL === `stage${number}`) {
    process.stderr.write(`Stage ${number} stopped. The model did not answer.\n`);
    process.exit(2);
  }
  const agent = path.resolve(__dirname, '..', '..', '..', 'tara-workspace', 'web-based-tara', 'stages', folder, 'agent.js');
  const done = spawnSync(process.execPath, ['-r', path.join(__dirname, '_offline_preload.js'), agent, ...process.argv.slice(2)], { stdio: 'inherit' });
  process.exit(done.status === null ? 1 : done.status);
};
