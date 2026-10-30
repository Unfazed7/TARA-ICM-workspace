'use strict';

/**
 * What an agent assumed (specs 29 to 31). The model may add up to three plain sentences to its tool call, each naming the
 * field it affects. They are kept next to the agent's output as `assumptions.json`, never inside it: the output file and
 * its schema do not change, and an agent whose model returns none still writes an empty list.
 *
 * One agent runs per process, so the notes live in this module.
 */

const fs = require('fs');
const path = require('path');

const FIELDS = {
  impact: ['tool_user.operational', 'tool_user.privacy', 'other_stakeholders.legal', 'other_stakeholders.financial', 'other_stakeholders.business'],
  stride: ['stride_category'],
  factors: ['attack_vector', 'attack_complexity', 'privileges_required', 'user_interaction'],
  treatment: ['treatment_option', 'cybersecurity_goal'],
};

const REQUEST = 'If your answer rests on something the documents do not state, return it in "assumptions": one plain sentence each, no ids, at most three, naming the field it affects. Return none when you assumed nothing.';
const ID_IN_TEXT = /\b(DS|TH|AT|IM|RSK|TRT|CG|CC|CTR|RES|AS|EL|IF|FN|FCT|SD|ASM|Q|CNF|DOC|ZN|EXT|NET|INF|WL|IAM|API|COMM)[-_]\d{1,3}\b/;

const notes = [];

/** The optional `assumptions` property of a tool's input schema. `withProperty` adds the CIAAAN property for agents that answer for several. */
function property(fields, withProperty = false) {
  const properties = { text: { type: 'string', minLength: 1 } };
  if (fields.length) properties.field = { type: 'string', enum: fields };
  if (withProperty) properties.property = { type: 'string', enum: ['confidentiality', 'integrity', 'availability', 'authenticity', 'authorization', 'non_repudiation'] };
  return {
    type: 'array',
    maxItems: 3,
    items: { type: 'object', additionalProperties: false, required: withProperty ? ['text', 'property'] : ['text'], properties },
  };
}

function clean(raw, fields) {
  const text = String(raw && raw.text ? raw.text : '').replace(/\s+/g, ' ').trim();
  if (text.length < 8 || text.length > 400 || ID_IN_TEXT.test(text)) return null;
  return { field: fields.includes(raw.field) ? raw.field : null, text, property: raw.property || null };
}

/** Keeps what the model returned for one record. A retry for the same record replaces the earlier answer. */
function note(response, toolName, about, fields) {
  const use = ((response && response.content) || []).find((item) => item.type === 'tool_use' && item.name === toolName);
  const key = JSON.stringify(about);
  for (let i = notes.length - 1; i >= 0; i -= 1) if (notes[i].key === key) notes.splice(i, 1);
  const raw = use && use.input && Array.isArray(use.input.assumptions) ? use.input.assumptions : [];
  for (const item of raw.slice(0, 3)) {
    const cleaned = clean(item, fields);
    if (cleaned) notes.push({ key, about, ...cleaned });
  }
}

/** `resolve(about, item)` turns what the note was kept about into the record's own id (or null to drop it). */
function write(out, resolve = (about) => about) {
  const list = [];
  const seen = new Set();
  for (const n of notes) {
    const about = resolve(n.about, n);
    if (!about) continue;
    const id = `${about}|${n.field || ''}|${n.text}`;
    if (seen.has(id)) continue;
    seen.add(id);
    list.push({ about_id: about, field: n.field, text: n.text, needs_attention: true });
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(path.join(path.dirname(out), 'assumptions.json'), `${JSON.stringify(list, null, 2)}\n`);
  return list;
}

function reset() {
  notes.length = 0;
}

module.exports = { FIELDS, REQUEST, property, note, write, reset };
