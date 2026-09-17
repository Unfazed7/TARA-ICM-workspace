'use strict';

const fs = require('fs');
const path = require('path');
const { callLLM } = require('../../web-based-tara/stages/llm-client');

const MODEL = 'claude-opus-4-8';
const EXTRACT_TOOL = 'submit_extracted_elements';
const RECONCILE_TOOL = 'submit_merged_model';
const BOUNDARY_TOOL = 'submit_boundary_decisions';

const ALL_SOURCE_TYPES = [
  'architecture_diagram',
  'network_topology',
  'feature_function_list',
  'free_text_description',
];
const ELEMENT_TYPES = ['component', 'function', 'feature_group', 'network_segment', 'node'];
const CONFIDENCE_LEVELS = ['high', 'medium', 'low'];
const BOUNDARY_STATUSES = ['in_scope', 'out_of_scope', 'interface', 'ambiguous'];
const ESCALATION_REASONS = [
  'low_extraction_confidence',
  'unresolved_conflict',
  'derived_element',
  'boundary_genuinely_unclear',
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function formatComponentId(index) {
  return `COMP-${String(index + 1).padStart(3, '0')}`;
}

function extractToolUse(response, toolName) {
  const content = response?.content || [];
  const toolUse = content.find((item) => item.type === 'tool_use' && item.name === toolName);
  return toolUse ? toolUse.input : null;
}

// ── Call 1A — per-source extraction ─────────────────────────────────────────

function buildExtractTool() {
  return {
    name: EXTRACT_TOOL,
    description: 'Submit candidate system elements and links found in this source',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['elements', 'links'],
      properties: {
        elements: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'type', 'confidence'],
            properties: {
              name: { type: 'string', minLength: 1 },
              type: { type: 'string', enum: ELEMENT_TYPES },
              component_type: { type: 'string' },
              domain: { type: 'string' },
              confidence: { type: 'string', enum: CONFIDENCE_LEVELS },
              notes: { type: 'string' },
            },
          },
        },
        links: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['from', 'to', 'confidence'],
            properties: {
              from: { type: 'string', minLength: 1 },
              to: { type: 'string', minLength: 1 },
              protocol: { type: 'string' },
              direction: { type: 'string', enum: ['unidirectional', 'bidirectional'] },
              confidence: { type: 'string', enum: CONFIDENCE_LEVELS },
              notes: { type: 'string' },
            },
          },
        },
      },
    },
  };
}

function buildExtractSystemPrompt() {
  return [
    'You are extracting candidate system elements and links for an ISO/SAE 21434 §15.3 item definition.',
    'An element is a component (service, ECU, database, gateway), function, feature group, network segment, or node.',
    'A link is a data or control connection between two elements, referenced by name (not an id — ids are assigned later).',
    'Extract only what this source actually shows or states. Do not invent elements to fill out a "typical" architecture.',
    'confidence: "high" if explicitly labeled/drawn, "medium" if reasonably implied, "low" if you are guessing from partial information.',
  ].join('\n\n');
}

async function extractFromSource(input, fetchImpl) {
  const isImage = /\.(png|jpg|jpeg)$/i.test(input.filePath);
  const messageContent = [];

  if (isImage) {
    const base64 = fs.readFileSync(input.filePath).toString('base64');
    const mediaType = input.filePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    messageContent.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } });
    messageContent.push({ type: 'text', text: `Source type: ${input.sourceType}. Extract all elements and links visible in this diagram.` });
  } else {
    const text = fs.readFileSync(input.filePath, 'utf8');
    messageContent.push({ type: 'text', text: `Source type: ${input.sourceType}.\n\n${text}\n\nExtract all elements and links described above.` });
  }

  const response = await callLLM({
    model: MODEL,
    max_tokens: 4096,
    system: buildExtractSystemPrompt(),
    messages: [{ role: 'user', content: messageContent }],
    tools: [buildExtractTool()],
    tool_choice: { type: 'tool', name: EXTRACT_TOOL },
  }, fetchImpl);

  const result = extractToolUse(response, EXTRACT_TOOL);
  if (!result) {
    throw new Error(`Claude returned free text instead of ${EXTRACT_TOOL} tool_use for ${input.filePath}`);
  }
  return {
    sourceType: input.sourceType,
    elements: result.elements || [],
    links: result.links || [],
  };
}

// ── Call 1A2 — reconciliation across sources ────────────────────────────────

