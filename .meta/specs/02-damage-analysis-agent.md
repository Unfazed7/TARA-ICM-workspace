# Spec 02 — Damage Analysis Agent (Stage 02)

**Module:** `tara-workspace/web-based-tara/stages/02-damage-analysis/agent.js`  
**Author:** Claude  
**Status:** Ready for implementation  
**Type:** AI (Claude standard)  
**Clause:** ISO/SAE 21434 §15.4

---

## Goal

For each asset × applicable CIAAAN property combination, derive one specific damage scenario (DS_##). Damage scenarios are the analytical foundation — all threats, attack paths, and impact ratings downstream are derived FROM these.

---

## Success Criteria

```bash
node tara-workspace/web-based-tara/stages/02-damage-analysis/agent.js \
  --assets tests/fixtures/valid/stage-01-asset-register.json \
  --assessment-id ASS_01 \
  --out /tmp/test-damage-scenarios.json

node scripts/validate-all.js /tmp/test-damage-scenarios.json src/schemas/stage-02-damage-scenarios.schema.json

# Verify cardinality: one DS_## per asset × true CIAAAN property
node -e "
  const assets = require('tests/fixtures/valid/stage-01-asset-register.json');
  const ds = require('/tmp/test-damage-scenarios.json');
  const props = ['confidentiality','integrity','availability','authenticity','authorization','non_repudiation'];
  let expected = 0;
  assets.forEach(a => props.forEach(p => { if (a.ciaaan[p]) expected++; }));
  console.assert(ds.length === expected, 'Expected ' + expected + ' DS_##, got ' + ds.length);
  console.log('Cardinality OK');
"
```

---

## File Ownership

**Codex WILL modify:**
- `tara-workspace/web-based-tara/stages/02-damage-analysis/agent.js`
- `tests/agents/damage-analysis.test.js` (create)

**Codex WILL NOT modify:**
- `stages/02-damage-analysis/CONTEXT.md`
- Any `_config/` file

---

## Input

```
stages/01-input-normalization/output/asset-register.json
_config/ciaaan-properties.md        (Layer 3 context)
_config/web-tara-constraints.md     (Layer 3 context)
```

---

## Output

`stages/02-damage-analysis/output/damage-scenarios.json` — see schema in spec 00.

---

## Process

### Setup
1. Load asset-register.json
2. Load `_config/ciaaan-properties.md` and `_config/web-tara-constraints.md` as context strings
3. Build work list: all (asset, property) pairs where `ciaaan[property] === true`

### Per asset — Claude API Call
Group all applicable properties for one asset into a single API call to reduce cost:

```javascript
const response = await anthropic.messages.create({
  model: 'claude-opus-4-8',
  max_tokens: 2048,
  system: systemPrompt,  // ciaaan-properties.md + web-tara-constraints.md
  messages: [{ role: 'user', content: userMessage }],
  tools: [submitDamageScenariosForAssetTool],
  tool_choice: { type: 'tool', name: 'submit_damage_scenarios_for_asset' },
});
```

**User message includes:**
- Asset title, type, description
- List of applicable CIAAAN properties for this asset
- Instruction: "For each property, derive one specific damage scenario using the mandatory format."

**Mandatory damage scenario format (from CONTEXT.md):**
`"If the [CIAAAN property] of [Asset Title] is compromised, [specific adverse consequence] affecting [specific stakeholder] in the context of [specific function]."`

**Tool returns:** Array of `{ property, damage_scenario, stakeholder_affected }` — one per applicable property.

### Post-processing
4. Assign `damage_id` = `DS_##` sequentially across all assets
5. Reject any scenario containing attacker language — throw with asset + property
6. Validate stakeholder values against enum
7. Write damage-scenarios.json
8. Submit checkpoint

---

## Checkpoint Submission

```javascript
await submitCheckpoint(assessmentId, {
  stage_num: 2,
  stage_name: 'damage-analysis',
  output_summary: {
    total_damage_scenarios: scenarios.length,
    by_property: countByProperty(scenarios),
    assets_covered: [...new Set(scenarios.map(s => s.asset_id))].length
  }
});
```

---

## Error Conditions

| Condition | Behavior |
|-----------|----------|
| No assets in input | Throw `Error('asset-register.json is empty')` |
| Asset with no true CIAAAN flags | Skip asset, log warning |
| Claude returns free text instead of tool_use | Retry once; throw on second failure |
| Damage scenario contains "attacker"/"hacker"/"malicious" | Throw with DS identifier |
| Wrong scenario count returned for asset | Throw — must match number of applicable properties |

---

## Validation Rules (before write)

1. `damage_id` unique, pattern `^DS_\d{2,}$`
2. `asset_id` exists in asset-register.json
3. `property` is `true` for this asset in asset-register.json
4. One `DS_##` per `asset_id` × `property` — no duplicates
5. `damage_scenario` non-empty, no attacker language
6. `stakeholder_affected` from enum: `tool_user|organization|vehicle_owner|regulator|oem`

---

## Verification Steps

```bash
npm test -- --testPathPattern=damage-analysis
# Must cover: golden path, attacker language rejection,
# cardinality check, duplicate property check
```
