'use strict';

/**
 * Document register (spec 12a, spec 19). The analyst chooses each document's type at
 * upload (D-43); it arrives in manifest.json. A file without a type gets one guessed
 * from its extension, and the guess becomes a Rationale item.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const RANKS = {
  config_export: 2, qa: 3, existing_item_definition: 4, diagram: 5, infra: 6,
  functional: 7, srs: 7, api_spec: 7, asset_list: 7, manual: 8, other: 8,
};
const DOC_TYPES = Object.keys(RANKS);
const READER_VERSION = 'stage01-reader-1';
const NOT_DOCUMENTS = new Set(['boundary.txt', 'manifest.json']);

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function guessType(file) {
  const ext = path.extname(file).toLowerCase();
  if (['.drawio', '.png', '.jpg', '.jpeg', '.vsdx'].includes(ext)) return 'diagram';
  if (['.xlsx', '.csv'].includes(ext)) return 'asset_list';
  return 'other';
}

function readManifest(inputDir) {
  const file = path.join(inputDir, 'manifest.json');
  if (!fs.existsSync(file)) return [];
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Array.isArray(manifest) ? manifest : manifest.documents || [];
}

/**
 * Lists the documents in the input folder, in manifest order, then any other files by name.
 * Returns register entries without the reading results, plus the guessed types.
 */
function initialRegister(inputDir, today) {
  const manifest = readManifest(inputDir);
  const listed = new Map(manifest.map((m) => [m.file, m]));
  const files = fs.readdirSync(inputDir).filter((f) => !NOT_DOCUMENTS.has(f) && !f.startsWith('.') && fs.statSync(path.join(inputDir, f)).isFile());
  const ordered = [...manifest.map((m) => m.file).filter((f) => files.includes(f)), ...files.filter((f) => !listed.has(f)).sort()];
  const guessed = [];
  const groups = {};
  const entries = ordered.map((file, index) => {
    const meta = listed.get(file) || {};
    let docType = meta.doc_type;
    if (!DOC_TYPES.includes(docType)) {
      docType = guessType(file);
      guessed.push({ file, doc_type: docType });
    }
    const buffer = fs.readFileSync(path.join(inputDir, file));
    const entry = {
      doc_id: `DOC-${String(index + 1).padStart(2, '0')}`,
      title: meta.title || file,
      client_doc_ref: file,
      date_received: meta.date_received || today,
      owner: meta.owner || 'client',
      environment: 'unknown',
      doc_type: docType,
      sha256: sha256(buffer),
      read_status: 'parsed',
      reading_method: 'parsed',
      reader_version: READER_VERSION,
      precedence_rank: RANKS[docType],
      used_for: '',
      ignored_and_why: '',
    };
    if (docType === 'other') entry.doc_type_label = meta.type_label || meta.doc_type_label || (listed.has(file) ? 'other' : 'not classified at upload');
    if (meta.category === 'components' || meta.category === 'behaviour') groups[entry.doc_id] = meta.category;
    return entry;
  });
  return { entries, guessed, groups };
}

module.exports = { initialRegister, sha256, RANKS, DOC_TYPES, READER_VERSION };
