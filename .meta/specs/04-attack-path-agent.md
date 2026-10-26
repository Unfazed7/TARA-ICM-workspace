# Spec 04 — Attack Path Modelling Agent (Stage 04)

**Module:** `tara-workspace/web-based-tara/stages/04-attack-path-modelling/agent.js`  
**Author:** Claude  
**Status:** Ready for implementation  
**Type:** AI — Extended Thinking ON  
**Clauses:** ISO/SAE 21434 §15.6, §15.8

---

## Goal

For each threat (TH_##), model the most feasible 5-step attack path and assign CVSS v3.1 exploitability metrics (AV, AC, PR, UI) with justifications. Extended thinking is used to reason through multi-step attack chains. After output is written, the orchestrator runs `cvss-afr-calc.js` to fill `afr_value` and `afr_label`.

---

## Success Criteria

```bash
node tara-workspace/web-based-tara/stages/04-attack-path-modelling/agent.js \
  --threats tests/fixtures/valid/stage-03-threats.json \
  --assessment-id ASS_01 \
  --out /tmp/test-attack-paths.json

# Schema valid with afr_value = null (pre-engine)
node scripts/validate-all.js /tmp/test-attack-paths.json src/schemas/stage-04-attack-paths.schema.json

# Run CVSS engine
node tara-workspace/web-based-tara/_engines/cvss-afr-calc.js \
  --input /tmp/test-attack-paths.json \
  --out /tmp/test-attack-paths.json

# Schema valid with afr_value filled
node -e "
  const paths = require('/tmp/test-attack-paths.json');
  paths.forEach(p => {
    console.assert(p.afr_value >= 1 && p.afr_value <= 5, p.attack_id + ': afr_value must be 1-5');
    console.assert(['very low','low','medium','high','very high'].includes(p.afr_label),
      p.attack_id + ': invalid afr_label');
  });
  console.log('AFR OK');
"
```

---

## File Ownership

**Codex WILL modify:**
- `tara-workspace/web-based-tara/stages/04-attack-path-modelling/agent.js`
- `tests/agents/attack-path-modelling.test.js` (create)

**Codex WILL NOT modify:**
- `stages/04-attack-path-modelling/CONTEXT.md`
- Any `_config/` file
- `_engines/cvss-afr-calc.js` (separate spec)

---

## Input

```
stages/03-threat-identification/output/threats.json
_config/stride-taxonomy.md          (Layer 3 context)
_config/owasp-stride-mapping.md     (Layer 3 context)
_config/cvss-afr-formula.md         (Layer 3 context)
```

---

## Output

`stages/04-attack-path-modelling/output/attack-paths.json` — see schema in spec 00.  
`afr_value` and `afr_label` are `null` at write time — engine fills them.

---

## Process

### Setup
1. Load threats.json
2. Load all 3 config files as context strings

### Per TH_## — Claude API Call with Extended Thinking

```javascript
const response = await anthropic.messages.create({
  model: 'claude-opus-4-8',
  max_tokens: 16000,
  thinking: {
    type: 'enabled',
    budget_tokens: 8000,
  },
  system: systemPrompt,  // stride-taxonomy.md + owasp-stride-mapping.md + cvss-afr-formula.md
  messages: [{ role: 'user', content: userMessage }],
  tools: [submitAttackPathTool],
  tool_choice: { type: 'tool', name: 'submit_attack_path' },
});
```

**User message includes:**
- TH_## threat statement, STRIDE category, derivation note
- DS_## damage scenario
- Asset title, type, property
- Instruction: "Model the most feasible 5-step attack path working backward from the damage scenario. Assign CVSS v3.1 metrics from the attack mechanism."

**Tool returns:**
```json
{
  "attack_description": "string",
  "attack_path": {
    "step_1_initial_precondition": "string",
    "step_2_abuse_technique": "string",
    "step_3_exploit_effect": "string",
    "step_4_control_gap": "string",
    "step_5_threat_realization": "string"
  },
  "cvss_metrics": {
    "attack_vector": "N|A|L|P",
    "attack_complexity": "L|H",
    "privileges_required": "N|L|H",
    "user_interaction": "N|R"
  },
  "justifications": {
    "attack_vector": "string",
    "attack_complexity": "string",
    "privileges_required": "string",
    "user_interaction": "string"
  }
}
```

### Post-processing
3. Assign `attack_id` = `AT_##` sequentially matching TH_## order
4. Set `afr_value = null`, `afr_label = null` (engine fills post-stage)
5. Validate all 5 attack path steps non-empty
6. Validate all 4 CVSS metric values against enums
7. Validate all 4 justifications non-empty
8. Write attack-paths.json

### Post-stage engine run (orchestrator responsibility)
After `agent.js` exits, orchestrator runs:
```javascript
const { calculateCVSSAFR } = require('./_engines/cvss-afr-calc.js');
paths.forEach(p => {
  const { afr_value, afr_label } = calculateCVSSAFR(p.cvss_metrics);
  p.afr_value = afr_value;
  p.afr_label = afr_label;
});
// overwrite attack-paths.json with afr_value filled
```

### Checkpoint submission (after engine run, not after agent.js)
```javascript
await submitCheckpoint(assessmentId, {
  stage_num: 4,
  stage_name: 'attack-path-modelling',
  output_summary: {
    total_attack_paths: paths.length,
    afr_distribution: countAfrDistribution(paths),
    high_feasibility_count: paths.filter(p => p.afr_value >= 4).length
  }
});
```

---

## Extended Thinking Note

Extended thinking is enabled specifically for this stage because attack path reasoning requires:
- Multi-step causal chain where intermediate steps are non-obvious
- Identifying realistic (not catastrophic) attack paths
- Ensuring Step 4 (control gap) reflects an actual absent control, not a hypothetical

Do not enable extended thinking for any other stage.

---

## Error Conditions

| Condition | Behavior |
|-----------|----------|
| Empty threats.json | Throw `Error('No threats to process')` |
| Claude returns free text instead of tool_use | Retry once; throw on second failure with TH_## |
| Any attack path step is empty string | Throw with AT_## and step number |
| `cvss_metrics` value not from allowed enum | Throw with AT_## and metric name |
| Any justification is empty | Throw with AT_## and metric name |
| Engine not yet implemented (throws) | Propagate error — do not swallow |

---

## Validation Rules (before write, pre-engine)

1. `attack_id` unique, pattern `^AT_\d{2,}$`
2. `threat_id` exists in threats.json
3. Exactly one `AT_##` per `TH_##`
4. All 5 attack path step fields non-empty
5. `cvss_metrics.attack_vector` ∈ {N, A, L, P}
6. `cvss_metrics.attack_complexity` ∈ {L, H}
7. `cvss_metrics.privileges_required` ∈ {N, L, H}
8. `cvss_metrics.user_interaction` ∈ {N, R}
9. All 4 justifications non-empty
10. `afr_value = null` at write time

---

## Verification Steps

```bash
npm test -- --testPathPattern=attack-path-modelling
# Must cover: golden path, invalid CVSS enum rejection,
# empty step rejection, afr_value null at write, afr_value filled after engine,
# extended thinking enabled (check API call config)
```