function buildReconcileTool() {
  return {
    name: RECONCILE_TOOL,
    description: 'Submit the reconciled merged model: deduplicated elements with assigned names, and links by element name',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['item_name', 'elements', 'links', 'conflicts'],
      properties: {
        item_name: { type: 'string', minLength: 1 },
        elements: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'type', 'origin', 'confidence', 'source_refs'],
            properties: {
              name: { type: 'string', minLength: 1 },
              type: { type: 'string', enum: ELEMENT_TYPES },
              component_type: { type: 'string' },
              domain: { type: 'string' },
              origin: { type: 'string', enum: ['stated', 'derived'] },
              confidence: { type: 'string', enum: CONFIDENCE_LEVELS },
              source_refs: { type: 'array', items: { type: 'string' } },
              notes: { type: 'string' },
            },
          },
        },
        links: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['from_name', 'to_name', 'confidence'],
            properties: {
              from_name: { type: 'string', minLength: 1 },
              to_name: { type: 'string', minLength: 1 },
              protocol: { type: 'string' },
              direction: { type: 'string', enum: ['unidirectional', 'bidirectional'] },
              confidence: { type: 'string', enum: CONFIDENCE_LEVELS },
              notes: { type: 'string' },
            },
          },
        },
        conflicts: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['description', 'affected_element_names'],
            properties: {
              description: { type: 'string', minLength: 1 },
              affected_element_names: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  };
}

function buildReconcileSystemPrompt() {
  return [
    'You are reconciling element extractions from multiple sources into one merged model.',
    'Merge elements that clearly refer to the same real-world thing, even if named slightly differently across sources.',
    'origin: "stated" if directly named/shown in at least one source; "derived" if you inferred its existence from context (e.g. an implied gateway).',
    'source_refs: list every source_type that mentioned this element.',
    'When two sources disagree about an element (e.g. different protocol on the same link, or one source omits an element the other includes prominently), record it in conflicts — do not silently pick one.',
    'Propose a short item_name summarizing what this system is, for later use as the item definition title.',
  ].join('\n\n');
}

async function reconcile(sourceExtractions, fetchImpl) {
  const messageText = [
    'Per-source extractions:',
    JSON.stringify(sourceExtractions, null, 2),
    '',
    'Reconcile these into one merged model.',
  ].join('\n');

  const response = await callLLM({
    model: MODEL,
    max_tokens: 4096,
    system: buildReconcileSystemPrompt(),
    messages: [{ role: 'user', content: messageText }],
    tools: [buildReconcileTool()],
    tool_choice: { type: 'tool', name: RECONCILE_TOOL },
  }, fetchImpl);

  const result = extractToolUse(response, RECONCILE_TOOL);
  if (!result) {
    throw new Error(`Claude returned free text instead of ${RECONCILE_TOOL} tool_use during reconciliation`);
  }
  return result;
}

function assignElementIds(reconciled) {
  const nameToId = new Map();
  const elements = reconciled.elements.map((element, index) => {
    const elementId = formatComponentId(index);
    nameToId.set(element.name, elementId);
    return { element_id: elementId, ...element };
  });

  const links = reconciled.links.map((link, index) => {
    const from = nameToId.get(link.from_name);
    const to = nameToId.get(link.to_name);
    if (!from || !to) {
      throw new Error(`Link references unknown element name: ${link.from_name} -> ${link.to_name}`);
    }
    const { from_name, to_name, ...rest } = link;
    return { link_id: `LNK-${String(index + 1).padStart(3, '0')}`, from, to, ...rest };
  });

  const conflicts = (reconciled.conflicts || []).map((conflict, index) => ({
    conflict_id: `CFT-${String(index + 1).padStart(3, '0')}`,
    description: conflict.description,
    affected_element_ids: conflict.affected_element_names.map((name) => nameToId.get(name)).filter(Boolean),
    resolution_status: 'open',
  }));

  return { elements, links, conflicts };
}

// ── Call 1B — boundary reasoning ────────────────────────────────────────────

function buildBoundaryTool() {
  return {
    name: BOUNDARY_TOOL,
    description: 'Submit an in/out/interface/ambiguous decision for every element in the merged model',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['decisions'],
      properties: {
        decisions: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['element_id', 'status', 'rationale'],
            properties: {
              element_id: { type: 'string' },
              status: { type: 'string', enum: BOUNDARY_STATUSES },
              rationale: { type: 'string', minLength: 5 },
              escalation_reason: { type: 'string', enum: ESCALATION_REASONS },
            },
          },
        },
      },
    },
  };
}

function buildBoundarySystemPrompt() {
  return [
    'You are classifying each element of a merged system model against an analyst-written item boundary statement (ISO/SAE 21434 §15.3).',
    'in_scope: clearly part of the item as described by the boundary statement.',
    'out_of_scope: clearly outside the item (e.g. an interfacing external system).',
    'interface: sits exactly at the boundary — the item connects to it but does not control it.',
    'ambiguous: the boundary statement does not clearly place this element. You MUST use this rather than guessing, and MUST include escalation_reason.',
    'escalation_reason: "low_extraction_confidence" (element itself is uncertain), "unresolved_conflict" (sources disagreed about it), "derived_element" (it was inferred, not stated), "boundary_genuinely_unclear" (statement just does not say).',
    'Every decision needs a concrete rationale referencing the boundary statement or the element source — never a generic restatement of the status.',
  ].join('\n\n');
}

