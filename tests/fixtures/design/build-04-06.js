'use strict';
// Builds tests/fixtures/design/04-06.json: the sample rows of the three designs (.meta/design/04-06) as the pipeline's own
// records, so the app can show what the designs show. Run: node tests/fixtures/design/build-04-06.js
//
// Where a design value has no pipeline equivalent the nearest one is used (listed in `differences`):
//  - attack feasibility has four levels in the designs and five in the pipeline; it is calculated from the factors by the engine
//  - the risk matrix (1 to 5) is the pipeline's impact value times feasibility value (0 to 15)
//  - "who is affected" is free text in the designs and one of five parties in the pipeline
//  - the designs' attack paths have three or four steps; the pipeline has five
//  - the treatments are the pipeline's four options; the designs show two
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const WEB = path.join(ROOT, 'tara-workspace', 'web-based-tara');
const { calculateCVSSAFR } = require(path.join(WEB, '_engines', 'cvss-afr-calc'));
const { computeRiskScore } = require(path.join(WEB, '_engines', 'risk-score'));
const treatment = require(path.join(WEB, 'stages', '09-risk-treatment', 'agent.js'));
const { stateOf } = require(path.join(WEB, 'stages', '10-residual-risk', 'agent.js'));

function design(file) {
  const html = fs.readFileSync(path.join(ROOT, '.meta', 'design', '04-06', file), 'utf8');
  const script = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(`class DCLogic { constructor(props) { this.props = props || {}; } setState() {} }\n${script}\nthis.Component = Component;`, sandbox);
  return new sandbox.Component({});
}
const I = design('Impact.dc.html');
const T = design('Threat.dc.html');
const R = design('Tara.dc.html');

const PROP = { C: 'confidentiality', I: 'integrity', A: 'availability', Au: 'authenticity', Az: 'authorization', NR: 'non_repudiation' };
const STRIDE = { Spoofing: 'spoofing', Tampering: 'tampering', Repudiation: 'repudiation', 'Information disclosure': 'information_disclosure', 'Denial of service': 'denial_of_service', 'Elevation of privilege': 'elevation_of_privilege' };
const LEVELS = ['Negligible', 'Moderate', 'Major', 'Severe'];
const CODE = { AV: { Network: 'N', Adjacent: 'A', Local: 'L', Physical: 'P' }, AC: { Low: 'L', High: 'H' }, PR: { None: 'N', Low: 'L', High: 'H' }, UI: { None: 'N', Required: 'R' } };
const FIELD = { AV: 'attack_vector', AC: 'attack_complexity', PR: 'privileges_required', UI: 'user_interaction' };
const TS = '2026-10-30T09:00:00.000Z';
const n2 = (n) => String(n).padStart(2, '0');
const num = (code) => Number(code.split('-')[1]);

// ── assets (as the register Stage 03 writes for Stages 04 to 10)
const assetNames = { ...I.ASSETNAME, ...T.ASSETNAME, ...R.ASSETNAME };
const assetRefs = Object.keys(assetNames);
const assetId = (ref) => `AS_${n2(assetRefs.indexOf(ref) + 1)}`;
const usedProps = {};
for (const r of I.ROWS) (usedProps[r.asset] = usedProps[r.asset] || new Set()).add(PROP[r.prop]);
const assets = assetRefs.map((ref) => {
  const flags = Object.fromEntries(Object.values(PROP).map((p) => [p, Boolean(usedProps[ref] && usedProps[ref].has(p))]));
  return { asset_id: assetId(ref), asset_title: assetNames[ref], asset_type: 'api_endpoint', asset_description: assetNames[ref], ciaaan: flags, input_mode: 'manual', created_timestamp: TS, asset_ref: ref, source_element_id: 'EL-001' };
});

// ── the pipeline's records for one set of design rows
const stakeholder = (who) => (/^operators|security admins|requesters/i.test(who) ? 'tool_user' : /auditors/i.test(who) ? 'regulator' : 'organization');
const damage = (row) => ({ damage_id: `DS_${n2(num(row.dmg))}`, asset_id: assetId(row.asset), asset_title: assetNames[row.asset], property: PROP[row.prop], damage_scenario: row.scen, stakeholder_affected: stakeholder(row.who), created_timestamp: TS });
const sentenceParts = (text) => text.replace(/\.$/, '').split(/,\s*(?:and\s+)?/).filter((x) => x.trim().length > 2).map((x) => x.trim()[0].toUpperCase() + x.trim().slice(1) + '.');
const FACTOR_WHY = Object.fromEntries(T.FACTORS.map((f) => [f.k, f.why]));

