#!/usr/bin/env node
/**
 * demo-run.js — chains Stage 1 into the checkpoint API and prints the result.
 *
 * Two modes:
 *   --fixtures   Uses tests/fixtures/merged-model.sample.json +
 *                boundary-final.sample.json (no API key needed). Fastest way
 *                to see the whole CP1 flow work today.
 *   --live       Runs the real pipeline (extraction + reasoning) against
 *                files you supply. Needs ANTHROPIC_API_KEY.
 *
 * Usage:
 *   node scripts/demo-run.js --fixtures
 *   node scripts/demo-run.js --live --arch path/to/arch.png --topo path/to/topo.xlsx \
 *        --boundary "The item is the telematics function..."
 *
 * Requires the checkpoint-api server running locally:
 *   cd checkpoint-api && DATABASE_URL=sqlite:///./demo.db JWT_SECRET=dev-secret \
 *     python3 -m uvicorn checkpoint_api.main:app --reload --port 8000
 */

'use strict';

const fs = require('fs');
const path = require('path');

const API_BASE = process.env.CHECKPOINT_API_URL || 'http://localhost:8000';
const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo.analyst@aegis.local';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'demo-password-change-me-123';
const DEMO_NAME = process.env.DEMO_NAME || 'Demo Analyst';

let AUTH_TOKEN = null; // set by ensureDemoUser(), a real token from /auth/login

function authHeaders() {
  if (!AUTH_TOKEN) throw new Error('Not authenticated yet — call ensureDemoUser() first.');
  return { Authorization: `Bearer ${AUTH_TOKEN}`, 'Content-Type': 'application/json' };
}

