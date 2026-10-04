#!/usr/bin/env node
'use strict';

/**
 * Stage 01 Input Normalization: reading (spec .meta/specs/19-stage-01-reading.md, D-43).
 *
 *   node agent.js --input <folder> --out <folder> [--seed --api <url> --assessment <id>]
 *
 * The input folder holds the client files, boundary.txt and manifest.json
 * ([{file, doc_type, date_received}], written by the upload screen). Writes
 * document-register.json, facts.raw.json (per document), then compares documents
 * (_engines/fact-reconcile.js, spec 20) and writes facts.json with conflicts, and rationale.json.
 *
 * Exit codes: 0 done, 2 minimum input missing (the missing items are printed), 1 error.
 */

const fs = require('fs');
const path = require('path');

const { initialRegister } = require('./lib/register');
const { missingInput } = require('./lib/minimum-input');
const { RationaleBook } = require('./lib/rationale');
const { Redactor } = require('./lib/redact');
const drawio = require('./lib/readers/drawio');
const readers = require('./lib/readers/text-readers');
const extract = require('./lib/extract');
const { normalise } = require('./lib/quotes');
const { reconcile, writeReconciled } = require('../../_engines/fact-reconcile');

const DEFAULT_OUT = path.join(__dirname, 'output');

function today() {
  return new Date().toISOString().slice(0, 10);
}

function kindOf(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.drawio' || (ext === '.xml' && /mxfile/.test(file))) return 'drawio';
  if (['.md', '.markdown', '.txt'].includes(ext)) return 'text';
  if (['.html', '.htm'].includes(ext)) return 'html';
  if (ext === '.docx') return 'docx';
  if (ext === '.xlsx') return 'xlsx';
  if (ext === '.pdf') return 'pdf';
  if (['.png', '.jpg', '.jpeg'].includes(ext)) return 'image';
  return 'unsupported';
}

function fail(doc, reason) {
  doc.read_status = 'failed';
  doc.read_status_reason = reason;
  doc.used_for = '';
  doc.ignored_and_why = 'The file could not be read.';
}

function applyDocumentInfo(doc, info) {
  if (!info) return;
  if (info.title) doc.title = info.title;
  if (info.date_on_document) doc.date_on_document = info.date_on_document;
  if (info.environment && info.environment !== 'unknown') doc.environment = info.environment;
  if (info.used_for) doc.used_for = info.used_for;
  if (info.ignored_and_why) doc.ignored_and_why = info.ignored_and_why;
}

const TEXT_READERS = {
  text: async (buffer) => readers.readText(buffer),
  html: async (buffer) => readers.readHtml(buffer),
  docx: (buffer) => readers.readDocx(buffer),
  xlsx: (buffer) => readers.readXlsx(buffer),
};

/** Reads one document; updates its register entry in place and returns its facts. */
async function readDocument(doc, buffer, ctx) {
  const kind = kindOf(doc.client_doc_ref);

  if (kind === 'drawio') {
    const pages = drawio.parseDrawio(buffer);
    const summary = drawio.drawioSummary(pages);
    doc.page_methods = pages.map((p) => ({ page: p.page, method: 'parsed' }));
    applyDocumentInfo(doc, summary);
    ctx.parsedLabels.set(path.parse(doc.client_doc_ref).name.toLowerCase(), { doc, labels: summary.labels });
    return drawio.drawioFacts(pages, doc.doc_id);
  }

  if (kind in TEXT_READERS) {
    const pieces = await TEXT_READERS[kind](buffer);
    if (!pieces.length) {
      fail(doc, 'The file has no readable text.');
      return [];
    }
    const result = await extract.readTextPieces({ doc, pieces, redactor: ctx.redactor, fetchImpl: ctx.fetchImpl });
    applyDocumentInfo(doc, result.document);
    ctx.dropped.push(...result.dropped);
    return result.facts;
  }

  if (kind === 'pdf') {
    const { pieces, imagePages, pageCount } = await readers.readPdf(buffer);
    const facts = [];
    doc.page_methods = [];
    if (pieces.length) {
      const result = await extract.readTextPieces({ doc, pieces, redactor: ctx.redactor, fetchImpl: ctx.fetchImpl });
      applyDocumentInfo(doc, result.document);
      ctx.dropped.push(...result.dropped);
      facts.push(...result.facts);
    }
    const unread = [];
    for (const page of imagePages) {
      if (ctx.redactor.enabled) {
        unread.push(`page ${page} (no text layer; not sent to the model while sensitive details are hidden)`);
        continue;
      }
      facts.push(...await extract.readPdfPageWithModel({ doc, pageNumber: page, pdfBytes: await readers.pdfPage(buffer, page), fetchImpl: ctx.fetchImpl }));
    }
    for (let n = 1; n <= pageCount; n += 1) {
      doc.page_methods.push({ page: n, method: imagePages.includes(n) ? 'image_model' : 'text_layer' });
    }
    doc.reading_method = imagePages.length === 0 ? 'text_layer' : (pieces.length ? 'mixed' : 'image_model');
    if (unread.length) {
      doc.unread_parts = unread;
      doc.read_status = 'partial';
      doc.read_status_reason = `${unread.length} page(s) without a text layer were not read.`;
    }
    return facts;
  }

  if (kind === 'image') {
    doc.reading_method = 'image_model';
    doc.page_methods = [{ page: 1, method: 'image_model' }];
    if (ctx.redactor.enabled) {
      fail(doc, 'Images are not sent to the model while sensitive details are hidden.');
      return [];
    }
    ctx.images.push({ doc, buffer });
    return null; // read after all source diagrams are parsed, so a copy can be recognised
  }

  fail(doc, `This file format (${path.extname(doc.client_doc_ref) || 'no extension'}) cannot be read yet.`);
  return [];
}