function chain(threatRows, damageRows) {
  const impactOf = Object.fromEntries(I.ROWS.map((r) => [r.dmg, r]));
  const ds = damageRows.map(damage);
  const threats = [];
  const attacks = [];
  const impacts = [];
  threatRows.forEach((t, i) => {
    const d = impactOf[t.dmg];
    const k = n2(num(t.thr));
    threats.push({ threat_id: `TH_${k}`, damage_scenario_id: `DS_${n2(num(t.dmg))}`, asset_id: assetId(t.asset), asset_title: assetNames[t.asset], property: PROP[t.prop], stride_category: STRIDE[t.stride], threat_statement: t.scen, derivation_note: `${PROP[t.prop].replace('_', '-')} maps to ${t.stride.toLowerCase()} under the STRIDE taxonomy.`, owasp_reference: null, created_timestamp: TS });
    const metrics = Object.fromEntries(Object.keys(FIELD).map((a) => [FIELD[a], CODE[a][t.f[a]]]));
    const afr = calculateCVSSAFR(metrics);
    const steps = sentenceParts(t.path);
    const filler = ['The control that should stop this is missing or too weak on this asset.', 'The weakness is used until the effect described above follows.', 'The damage described for the scenario then occurs.'];
    while (steps.length < 5) steps.push(filler[steps.length - 2] || filler[0]);
    attacks.push({
      attack_id: `AT_${k}`, threat_id: `TH_${k}`, damage_scenario_id: `DS_${n2(num(t.dmg))}`, asset_id: assetId(t.asset), attack_description: t.path,
      attack_path: { step_1_initial_precondition: steps[0], step_2_abuse_technique: steps[1], step_3_exploit_effect: steps[2], step_4_control_gap: steps[3], step_5_threat_realization: steps.slice(4).join(' ') },
      cvss_metrics: metrics, afr_value: afr.afr_value, afr_label: afr.afr_label,
      justifications: Object.fromEntries(Object.keys(FIELD).map((a) => [FIELD[a], FACTOR_WHY[a][t.f[a]]])), created_timestamp: TS,
    });
    const lv = (key) => LEVELS[d.r[key] - 1];
    const why = (c) => I.WHY[c][d.r[c] - 1];
    impacts.push({
      impact_id: `IM_${k}`, threat_id: `TH_${k}`, damage_scenario_id: `DS_${n2(num(t.dmg))}`, asset_id: assetId(t.asset), property: PROP[t.prop],
      impact_narrative: `${assetNames[t.asset]} is affected through ${t.stride.toLowerCase()}: ${d.scen}`,
      tool_user: { safety: 'Negligible', privacy: lv('P'), financial: 'Negligible', operational: lv('O'), rationale_safety: I.CATS[0].rule, rationale_privacy: why('P'), rationale_financial: I.CATS[1].rule, rationale_operational: why('O') },
      other_stakeholders: { legal: lv('L'), financial: lv('F2'), business: lv('B'), rationale_legal: why('L'), rationale_financial: why('F2'), rationale_business: why('B') },
      created_timestamp: TS,
    });
  });
  return { ds, threats, attacks, impacts };
}

// 04 shows every damage scenario of the design. Four of them have no threat in 05, so the pipeline would leave them unrated: they get one.
const threatDmg = new Set(T.ROWS.map((t) => t.dmg));
const extraThreats = I.ROWS.filter((r) => !threatDmg.has(r.dmg)).map((r, i) => ({
  thr: `THR-${15 + i}`, dmg: r.dmg, asset: r.asset, prop: r.prop, stride: ({ C: 'Information disclosure', I: 'Tampering', A: 'Denial of service', Au: 'Spoofing', Az: 'Elevation of privilege', NR: 'Repudiation' })[r.prop],
  scen: `The weakness behind ${r.dmg} is used against ${assetNames[r.asset]}.`, ap: `AP-${15 + i}`, path: 'Reach the component, use the weakness, and the effect follows.', f: { AV: 'Network', AC: 'Low', PR: 'Low', UI: 'None' },
}));
const a04 = chain([...T.ROWS, ...extraThreats], I.ROWS);
const dmgOfThreats = I.ROWS.filter((r) => threatDmg.has(r.dmg));
const a05 = chain(T.ROWS, dmgOfThreats);