async function call(method, urlPath, body, opts = {}) {
  const res = await fetch(`${API_BASE}${urlPath}`, {
    method,
    headers: opts.noAuth ? { 'Content-Type': 'application/json' } : authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) {
    throw new Error(`${method} ${urlPath} -> ${res.status}\n${JSON.stringify(json, null, 2)}`);
  }
  return json;
}

/**
 * Registers (idempotently) and logs in a real demo user through the actual
 * auth endpoints -- same flow the frontend login page uses. This is what
 * lets the seeded assessment appear in the real dashboard: it has a genuine
 * Assessment row with owner_id matching this user, not a fabricated id that
 * ProjectWorkspace.tsx would 404 on and redirect away from.
 */
async function ensureDemoUser() {
  try {
    await call('POST', '/api/v1/auth/register', { email: DEMO_EMAIL, password: DEMO_PASSWORD, name: DEMO_NAME }, { noAuth: true });
    console.log(`Registered demo user ${DEMO_EMAIL}`);
  } catch (e) {
    if (e.message.includes('409')) {
      console.log(`Demo user ${DEMO_EMAIL} already exists, logging in`);
    } else {
      throw e;
    }
  }
  const { access_token } = await call('POST', '/api/v1/auth/login', { email: DEMO_EMAIL, password: DEMO_PASSWORD }, { noAuth: true });
  AUTH_TOKEN = access_token;
}

/**
 * Creates a real Assessment through POST /api/v1/assessments -- this is the
 * row the dashboard's project list and ProjectWorkspace both read from.
 * Returns the server-assigned assessment_id (format ASS_XXXXXX), not a
 * client-generated one.
 */
async function createDemoAssessment(name) {
  const assessment = await call('POST', '/api/v1/assessments', {
    name,
    description: 'Created by scripts/demo-run.js for Stage 1 end-to-end testing.',
    vehicle_type: 'sedan',
    domains: ['vehicle', 'cloud'],
  });
  return assessment.assessment_id;
}

function section(title) {
  console.log(`\n${'─'.repeat(60)}\n${title}\n${'─'.repeat(60)}`);
}

async function runFixtureMode(assessmentId) {
  const fixturesDir = path.join(__dirname, '..', 'tests', 'fixtures');
  const mergedModel = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'merged-model.sample.json'), 'utf8'));
  const boundaryFinal = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'boundary-final.sample.json'), 'utf8'));

  // Reconstruct a plausible PROPOSAL from the sample final boundary, with
  // COMP-003 put back to 'ambiguous' so the demo exercises the real CP1 flow
  // (the sample fixture already shows the *resolved* state).
  const decisions = boundaryFinal.decisions.map((d) => ({ ...d }));
  const bcm = decisions.find((d) => d.status === 'out_of_scope' && d.decided_by === 'analyst');
  if (bcm) {
    bcm.status = 'ambiguous';
    bcm.escalation_reason = 'boundary_genuinely_unclear';
    bcm.decided_by = 'agent';
    bcm.rationale = 'Downstream of the gateway; statement does not clearly include or exclude it.';
  }

  section('1. Seeding boundary from Stage 1 pipeline output (fixtures)');
  const seeded = await call('POST', `/api/v1/assessments/${assessmentId}/boundary/seed`, {
    boundary_statement: boundaryFinal.boundary_statement,
    decisions,
    merged_model: mergedModel,
    conflicts: { model_ref: mergedModel.model_id, conflicts: [] },
    coverage: {
      sources_provided: ['architecture_diagram', 'feature_function_list'],
      sources_absent: ['network_topology', 'existing_item_definition', 'free_text_description'],
      consequences: [
        {
          absent_source: 'network_topology',
          impact: 'links/protocols derived',
          affected_count: 0,
          downstream_effect: 'Protocol confidence rests on architecture diagram alone.',
        },
      ],
      recommendation: 'Supplying network_topology would corroborate the CAN/HTTPS links already read from the diagram.',
    },
  });
  console.log(`Seeded ${seeded.boundary_id} — ${seeded.unresolved_count} unresolved of ${seeded.decisions.length} elements`);

  section('2. Attempting finalize while ambiguous (should be blocked)');
  try {
    await call('POST', `/api/v1/assessments/${assessmentId}/boundary/finalize`, { actor: 'demo_analyst' });
    console.log('UNEXPECTED: finalize succeeded while ambiguous elements remained.');
  } catch (e) {
    console.log('Correctly blocked:\n' + e.message.split('\n').slice(1).join('\n'));
  }

  const blockingId = bcm ? bcm.element_id : null;
  if (blockingId) {
    section(`3. Analyst resolves ${blockingId}`);
    const resolved = await call(
      'PATCH',
      `/api/v1/assessments/${assessmentId}/boundary/elements/${blockingId}`,
      {
        status: 'out_of_scope',
        rationale: 'Downstream ECU, not part of the telematics function per boundary statement.',
        actor: 'demo_analyst',
      },
    );
    console.log(`Resolved. Unresolved count now: ${resolved.unresolved_count}`);
  }

  section('4. Finalizing');
  const final = await call('POST', `/api/v1/assessments/${assessmentId}/boundary/finalize`, { actor: 'demo_analyst' });
  console.log(`Finalized ${final.boundary_id} — phase=${final.phase}, ${final.edit_count} edits logged`);

  section('5. Edit history (audit trail)');
  const edits = await call('GET', `/api/v1/assessments/${assessmentId}/boundary/edits`);
  for (const e of edits) {
    console.log(`  [${e.timestamp}] ${e.actor} · ${e.action} · ${e.element_id}`);
  }

  section('6. Confirming the frozen boundary rejects further edits');
  try {
    await call('PATCH', `/api/v1/assessments/${assessmentId}/boundary/elements/COMP-001`, {
      status: 'out_of_scope', rationale: 'This should be rejected by the freeze', actor: 'demo_analyst',
    });
    console.log('UNEXPECTED: edit succeeded on a finalized boundary.');
  } catch (e) {
    console.log('Correctly frozen:\n' + e.message.split('\n').slice(1).join('\n'));
  }

  section('Done');
  console.log(`Assessment: ${assessmentId}`);
  console.log(`\nOpen the frontend and log in with:`);
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  password: ${DEMO_PASSWORD}`);
  console.log(`Then open the project from the dashboard and click the Item Definition tab.`);
  console.log(`Direct link: http://localhost:5173/project/${assessmentId}`);
}