async function readImage({ doc, buffer }, ctx) {
  const inventory = await extract.readImageLabels({ doc, buffer, fetchImpl: ctx.fetchImpl });
  const twin = ctx.parsedLabels.get(path.parse(doc.client_doc_ref).name.toLowerCase());
  if (twin) {
    const fromImage = new Map(inventory.labels.map((l) => [normalise(l.label), l.label]));
    const fromSource = new Map(twin.labels.map((l) => [normalise(l), l]));
    const onlyInImage = [...fromImage.keys()].filter((k) => !fromSource.has(k)).map((k) => fromImage.get(k));
    const onlyInSource = [...fromSource.keys()].filter((k) => !fromImage.has(k)).map((k) => fromSource.get(k));
    doc.title = inventory.title || doc.title;
    doc.environment = twin.doc.environment;
    doc.used_for = `Cross-check of the labels read from ${twin.doc.client_doc_ref}`;
    doc.ignored_and_why = `No facts taken from it: it is an image of ${twin.doc.client_doc_ref}, whose source file was read directly.`;
    if (onlyInImage.length || onlyInSource.length) ctx.book.labelsDiffer(doc, twin.doc, onlyInImage, onlyInSource);
    return [];
  }
  const links = await extract.readImageLinks({ doc, buffer, labels: inventory.labels, fetchImpl: ctx.fetchImpl });
  const { facts, unclear } = extract.imageFacts(doc, inventory, links);
  if (inventory.title) doc.title = inventory.title;
  if (links.environment !== 'unknown' && links.environment_quote) doc.environment = links.environment;
  doc.used_for = 'Components, containment and arrows read from the image';
  doc.ignored_and_why = 'Unlabelled icons were not recorded.';
  if (unclear.length) ctx.book.unclearArrows(doc, unclear);
  return facts;
}

async function readSafely(doc, read) {
  try {
    return await read();
  } catch (err) {
    const reason = err instanceof extract.Refused ? 'The model declined to read it.' : `Reading failed: ${err.message}`;
    fail(doc, reason);
    return [];
  }
}

/**
 * Runs Stage 01 reading. Returns {status: 'done'|'missing_input', missing, register, facts, rationale, dropped}.
 */
