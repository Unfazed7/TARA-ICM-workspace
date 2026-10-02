'use strict';

/**
 * Model reading of text documents and diagram images (spec 19).
 * One call per document, or per chunk for large documents. The model never chooses ids,
 * and every quote it returns is checked against the text it was given.
 */

const fs = require('fs');
const path = require('path');
const { callLLM, isRefusal } = require('../../llm-client');
const { quoteFound, normalise } = require('./quotes');

const PROMPTS = path.resolve(__dirname, '..', 'prompts');
const FACT_TYPES = [
  'component_exists', 'link_exists', 'attribute', 'function', 'actor', 'assumption_stated', 'control_stated',
  'absence_stated', 'data', 'environment', 'responsibility', 'legal_context', 'constraint', 'client_requirement',
];
const ENVIRONMENTS = ['prod', 'staging', 'dev', 'unknown'];

const nullableString = { type: ['string', 'null'] };

const DOCUMENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'date_on_document', 'environment', 'environment_quote', 'used_for', 'ignored_and_why'],
  properties: {
    title: { type: 'string' },
    date_on_document: nullableString,
    environment: { type: 'string', enum: ENVIRONMENTS },
    environment_quote: nullableString,
    used_for: { type: 'string' },
    ignored_and_why: { type: 'string' },
  },
};

const TEXT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['document', 'facts'],
  properties: {
    document: DOCUMENT_SCHEMA,
    facts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['subject', 'fact_type', 'value', 'location', 'quote', 'confidence'],
        properties: {
          subject: { type: 'string' },
          fact_type: { type: 'string', enum: FACT_TYPES },
          value: { type: 'string' },
          location: { type: 'string' },
          quote: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
  },
};

const IMAGE_INVENTORY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'labels'],
  properties: {
    title: nullableString,
    labels: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'region', 'is_actor'],
        properties: { label: { type: 'string' }, region: { type: 'string' }, is_actor: { type: 'boolean' } },
      },
    },
  },
};

const IMAGE_LINKS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['containment', 'arrows', 'environment', 'environment_quote'],
  properties: {
    containment: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['child', 'parent'], properties: { child: { type: 'string' }, parent: { type: 'string' } } },
    },
    arrows: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['from', 'to', 'label', 'clear'],
        properties: { from: { type: 'string' }, to: { type: 'string' }, label: nullableString, clear: { type: 'boolean' } },
      },
    },
    environment: { type: 'string', enum: ENVIRONMENTS },
    environment_quote: nullableString,
  },
};

function prompt(name) {
  return fs.readFileSync(path.join(PROMPTS, name), 'utf8');
}

class Refused extends Error {}

function responseJson(response) {
  if (isRefusal(response)) throw new Refused('the model declined to read this part');
  const text = (response.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('the model reply was not valid JSON');
  }
}

/** Splits located pieces into chunks of at most maxChars, repeating the last piece of a chunk at the start of the next. */
function chunkPieces(pieces, maxChars = Number(process.env.STAGE01_CHUNK_CHARS || 40000)) {
  const chunks = [];
  let current = [];
  let size = 0;
  for (const piece of pieces) {
    const length = piece.text.length + piece.location.length + 4;
    if (current.length && size + length > maxChars) {
      chunks.push(current);
      const overlap = current[current.length - 1];
      current = [overlap];
      size = overlap.text.length;
    }
    current.push(piece);
    size += length;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

function renderChunk(chunk) {
  return chunk.map((p) => `[${p.location}]\n${p.text}`).join('\n\n');
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Reads located text pieces. Returns {document, facts, dropped}. Facts carry one source
 * reference each. Throws Refused when the model declines, Error on other failures.
 */
async function readTextPieces({ doc, pieces, redactor, fetchImpl }) {
  const system = prompt('extract-text.md');
  const facts = [];
  const dropped = [];
  let document = null;
  const seen = new Set();
  const chunks = chunkPieces(pieces);
  for (const [index, chunk] of chunks.entries()) {
    const text = renderChunk(chunk);
    const header = `Document: ${redactor.hide(doc.client_doc_ref)} (type: ${doc.doc_type}${chunks.length > 1 ? `, part ${index + 1} of ${chunks.length}` : ''})\n\n`;
    const response = await callLLM({
      stage: '01-extract-text',
      system,
      messages: [{ role: 'user', content: header + redactor.hide(text) }],
      response_schema: { name: 'stage01_facts', schema: TEXT_SCHEMA },
    }, fetchImpl);
    const result = redactor.restoreDeep(responseJson(response));
    if (!document) document = result.document;
    for (const fact of result.facts || []) {
      if (!fact.quote || !quoteFound(fact.quote, text)) {
        dropped.push({ doc_id: doc.doc_id, reason: 'quote not found in the document', fact });
        continue;
      }
      const key = [fact.subject, fact.value, fact.quote].map(normalise).join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      facts.push({
        subject: fact.subject,
        fact_type: fact.fact_type,
        value: fact.value,
        confidence: fact.confidence,
        source: { doc_id: doc.doc_id, location: fact.location || chunk[0].location, quote: fact.quote.slice(0, 300) },
      });
    }
  }
  const all = renderChunk(pieces);
  const environmentQuote = document && document.environment_quote;
  const environmentChecked = document && document.environment !== 'unknown' && environmentQuote && quoteFound(environmentQuote, all);
  return {
    document: document && {
      title: document.title,
      date_on_document: DATE.test(document.date_on_document || '') ? document.date_on_document : null,
      environment: environmentChecked ? document.environment : 'unknown',
      environment_quote: environmentChecked ? environmentQuote : null,
      used_for: document.used_for,
      ignored_and_why: document.ignored_and_why,
    },
    facts,
    dropped,
  };
}

/** Reads one PDF page that has no usable text layer. Quotes cannot be checked, so confidence is capped at medium. */
async function readPdfPageWithModel({ doc, pageNumber, pdfBytes, fetchImpl }) {
  const response = await callLLM({
    stage: '01-extract-text',
    system: prompt('extract-text.md'),
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: `Document: ${doc.client_doc_ref} (type: ${doc.doc_type}), page ${pageNumber}. Use "page ${pageNumber}" as the location.` },
        { type: 'file', file: { filename: `page-${pageNumber}.pdf`, file_data: `data:application/pdf;base64,${pdfBytes.toString('base64')}` } },
      ],
    }],
    response_schema: { name: 'stage01_facts', schema: TEXT_SCHEMA },
  }, fetchImpl);
  const result = responseJson(response);
  return (result.facts || []).filter((f) => f.quote).map((f) => ({
    subject: f.subject,
    fact_type: f.fact_type,
    value: f.value,
    confidence: f.confidence === 'high' ? 'medium' : f.confidence,
    source: { doc_id: doc.doc_id, location: `page ${pageNumber}`, quote: f.quote.slice(0, 300) },
  }));
}

