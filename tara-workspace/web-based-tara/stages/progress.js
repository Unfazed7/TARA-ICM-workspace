'use strict';
/**
 * Progress lines for the run log. A stage program run from the command line turns them on;
 * the backend copies them into logs/aegis.log. Off when a stage is used as a library (tests).
 * Never pass document contents, prompts or keys: names, counts, timings and error text only.
 */

let stage = null;

function enable(name) {
  stage = name;
}

function progress(text) {
  if (stage) process.stdout.write(`[${stage}] ${text}\n`);
}

module.exports = { enable, progress };