// ── folders 08 to 10 for the 14 threats of 06, as the pipeline's own programs write them
const catalogue = treatment.parseControlsCatalogue(fs.readFileSync(path.join(WEB, '_config', 'controls-catalogue.md'), 'utf8'));
const CONTROLS = { spoofing: ['CTR_01', 'CTR_11'], tampering: ['CTR_34', 'CTR_58'], repudiation: ['CTR_57', 'CTR_59'], information_disclosure: ['CTR_50', 'CTR_54'], denial_of_service: ['CTR_32', 'CTR_33'], elevation_of_privilege: ['CTR_16', 'CTR_22'] };
function scoring(c, rows) {
  const risks = c.impacts.map((im) => {
    const at = c.attacks.find((a) => a.threat_id === im.threat_id);
    return { threat_id: im.threat_id, damage_scenario_id: im.damage_scenario_id, attack_id: at.attack_id, impact_id: im.impact_id, asset_id: im.asset_id, ...computeRiskScore(im, at) };
  }).sort((a, b) => b.risk_score - a.risk_score || b.afr_value - a.afr_value).map((r, i) => ({ risk_id: `RSK_${n2(i + 1)}`, ...r, risk_rank: i + 1, created_timestamp: TS }));
  const goalOf = Object.fromEntries(R.ROWS.filter((r) => r.goal).map((r) => [`TH_${n2(num(r.thr))}`, r.goal.replace(/^(CG-\d+)\s+/, '')]));
  const goalId = Object.fromEntries(R.ROWS.filter((r) => r.goal).map((r) => [`TH_${n2(num(r.thr))}`, r.goal.match(/^CG-(\d+)/)[1]]));
  let claims = 0;
  const treatments = risks.map((risk, i) => {
    const th = c.threats.find((t) => t.threat_id === risk.threat_id);
    const accept = risk.risk_level === 'informational' || risk.risk_level === 'low';
    const ids = CONTROLS[th.stride_category];
    const controls = accept ? [] : treatment.hydrateControls(ids, ids.map((x) => `${catalogue.get(x).title} closes the path this threat uses.`), catalogue, `TRT_${n2(i + 1)}`);
    claims += accept ? 1 : 0;
    const why = rows.acceptWhy[th.threat_id] || 'The attack path is closed by what is already in place.';
    return {
      treatment_id: `TRT_${n2(i + 1)}`, risk_id: risk.risk_id, threat_id: risk.threat_id, damage_scenario_id: risk.damage_scenario_id, attack_id: risk.attack_id, impact_id: risk.impact_id, asset_id: risk.asset_id,
      treatment_option: accept ? 'accept' : 'reduce',
      treatment_rationale: accept ? why : `${risk.risk_id} is ${risk.risk_level} with score ${risk.risk_score}, so it is reduced with a cybersecurity goal.`,
      cybersecurity_goal: accept ? null : { goal_id: `CG_${n2(Number(goalId[risk.threat_id] || 90 + i))}`, goal_statement: goalOf[risk.threat_id] || `The ${th.asset_title} reaches a state in which this threat no longer succeeds.`, cal: 3, cal_rationale: `CAL 3 derived from ${risk.risk_level} risk level for ${risk.risk_id}.`, self_test_note: 'Checked against the asset it protects.' },
      cybersecurity_claim: accept ? { claim_id: `CC_${n2(claims)}`, claim_statement: `The risk is accepted: attack feasibility is ${risk.afr_label} (AFR=${risk.afr_value}), impact is ${risk.impact_rating_label} (score=${risk.impact_rating_value}), the risk score is ${risk.risk_score} and the risk level is ${risk.risk_level}, within the project acceptance threshold of low or below.`, acceptance_basis: why } : null,
      controls_assigned: controls.map((x) => ({ control_id: x.control_id, control_title: x.control_title, control_type: x.control_type, assignment_rationale: x.assignment_rationale })),
      avoidance_action: null, cal: accept ? 1 : 3, residual_risk_expected: accept ? risk.risk_level : 'low', created_timestamp: TS,
    };
  });
  const residual = risks.map((risk, i) => {
    const at = c.attacks.find((a) => a.attack_id === risk.attack_id);
    const im = c.impacts.find((x) => x.impact_id === risk.impact_id);
    const tr = treatments[i];
    const state = stateOf({ metrics: { ...at.cvss_metrics }, impact: im, attackId: at.attack_id });
    return { residual_id: `RES_${n2(i + 1)}`, threat_id: risk.threat_id, risk_id: risk.risk_id, attack_id: risk.attack_id, asset_id: risk.asset_id, treatment_option: tr.treatment_option, controls: tr.controls_assigned.map((x) => ({ control_id: x.control_id, control_title: x.control_title, control_type: x.control_type })), pre: state, post: state, metric_changes: [], created_timestamp: TS };
  });
  return { risks, treatments, residual };
}
const acceptWhy = Object.fromEntries(Object.entries(R.ACCEPTWHY).map(([k, v]) => [`TH_${n2(num(k))}`, v]));
const a06 = { ...a05, ...scoring(a05, { acceptWhy }) };