async function runLiveMode(args, assessmentId) {
  const agent = require(path.join(__dirname, '..', 'tara-workspace', 'stages', '01-item-definition', 'agent.js'));
  const archPath = args.arch;
  const topoPath = args.topo;
  const boundaryStatement = args.boundary;
  if (!boundaryStatement) throw new Error('--boundary "<statement>" is required');
  if (!archPath && !topoPath) throw new Error('at least one of --arch / --topo is required');

  const inputs = [];
  if (archPath) inputs.push({ filePath: archPath, sourceType: 'architecture_diagram' });
  if (topoPath) inputs.push({ filePath: topoPath, sourceType: 'network_topology' });

  const outDir = path.join(__dirname, '..', '.demo-output', assessmentId);
  fs.mkdirSync(outDir, { recursive: true });

  section('1. Running Stage 1 pipeline (extraction -> reconcile -> boundary proposal)');
  console.log('This calls the Anthropic API and may take 30-90s...');
  const result = await agent.runToCheckpoint1(inputs, boundaryStatement, outDir);
  console.log(`Pipeline complete. ${result.mergedModel.elements.length} elements, ${result.proposal.decisions.filter(d => d.status === 'ambiguous').length} ambiguous.`);

  section('2. Seeding into checkpoint API');
  const seeded = await call('POST', `/api/v1/assessments/${assessmentId}/boundary/seed`, {
    boundary_statement: boundaryStatement,
    decisions: result.proposal.decisions,
    merged_model: result.mergedModel,
    conflicts: result.conflicts,
    coverage: result.coverage,
  });
  console.log(`Seeded ${seeded.boundary_id}. ${seeded.unresolved_count} elements need analyst review.`);
  console.log(`\nResolve them via the API or frontend, then finalize:`);
  console.log(`  POST /api/v1/assessments/${assessmentId}/boundary/finalize`);
  console.log(`\nOnce finalized, resume generation:`);
  console.log(`  node -e "require('./tara-workspace/stages/01-item-definition/agent.js').resumeAfterCheckpoint1('${outDir}', 'Item Name', null)"`);
}

async function main() {
  const args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      args[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    }
  }

  if (!args.fixtures && !args.live) {
    console.log('\nUsage:');
    console.log('  node scripts/demo-run.js --fixtures');
    console.log('  node scripts/demo-run.js --live --arch <path> [--topo <path>] --boundary "<statement>"');
    process.exit(1);
  }

  console.log(`Checkpoint API: ${API_BASE}`);

  const reachable = await fetch(`${API_BASE}/docs`).then((r) => r.ok).catch(() => false);
  if (!reachable) {
    console.error('\nCannot reach checkpoint API. Start it first:');
    console.error('  cd checkpoint-api && DATABASE_URL=sqlite:///./demo.db JWT_SECRET=<a-real-secret> \\');
    console.error('    python3 -m uvicorn checkpoint_api.main:app --port 8000');
    console.error('\n(JWT_SECRET must not be the literal string "dev-secret" -- the server rejects that exact value as an insecure default.)');
    process.exit(1);
  }

  section('0. Authenticating as demo user (real register/login, same as the frontend)');
  await ensureDemoUser();
  console.log(`Logged in as ${DEMO_EMAIL}`);

  const runLabel = args.fixtures ? 'Fixture-mode demo' : `Live run ${new Date().toISOString()}`;
  const assessmentId = await createDemoAssessment(runLabel);
  console.log(`Created assessment ${assessmentId} ("${runLabel}") -- this is a real row, visible on the dashboard.`);

  if (args.fixtures) {
    await runFixtureMode(assessmentId);
  } else {
    await runLiveMode(args, assessmentId);
  }
}

main().catch((e) => {
  console.error('\nFAILED:', e.message);
  process.exit(1);
});