async function runStage01({ inputDir, outDir = DEFAULT_OUT, fetchImpl = fetch, redactor = new Redactor(), date = today() }) {
  const boundaryFile = path.join(inputDir, 'boundary.txt');
  const boundary = fs.existsSync(boundaryFile) ? fs.readFileSync(boundaryFile, 'utf8') : null;
  const { entries: register, guessed, groups } = initialRegister(inputDir, date);

  let missing = missingInput(boundary, register, groups);
  if (missing.length) return { status: 'missing_input', missing };

  const book = new RationaleBook();
  const ctx = { redactor, fetchImpl, book, dropped: [], parsedLabels: new Map(), images: [] };
  const factsByDoc = new Map();

  for (const doc of register) {
    const buffer = fs.readFileSync(path.join(inputDir, doc.client_doc_ref));
    factsByDoc.set(doc.doc_id, await readSafely(doc, () => readDocument(doc, buffer, ctx)));
  }
  for (const image of ctx.images) {
    factsByDoc.set(image.doc.doc_id, await readSafely(image.doc, () => readImage(image, ctx)));
  }

  for (const doc of register) {
    if (doc.read_status === 'failed') {
      doc.reading_method = doc.reading_method || 'parsed';
      book.unreadable(doc, false);
    } else if (doc.read_status === 'partial') {
      book.unreadable(doc, true);
    } else if (doc.environment === 'unknown') {
      book.unknownEnvironment(doc);
    }
    if (!doc.used_for && doc.read_status !== 'failed') doc.used_for = 'Nothing usable was found in it.';
  }
  for (const { file } of guessed) book.guessedType(register.find((d) => d.client_doc_ref === file));

  missing = missingInput(boundary, register, groups);
  if (missing.length) return { status: 'missing_input', missing, register };

  const facts = [];
  for (const doc of register) {
    for (const fact of factsByDoc.get(doc.doc_id) || []) {
      facts.push({
        fact_id: `FCT-${String(facts.length + 1).padStart(3, '0')}`,
        subject: fact.subject,
        fact_type: fact.fact_type,
        value: fact.value,
        source_refs: [fact.source],
        confidence: fact.confidence,
        status: 'proposed',
      });
    }
  }

  writeOutputs(outDir, { register, facts, rationale: book.items, dropped: ctx.dropped }, redactor);
  const reconciled = await reconcile({ register, rawFacts: facts, rationale: book.items, fetchImpl, redactor });
  writeReconciled(outDir, reconciled);
  return {
    status: 'done',
    register,
    rawFacts: facts,
    facts: reconciled.facts,
    conflicts: reconciled.conflicts,
    rationale: reconciled.rationale,
    dropped: ctx.dropped,
    reconcileLog: reconciled.log,
  };
}

function writeOutputs(outDir, result, redactor) {
  fs.mkdirSync(outDir, { recursive: true });
  const write = (name, data) => fs.writeFileSync(path.join(outDir, name), `${JSON.stringify(data, null, 2)}\n`);
  write('document-register.json', result.register);
  write('facts.raw.json', { facts: result.facts, conflicts: [] });
  write('rationale.json', result.rationale);
  write('dropped-facts.json', result.dropped);
  if (redactor.enabled) write('redaction-map.json', redactor.mapping());
}

/** Stores the run through the C3 store with the pipeline's service login (spec 18). */
async function seedStage01({ api, assessmentId, secret, result, fetchImpl = fetch }) {
  const login = await fetchImpl(`${api}/api/v1/auth/service-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret }),
  });
  if (!login.ok) throw new Error(`service login failed (${login.status})`);
  const { access_token: token } = await login.json();
  const response = await fetchImpl(`${api}/api/v1/assessments/${assessmentId}/stages/01/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ document_register: result.register, facts: result.facts, conflicts: result.conflicts || [], rationale: result.rationale }),
  });
  const body = await response.json();
  if (!response.ok && response.status !== 422) throw new Error(`storing the run failed (${response.status}): ${JSON.stringify(body)}`);
  return { status: response.status, ...body };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i].replace(/^--/, '');
    if (key === 'seed') args.seed = true;
    else args[key] = argv[i + 1], i += 1;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) {
    process.stderr.write('Usage: node agent.js --input <folder> [--out <folder>] [--seed --api <url> --assessment <id>]\n');
    process.exit(1);
  }
  const result = await runStage01({ inputDir: path.resolve(args.input), outDir: path.resolve(args.out || DEFAULT_OUT) });
  if (result.status === 'missing_input') {
    const unread = (result.register || []).filter((d) => d.read_status === 'failed');
    const why = unread.length ? `\nThese files could not be read:\n${unread.map((d) => `- ${d.client_doc_ref}: ${d.read_status_reason}`).join('\n')}\n` : '';
    process.stderr.write(`Stage 01 stopped. Missing input:\n${result.missing.map((m) => `- ${m}`).join('\n')}\n${why}`);
    process.exit(2);
  }
  const failed = result.register.filter((d) => d.read_status !== 'parsed').length;
  process.stdout.write(`Stage 01 read ${result.register.length} documents (${failed} not fully read): ${result.rawFacts.length} facts read, ${result.dropped.length} dropped for a quote not found; after comparing documents ${result.facts.length} facts and ${result.conflicts.length} conflicts; ${result.rationale.length} Rationale items.\n`);
  if (args.seed) {
    const stored = await seedStage01({ api: args.api || 'http://localhost:8000', assessmentId: args.assessment, secret: process.env.PIPELINE_SERVICE_SECRET, result });
    const refused = stored.refused || [];
    process.stdout.write(`Stored as run ${stored.run_number ?? '(none)'}; ${refused.length} item(s) refused.\n`);
    for (const r of refused) process.stdout.write(`  ${r.rule}: ${r.message} ${JSON.stringify(r.details)}\n`);
  }
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`Stage 01 failed: ${err.message}\n`);
    process.exit(1);
  });
}

module.exports = { runStage01, seedStage01, kindOf };
