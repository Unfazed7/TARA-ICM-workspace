'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key-unused-with-mocked-fetch';

const {
  runToCheckpoint1,
  resumeAfterCheckpoint1,
  assignElementIds,
  computeCoverage,
  validateDecisions,
} = require('../../tara-workspace/stages/01-item-definition/agent');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'item-def-test-'));
}

test('assignElementIds assigns sequential COMP ids and resolves link names', () => {
  const reconciled = {
    item_name: 'Test Item',
    elements: [
      { name: 'Cloud Backend', type: 'component', origin: 'stated', confidence: 'high', source_refs: ['architecture_diagram'] },
      { name: 'Gateway', type: 'component', origin: 'derived', confidence: 'medium', source_refs: ['architecture_diagram'] },
    ],
    links: [
      { from_name: 'Cloud Backend', to_name: 'Gateway', confidence: 'high', protocol: 'HTTPS' },
    ],
    conflicts: [
      { description: 'sources disagree on protocol', affected_element_names: ['Gateway'] },
    ],
  };

  const { elements, links, conflicts } = assignElementIds(reconciled);
  assert.equal(elements[0].element_id, 'COMP-001');
  assert.equal(elements[1].element_id, 'COMP-002');
  assert.equal(links[0].from, 'COMP-001');
  assert.equal(links[0].to, 'COMP-002');
  assert.equal(conflicts[0].affected_element_ids[0], 'COMP-002');
});

test('assignElementIds throws on link referencing unknown element name', () => {
  const reconciled = {
    item_name: 'Test Item',
    elements: [{ name: 'A', type: 'component', origin: 'stated', confidence: 'high', source_refs: [] }],
    links: [{ from_name: 'A', to_name: 'Ghost', confidence: 'high' }],
    conflicts: [],
  };
  assert.throws(() => assignElementIds(reconciled), /unknown element name/);
});

test('computeCoverage separates provided vs. absent source types', () => {
  const coverage = computeCoverage([{ filePath: 'x.png', sourceType: 'architecture_diagram' }]);
  assert.deepEqual(coverage.sources_provided, ['architecture_diagram']);
  assert.ok(coverage.sources_absent.includes('network_topology'));
  assert.equal(coverage.consequences.length, coverage.sources_absent.length);
});

test('validateDecisions rejects unknown element_id', () => {
  const elements = [{ element_id: 'COMP-001' }];
  const decisions = [{ element_id: 'COMP-999', status: 'in_scope', rationale: 'clearly named' }];
  assert.throws(() => validateDecisions(decisions, elements), /unknown element_id/);
});

test('validateDecisions requires escalation_reason for ambiguous status', () => {
  const elements = [{ element_id: 'COMP-001' }];
  const decisions = [{ element_id: 'COMP-001', status: 'ambiguous', rationale: 'not clear from statement' }];
  assert.throws(() => validateDecisions(decisions, elements), /escalation_reason/);
});

test('validateDecisions requires a real rationale', () => {
  const elements = [{ element_id: 'COMP-001' }];
  const decisions = [{ element_id: 'COMP-001', status: 'in_scope', rationale: 'ok' }];
  assert.throws(() => validateDecisions(decisions, elements), /rationale/);
});

test('runToCheckpoint1 end-to-end with mocked LLM calls, then resumeAfterCheckpoint1 filters scope', async () => {
  const outDir = tmpDir();
  const archPath = path.join(outDir, 'arch.txt');
  fs.writeFileSync(archPath, 'Telematics Cloud Backend connects to Body Control Module.');

  let call = 0;
  const fetchImpl = async () => {
    call += 1;
    if (call === 1) {
      return jsonResponse('submit_extracted_elements', {
        elements: [
          { name: 'Telematics Cloud Backend', type: 'component', confidence: 'high' },
          { name: 'Body Control Module', type: 'component', confidence: 'medium' },
        ],
        links: [{ from: 'Telematics Cloud Backend', to: 'Body Control Module', confidence: 'medium' }],
      });
    }
    if (call === 2) {
      return jsonResponse('submit_merged_model', {
        item_name: 'Telematics Cloud Backend',
        elements: [
          { name: 'Telematics Cloud Backend', type: 'component', origin: 'stated', confidence: 'high', source_refs: ['free_text_description'] },
          { name: 'Body Control Module', type: 'component', origin: 'stated', confidence: 'medium', source_refs: ['free_text_description'] },
        ],
        links: [{ from_name: 'Telematics Cloud Backend', to_name: 'Body Control Module', confidence: 'medium' }],
        conflicts: [],
      });
    }
    return jsonResponse('submit_boundary_decisions', {
      decisions: [
        { element_id: 'COMP-001', status: 'in_scope', rationale: 'named as the item in the boundary statement' },
        { element_id: 'COMP-002', status: 'out_of_scope', rationale: 'downstream vehicle ECU, not the cloud item' },
      ],
    });
  };

  const result = await runToCheckpoint1(
    [{ filePath: archPath, sourceType: 'free_text_description' }],
    'The item is the Telematics Cloud Backend.',
    outDir,
    { fetchImpl }
  );

  assert.equal(result.mergedModel.elements.length, 2);
  assert.equal(result.proposal.decisions.length, 2);
  assert.ok(fs.existsSync(path.join(outDir, 'item-definition-proposal.json')));

  fs.writeFileSync(path.join(outDir, 'boundary-final.json'), JSON.stringify({ decisions: result.proposal.decisions }));
  const itemDefinition = resumeAfterCheckpoint1(outDir, 'Telematics Cloud Backend');
  assert.equal(itemDefinition.elements.length, 1);
  assert.equal(itemDefinition.elements[0].element_id, 'COMP-001');
});

function jsonResponse(toolName, input) {
  return {
    ok: true,
    json: async () => ({
      content: [{ type: 'tool_use', name: toolName, input }],
    }),
  };
}