// ── what the designs show beside the rows: Assumptions and the comment threads
const asmField = { O: 'tool_user.operational', P: 'tool_user.privacy', L: 'other_stakeholders.legal', F2: 'other_stakeholders.financial', B: 'other_stakeholders.business', AV: 'attack_vector', AC: 'attack_complexity', PR: 'privileges_required', UI: 'user_interaction', TR: 'treatment_option', AF: null };
const asm = (list, id) => list.map((x) => ({ about_id: id(x.about), field: asmField[x.cat] ?? null, text: x.text, needs_attention: true }));
const assumptions = {
  '04': asm(I.ASSUMPTIONS, (c) => `DS_${n2(num(c))}`),
  '05': asm(T.ASSUMPTIONS, (c) => `TH_${n2(num(c))}`),
  '06': asm(R.ASSUMPTIONS, (c) => `TH_${n2(num(c))}`),
};
const confirmed = { '04': ['AS-04-03'], '05': ['AS-05-03'], '06': ['AS-06-03'] };
const threadField = { O: 'tool_user.operational', P: 'tool_user.privacy', L: 'other_stakeholders.legal', B: 'other_stakeholders.business', AV: 'attack_vector', AC: 'attack_complexity', PR: 'privileges_required', UI: 'user_interaction', ST: 'stride_category', TR: 'treatment_option' };
const threadsOf = (d, rec) => Object.entries(d.state.threads).map(([key, messages]) => {
  const [id, k] = key.split('.');
  return { record_id: rec(id), field: k === 'row' ? null : threadField[k], messages: messages.filter((m) => m.who === 'You').map((m) => m.text) };
});
const proposals = {
  '04': { record_id: 'DS_03', field: 'other_stakeholders.legal', you: 'Legal feels high here. An over-approved certificate breaks our own approval policy, not a customer contract.', reply: 'Agreed. Nothing in the documents ties role approval to a customer contract; it is an internal policy breach, which is Moderate.', value: 'Moderate' },
  '05': { record_id: 'TH_05', field: 'attack_complexity', you: 'The log reader role has this access by default in the current setup, so it is not a special condition.', reply: 'Agreed. If the role is broad by default, nothing outside the attacker’s control has to line up, so complexity is Low.', value: 'L' },
  '06': { record_id: 'TH_05', field: 'treatment_option', you: 'The log reader role is being removed in the next release, and the records are already encrypted at rest. Can we accept this one?', reply: 'Yes, if the removal is tracked. With the role gone the attack path closes; I suggest Accept and noting the release as the reason.', value: 'accept' },
};

const out = {
  assets,
  a04: { damage: a04.ds, threats: a04.threats, attacks: a04.attacks, impacts: a04.impacts },
  a05: { damage: a05.ds, threats: a05.threats, attacks: a05.attacks, impacts: a05.impacts },
  a06: { damage: a06.ds, threats: a06.threats, attacks: a06.attacks, impacts: a06.impacts, risks: a06.risks, treatments: a06.treatments, residual: a06.residual },
  assumptions, confirmed, proposals,
  threads: { '04': threadsOf(I, (c) => `DS_${n2(num(c))}`), '05': threadsOf(T, (c) => `TH_${n2(num(c))}`), '06': threadsOf(R, (c) => `TH_${n2(num(c))}`) },
  differences: [
    'Attack feasibility: the designs draw four levels from fixed CVSS thresholds; the pipeline has five, calculated from the factors by the engine (very low to very high).',
    'Risk score: the designs read 1 to 5 off a matrix; the pipeline multiplies the impact value (0 to 3) by the feasibility value (1 to 5), 0 to 15, with five levels (informational to critical).',
    'Who is affected: free text in the designs, one of five parties in the pipeline.',
    'Attack path: three or four steps in the designs, five in the pipeline; the sentences after the third are written for the fixture.',
    'Treatment: the designs offer Reduce and Accept; the pipeline has Reduce, Accept, Share and Avoid, and only informational and low risks can be accepted.',
    '04 shows 17 damage scenarios; four have no threat in the design, so the fixture gives each one a threat to make it rated.',
  ],
};
fs.writeFileSync(path.join(__dirname, '04-06.json'), `${JSON.stringify(out, null, 1)}\n`);
console.log('wrote 04-06.json', { assets: assets.length, a04: a04.ds.length, a05: a05.threats.length, risks: a06.risks.length, levels: [...new Set(a06.risks.map((r) => r.risk_level))] });
