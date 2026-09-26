# Spec 03 — Threat Identification Agent (Stage 03)

**Module:** `tara-workspace/web-based-tara/stages/03-threat-identification/agent.js`  
**Author:** Claude  
**Status:** Ready for implementation  
**Type:** AI (Claude standard)  
**Clause:** ISO/SAE 21434 §15.5

---

## Goal

For each damage scenario (DS_##), derive exactly one threat (TH_##) by working backward from the damage to find the specific attack action that would cause it. One DS_## → one TH_##, no exceptions.

---

## Success Criteria

```bash
node tara-workspace/web-based-tara/stages/03-threat-identification/agent.js \
  --damage-scenarios tests/fixtures/valid/stage-02-damage-scenarios.json \
  --assessment-id ASS_01 \
  --out /tmp/test-threats.json

node scripts/validate-all.js /tmp/test-threats.json src/schemas/stage-03-threats.schema.json

# Verify 1:1 mapping
node -e "
  const ds = require('tests/fixtures/valid/stage-02-damage-scenarios.json');
  const th = require('/tmp/test-threats.json');
  console.assert(ds.length === th.length, '1 TH_## per DS_## required');
  console.log('Cardinality OK');
"
```

---

## File Ownership

**Codex WILL modify:**
- `tara-workspace/web-based-tara/stages/03-threat-identification/agent.js`
- `tests/agents/threat-identification.test.js` (create)

**Codex WILL NOT modify:**
- `stages/03-threat-identification/CONTEXT.md`
- Any `_config/` file

---

## Input

```
stages/02-damage-analysis/output/damage-scenarios.json
_config/stride-taxonomy.md          (Layer 3 context)
_config/owasp-stride-mapping.md     (Layer 3 context)
```

---

## Output

`stages/03-threat-identification/output/threats.json` — see schema in spec 00.

---

## Process

### Setup
1. Load damage-scenarios.json
2. Load `_config/stride-taxonomy.md` and `_config/owasp-stride-mapping.md` as context strings

### Per DS_## — Claude API Call
One API call per damage scenario (DS_## are individually distinct — do not batch):

```javascript
const response = await anthropic.messages.create({
  model: 'claude-opus-4-8',
  max_tokens: 1024,
  system: systemPrompt,  // stride-taxonomy.md + owasp-stride-mapping.md
  messages: [{ role: 'user', content: userMessage }],
  tools: [submitThreatTool],
  tool_choice: { type: 'tool', name: 'submit_threat' },
});
```

**User message includes:**
- The DS_## damage scenario text
- Asset title, asset type, CIAAAN property
- Instruction: "Derive the specific attack action that would directly cause this damage scenario."

**Tool returns:**
```json
{
  "stride_category": "string",
  "threat_statement": "string",
  "derivation_note": "string",
  "owasp_reference": "string | null"
}
```

### Post-processing
3. Assign `threat_id` = `TH_##` sequentially matching DS_## order
4. Copy `asset_id`, `asset_title`, `property` from DS_##
5. Validate threat_statement names the specific asset (string contains `asset_title`)
6. Write threats.json
7. Submit checkpoint

---

## Checkpoint Submission

```javascript
await submitCheckpoint(assessmentId, {
  stage_num: 3,
  stage_name: 'threat-identification',
  output_summary: {
    total_threats: threats.length,
    by_stride: countByStride(threats),
    by_owasp: countByOwasp(threats)
  }
});
```

---

## Error Conditions

| Condition | Behavior |
|-----------|----------|
| Empty damage-scenarios.json | Throw `Error('No damage scenarios to process')` |
| Claude returns free text instead of tool_use | Retry once; throw on second failure with DS_## identifier |
| `stride_category` not from allowed enum | Throw with TH_## and received value |
| `threat_statement` does not contain asset_title | Throw — threat is too generic, fails self-test |
| `derivation_note` is empty | Throw with TH_## identifier |

---

## Validation Rules (before write)

1. `threat_id` unique, pattern `^TH_\d{2,}$`
2. `damage_scenario_id` exists in damage-scenarios.json
3. `asset_id` exists in asset-register.json (Stage 01)
4. Exactly one `TH_##` per `DS_##` — count must match
5. `stride_category` from enum: `spoofing|tampering|repudiation|information_disclosure|denial_of_service|elevation_of_privilege`
6. `threat_statement` contains `asset_title` (asset-specific self-test)
7. `derivation_note` non-empty

---

## Verification Steps

```bash
npm test -- --testPathPattern=threat-identification
# Must cover: golden path, generic threat rejection (fails asset name check),
# invalid stride_category, cardinality check, empty input
```