async function classifyBoundary(elements, boundaryStatement, fetchImpl) {
  const messageText = [
    `Boundary statement: ${boundaryStatement}`,
    '',
    'Elements to classify:',
    JSON.stringify(elements.map((element) => ({
      element_id: element.element_id,
      name: element.name,
      type: element.type,
      domain: element.domain,
      origin: element.origin,
      confidence: element.confidence,
    })), null, 2),
  ].join('\n');

  const response = await callLLM({
    model: MODEL,
    max_tokens: 4096,
    system: buildBoundarySystemPrompt(),
    messages: [{ role: 'user', content: messageText }],
    tools: [buildBoundaryTool()],
    tool_choice: { type: 'tool', name: BOUNDARY_TOOL },
  }, fetchImpl);

  const result = extractToolUse(response, BOUNDARY_TOOL);
  if (!result) {
    throw new Error(`Claude returned free text instead of ${BOUNDARY_TOOL} tool_use during boundary classification`);
  }
  return result.decisions;
}

function validateDecisions(decisions, elements) {
  const elementIds = new Set(elements.map((element) => element.element_id));
  if (decisions.length === 0) throw new Error('No boundary decisions returned');
  for (const decision of decisions) {
    if (!elementIds.has(decision.element_id)) {
      throw new Error(`Decision references unknown element_id: ${decision.element_id}`);
    }
    if (decision.status === 'ambiguous' && !decision.escalation_reason) {
      throw new Error(`Ambiguous decision for ${decision.element_id} is missing escalation_reason`);
    }
    if (!decision.rationale || decision.rationale.length < 5) {
      throw new Error(`Decision for ${decision.element_id} has no rationale`);
    }
  }
}

function computeCoverage(inputs) {
  const provided = [...new Set(inputs.map((input) => input.sourceType))];
  const absent = ALL_SOURCE_TYPES.filter((type) => !provided.includes(type));
  const consequences = absent.map((absentSource) => ({
    absent_source: absentSource,
    impact: `Elements/links relying on ${absentSource} are derived from other sources only`,
    affected_count: 0,
    downstream_effect: `Confidence for anything only ${absentSource} would corroborate rests on the remaining sources alone.`,
  }));

  return {
    sources_provided: provided,
    sources_absent: absent,
    consequences,
    recommendation: absent.length
      ? `Supplying ${absent.join(', ')} would corroborate elements currently derived from ${provided.join(', ')} alone.`
      : 'All source types were supplied.',
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

async function runToCheckpoint1(inputs, boundaryStatement, outDir, options = {}) {
  if (!boundaryStatement) throw new Error('boundaryStatement is required');
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error('at least one input source is required');
  }

  const fetchImpl = options.fetchImpl;
  const sourceExtractions = [];
  for (const input of inputs) {
    if (!fs.existsSync(input.filePath)) {
      throw new Error(`Input file not readable: ${input.filePath}`);
    }
    sourceExtractions.push(await extractFromSource(input, fetchImpl));
  }

  const reconciled = await reconcile(sourceExtractions, fetchImpl);
  const { elements, links, conflicts } = assignElementIds(reconciled);

  const decisions = await classifyBoundary(elements, boundaryStatement, fetchImpl);
  validateDecisions(decisions, elements);

  const mergedModel = {
    model_id: `MM-${Date.now().toString(36).toUpperCase()}`,
    item_name: reconciled.item_name,
    sources_used: [...new Set(inputs.map((input) => input.sourceType))],
    elements,
    links,
  };

  const decisionsWithDefaults = decisions.map((decision) => ({
    element_id: decision.element_id,
    status: decision.status,
    rationale: decision.rationale,
    escalation_reason: decision.escalation_reason || null,
    decided_by: 'agent',
  }));

  const result = {
    mergedModel,
    proposal: { decisions: decisionsWithDefaults },
    conflicts: { model_ref: mergedModel.model_id, conflicts },
    coverage: computeCoverage(inputs),
  };

  writeJson(path.join(outDir, 'item-definition-proposal.json'), result);
  return result;
}

function resumeAfterCheckpoint1(outDir, itemName, finalDecisions = null) {
  const proposal = readJson(path.join(outDir, 'item-definition-proposal.json'));
  let decisions = finalDecisions;
  if (!decisions) {
    const finalPath = path.join(outDir, 'boundary-final.json');
    if (!fs.existsSync(finalPath)) {
      throw new Error('boundary not finalized: pass finalDecisions or write boundary-final.json');
    }
    decisions = readJson(finalPath).decisions;
  }

  const inScopeIds = new Set(
    decisions.filter((decision) => decision.status === 'in_scope' || decision.status === 'interface')
      .map((decision) => decision.element_id)
  );

  const itemDefinition = {
    item_name: itemName || proposal.mergedModel.item_name,
    boundary_statement: proposal.boundary_statement,
    elements: proposal.mergedModel.elements.filter((element) => inScopeIds.has(element.element_id)),
    links: proposal.mergedModel.links.filter((link) => inScopeIds.has(link.from) && inScopeIds.has(link.to)),
  };

  writeJson(path.join(outDir, 'item-definition.json'), itemDefinition);
  return itemDefinition;
}

module.exports = {
  runToCheckpoint1,
  resumeAfterCheckpoint1,
  assignElementIds,
  computeCoverage,
  validateDecisions,
  buildExtractTool,
  buildReconcileTool,
  buildBoundaryTool,
};
