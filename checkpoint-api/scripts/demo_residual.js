'use strict';
/**
 * Folder 10 for the demo TARA (D-73). The real Stage 10 asks a model how far each risk's controls make the attack harder. The demo
 * is built with no model, so this program applies one plain rule in its place and then does everything else the way Stage 10 does:
 * the same state function (CVSS number, feasibility, risk score and level), the same `applyProposal` checks, the same record shape
 * and the same schema. Run by scripts/build_demo_seed.py; the server never runs it.
 *
 * The rule: a risk that is treated (Reduce or Share), has controls and is rated high or critical gets one change from its first
 * preventive control (else its first control): attack complexity from low to high; if that is already high, the access the
 * attacker needs one step up. Every other risk keeps its values before controls.
 *
 *   node demo_residual.js <folders directory of the seed>
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const { applyProposal, stateOf, residualAssumptions } = require(path.join(ROOT, 'tara-workspace', 'web-based-tara', 'stages', '10-residual-risk', 'agent.js'));

const dir = path.resolve(process.argv[2] || '');
const folder = (n) => fs.readdirSync(dir).find((d) => d.startsWith(`${n}-`));
const read = (n, file) => JSON.parse(fs.readFileSync(path.join(dir, folder(n), file), 'utf8'));

const attacks = new Map(read('06', 'attack-paths.json').map((a) => [a.threat_id, a]));
const impacts = new Map(read('07', 'impact-analysis.json').map((i) => [i.threat_id, i]));
const treatments = new Map(read('09', 'risk-treatment.json').map((t) => [t.threat_id, t]));
const risks = read('08', 'risk-register.json');
const STEP_UP = { N: 'L', L: 'H' };

const residual = [];
for (const risk of risks) {
  const attack = attacks.get(risk.threat_id);
  const treatment = treatments.get(risk.threat_id);
  const impact = impacts.get(risk.threat_id);
  const pre = stateOf({ metrics: { ...attack.cvss_metrics }, impact, attackId: attack.attack_id });
  let post = pre;
  let changes = [];
  const treated = ['reduce', 'share'].includes(treatment.treatment_option) && treatment.controls_assigned.length > 0;
  if (treated && ['high', 'critical'].includes(pre.risk_level)) {
    const control = treatment.controls_assigned.find((c) => c.control_type === 'preventive') || treatment.controls_assigned[0];
    const m = attack.cvss_metrics;
    let proposal = null;
    const reason = `${control.control_title} makes this step harder for an attacker.`;
    if (m.attack_complexity === 'L') proposal = { attack_complexity: { value: 'H', control_id: control.control_id, reason } };
    else if (STEP_UP[m.privileges_required]) proposal = { privileges_required: { value: STEP_UP[m.privileges_required], control_id: control.control_id, reason } };
    if (proposal) {
      const applied = applyProposal({ attack, treatment, proposal });
      changes = applied.changes;
      post = stateOf({ metrics: applied.metrics, impact, attackId: attack.attack_id });
    }
  }
  residual.push({
    residual_id: `RES_${String(residual.length + 1).padStart(2, '0')}`,
    threat_id: risk.threat_id,
    risk_id: risk.risk_id,
    attack_id: attack.attack_id,
    asset_id: risk.asset_id,
    treatment_option: treatment.treatment_option,
    controls: (treatment.controls_assigned || []).map((c) => ({ control_id: c.control_id, control_title: c.control_title, control_type: c.control_type })),
    pre,
    post,
    metric_changes: changes,
    created_timestamp: new Date().toISOString(),
  });
}

const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
const check = ajv.compile(JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'schemas', 'stage-10-residual-risk.schema.json'), 'utf8')));
if (!check(residual)) {
  process.stderr.write(`The demo residual risk did not pass its schema: ${check.errors.slice(0, 3).map((e) => `${e.instancePath} ${e.message}`).join('; ')}\n`);
  process.exit(3);
}
const out = path.join(dir, folder('10'));
const write = (file, data) => fs.writeFileSync(path.join(out, file), `${JSON.stringify(data, null, 1)}\n`);
write('residual-risk.json', residual);
write('assumptions.json', residualAssumptions(residual));
write('rationale.json', []);
const changed = residual.filter((r) => r.metric_changes.length).length;
const levels = residual.reduce((a, r) => ({ ...a, [r.post.risk_level]: (a[r.post.risk_level] || 0) + 1 }), {});
process.stdout.write(`Demo residual risk: ${residual.length} risks, ${changed} changed by controls; after controls ${JSON.stringify(levels)}\n`);