function imageContent(buffer, file) {
  const type = /\.png$/i.test(file) ? 'image/png' : 'image/jpeg';
  return { type: 'image_url', image_url: { url: `data:${type};base64,${buffer.toString('base64')}` } };
}

/** First image pass: labels and their regions. */
async function readImageLabels({ doc, buffer, fetchImpl }) {
  const response = await callLLM({
    stage: '01-extract-image',
    system: prompt('image-inventory.md'),
    messages: [{ role: 'user', content: [{ type: 'text', text: `Diagram: ${doc.client_doc_ref}` }, imageContent(buffer, doc.client_doc_ref)] }],
    response_schema: { name: 'diagram_labels', schema: IMAGE_INVENTORY_SCHEMA },
  }, fetchImpl);
  return responseJson(response);
}

/** Second image pass: containment and arrows between the labels found in pass one. */
async function readImageLinks({ doc, buffer, labels, fetchImpl }) {
  const response = await callLLM({
    stage: '01-extract-image',
    system: prompt('image-links.md'),
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: `Diagram: ${doc.client_doc_ref}\nLabels found in the first pass:\n${labels.map((l) => `- ${l.label}`).join('\n')}` },
        imageContent(buffer, doc.client_doc_ref),
      ],
    }],
    response_schema: { name: 'diagram_links', schema: IMAGE_LINKS_SCHEMA },
  }, fetchImpl);
  return responseJson(response);
}

/** Facts from the two image passes. Image-read items are never above medium confidence. */
function imageFacts(doc, inventory, links) {
  const facts = [];
  const known = new Set(inventory.labels.map((l) => l.label));
  const parents = new Map();
  for (const { child, parent } of links.containment) {
    if (known.has(child) && known.has(parent)) parents.set(child, [...(parents.get(child) || []), parent]);
  }
  for (const label of inventory.labels) {
    const where = parents.has(label.label) ? ` inside ${parents.get(label.label).map((p) => `'${p}'`).join(', ')}` : '';
    facts.push({
      subject: label.label,
      fact_type: label.is_actor ? 'actor' : 'component_exists',
      value: `'${label.label}' is drawn${where} (read from the image)`,
      confidence: 'medium',
      source: { doc_id: doc.doc_id, location: `image, ${label.region}, shape '${label.label}'`, quote: label.label },
    });
  }
  const unclear = [];
  for (const arrow of links.arrows) {
    if (!arrow.clear || !known.has(arrow.from) || !known.has(arrow.to)) {
      unclear.push(arrow);
      continue;
    }
    const quote = arrow.label ? `${arrow.from} -> ${arrow.to} (${arrow.label})` : `${arrow.from} -> ${arrow.to} (unlabelled arrow)`;
    facts.push({
      subject: arrow.from,
      fact_type: 'link_exists',
      value: `An arrow${arrow.label ? ` labelled '${arrow.label}'` : ''} goes from '${arrow.from}' to '${arrow.to}' (read from the image)`,
      confidence: 'medium',
      source: { doc_id: doc.doc_id, location: `image, arrow from '${arrow.from}' to '${arrow.to}'`, quote },
    });
  }
  return { facts, unclear };
}

module.exports = {
  readTextPieces, readPdfPageWithModel, readImageLabels, readImageLinks, imageFacts, chunkPieces, Refused,
  TEXT_SCHEMA, IMAGE_INVENTORY_SCHEMA, IMAGE_LINKS_SCHEMA, FACT_TYPES,
};
