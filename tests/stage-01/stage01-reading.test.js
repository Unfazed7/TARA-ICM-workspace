'use strict';

// Stage 01 reading (spec 19). The model is faked: no API key, no network.

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { ROOT, readJson, validateSchema } = require('../helpers/schema-validation');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stage01-'));
const saved = { key: process.env.OPENROUTER_API_KEY, audit: process.env.LLM_AUDIT_FILE, provider: process.env.LLM_PROVIDER, model: process.env.LLM_MODEL };
process.env.OPENROUTER_API_KEY = 'test-key';
process.env.LLM_AUDIT_FILE = path.join(tmp, 'audit.jsonl');
delete process.env.LLM_PROVIDER;
delete process.env.LLM_MODEL;

const STAGE = path.join(ROOT, 'tara-workspace', 'web-based-tara', 'stages', '01-input-normalization');
const { runStage01, seedStage01 } = require(path.join(STAGE, 'agent.js'));
const { missingInput } = require(path.join(STAGE, 'lib', 'minimum-input.js'));
const drawio = require(path.join(STAGE, 'lib', 'readers', 'drawio.js'));
const readers = require(path.join(STAGE, 'lib', 'readers', 'text-readers.js'));
const { chunkPieces } = require(path.join(STAGE, 'lib', 'extract.js'));
const { quoteFound } = require(path.join(STAGE, 'lib', 'quotes.js'));
const { Redactor } = require(path.join(STAGE, 'lib', 'redact.js'));

const ITEM_01 = path.join(ROOT, 'tests', 'fixtures', 'synthetic', 'item-01');
const INPUTS = path.join(ITEM_01, 'inputs');
const expected = (name) => readJson(path.join(ITEM_01, 'expected', name));
const schema = (name) => readJson(path.join(ROOT, 'src', 'schemas', name));

test.after(() => {
  for (const [env, value] of [['OPENROUTER_API_KEY', saved.key], ['LLM_AUDIT_FILE', saved.audit], ['LLM_PROVIDER', saved.provider], ['LLM_MODEL', saved.model]]) {
    if (value === undefined) delete process.env[env];
    else process.env[env] = value;
  }
  fs.rmSync(tmp, { recursive: true, force: true });
});

// ── Fake model ────────────────────────────────────────────────────────────────

function reply(obj, finish = 'stop') {
  return { ok: true, json: async () => ({ id: 'gen-1', model: 'anthropic/claude-sonnet-5.5', provider: 'Anthropic', usage: {}, choices: [{ finish_reason: finish, message: { content: obj === null ? null : JSON.stringify(obj) } }] }) };
}

const EMPTY_DOCUMENT = { title: 'Document', date_on_document: null, environment: 'unknown', environment_quote: null, used_for: 'Functions', ignored_and_why: '' };

/** Answers per document file name; `requests` records every request body. */
function fakeModel(answers = {}) {
  const requests = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    requests.push(body);
    const name = body.response_format.json_schema.name;
    const userText = JSON.stringify(body.messages[body.messages.length - 1].content);
    const file = Object.keys(answers).find((f) => userText.includes(f));
    const answer = file ? answers[file] : null;
    if (typeof answer === 'function') return answer(name, body);
    if (answer && answer[name]) return reply(answer[name]);
    if (name === 'stage01_facts') return reply({ document: EMPTY_DOCUMENT, facts: [] });
    if (name === 'diagram_labels') return reply({ title: null, labels: [] });
    return reply({ containment: [], arrows: [], environment: 'unknown', environment_quote: null });
  };
  return { fetchImpl, requests };
}

const ANSWERS_FACTS = {
  stage01_facts: {
    document: { title: 'Answers to Intake Questions', date_on_document: '2026-09-15', environment: 'dev', environment_quote: 'These answers describe `kcp-dev`', used_for: 'Entry points and sign-in', ignored_and_why: 'Answer 12 (running cost) is not about security.' },
    facts: [
      { subject: 'API gateway', fact_type: 'attribute', value: 'The API gateway is the only public entry point', location: 'answer 3', quote: 'The API gateway is the only public entry point', confidence: 'high' },
      { subject: 'WAF', fact_type: 'absence_stated', value: 'No web application firewall is used', location: 'answer 4', quote: 'We do not use a WAF at the moment.', confidence: 'high' },
      { subject: 'Keys', fact_type: 'control_stated', value: 'Invented', location: 'answer 6', quote: 'All keys are stored on quantum hardware', confidence: 'high' },
    ],
  },
};

const PNG_LABELS = {
  diagram_labels: { title: 'Key & Certificate Portal - Production Architecture', labels: drawio.drawioSummary(drawio.parseDrawio(fs.readFileSync(path.join(INPUTS, 'architecture.drawio')))).labels.map((label) => ({ label, region: 'somewhere', is_actor: false })) },
};

function copyInputs(name, change = () => {}) {
  const dir = path.join(tmp, name);
  fs.cpSync(INPUTS, dir, { recursive: true });
  change(dir);
  return dir;
}

async function runItem01(options = {}) {
  const model = fakeModel({ 'client-answers.md': ANSWERS_FACTS, 'architecture.png': PNG_LABELS, ...(options.answers || {}) });
  const outDir = path.join(tmp, `out-${Math.random().toString(36).slice(2)}`);
  const result = await runStage01({ inputDir: options.inputDir || INPUTS, outDir, fetchImpl: model.fetchImpl, date: '2026-10-02', redactor: options.redactor || new Redactor({ enabled: false }) });
  return { result, outDir, requests: model.requests };
}

// ── Minimum input ─────────────────────────────────────────────────────────────

test('minimum input names each missing piece', () => {
  const missing = missingInput('', [{ doc_type: 'manual' }]);
  assert.equal(missing.length, 2);
  assert.match(missing[0], /boundary statement/);
  assert.match(missing[1], /describing components/);
  assert.match(missingInput('The portal and everything in its account.', [{ doc_type: 'diagram' }])[0], /describing behaviour/);
  assert.deepEqual(missingInput('The portal and everything in its account.', [{ doc_type: 'diagram' }, { doc_type: 'qa' }]), []);
});

test('stage stops before reading when the minimum is missing', async () => {
  const dir = copyInputs('no-boundary', (d) => fs.rmSync(path.join(d, 'boundary.txt')));
  const model = fakeModel();
  const result = await runStage01({ inputDir: dir, outDir: path.join(tmp, 'nb-out'), fetchImpl: model.fetchImpl, redactor: new Redactor({ enabled: false }) });
  assert.equal(result.status, 'missing_input');
  assert.equal(model.requests.length, 0);
});

test('stage stops after reading when the only component document cannot be read', async () => {
  const dir = copyInputs('bad-diagram', (d) => {
    fs.writeFileSync(path.join(d, 'architecture.drawio'), 'not xml at all');
    fs.rmSync(path.join(d, 'architecture.png'));
  });
  const { result } = await runItem01({ inputDir: dir });
  assert.equal(result.status, 'missing_input');
  assert.match(result.missing[0], /describing components/);
});

// ── item-01 ───────────────────────────────────────────────────────────────────

test('item-01: register matches the expected register on ids, types, ranks and hashes', async () => {
  const { result } = await runItem01();
  const want = expected('document-register.json');
  assert.equal(result.status, 'done');
  assert.deepEqual(
    result.register.map((d) => [d.doc_id, d.client_doc_ref, d.doc_type, d.precedence_rank, d.sha256, d.date_received]),
    want.map((d) => [d.doc_id, d.client_doc_ref, d.doc_type, d.precedence_rank, d.sha256, d.date_received]),
  );
  assert.deepEqual(result.register.map((d) => d.environment), want.map((d) => d.environment));
});

test('item-01: the draw.io reader finds every shape, arrow and location the answer key uses', () => {
  const pages = drawio.parseDrawio(fs.readFileSync(path.join(INPUTS, 'architecture.drawio')));
  assert.equal(pages[0].arrows.length, 19);
  assert.equal(pages[0].shapes.length, 29);
  const facts = drawio.drawioFacts(pages, 'DOC-01');
  const locations = new Set(facts.map((f) => f.source.location));
  const wanted = expected('facts.json').flatMap((f) => f.source_refs).filter((s) => s.doc_id === 'DOC-01').map((s) => s.location);
  for (const location of wanted) assert.ok(locations.has(location), `missing ${location}`);
  const cert = facts.find((f) => f.subject === 'Cert Service');
  assert.match(cert.value, /inside 'ECS cluster', 'Private subnet', 'VPC'/);
});

test('item-01: outputs validate against the shared schemas', async () => {
  const { result, outDir } = await runItem01();
  const check = (data, file) => {
    const r = validateSchema(data, schema(file));
    assert.equal(r.valid, true, JSON.stringify(r.errors, null, 2));
  };
  check(readJson(path.join(outDir, 'document-register.json')), 'stage-01-document-register.schema.json');
  check(readJson(path.join(outDir, 'facts.raw.json')), 'stage-01-facts.schema.json');
  check(readJson(path.join(outDir, 'rationale.json')), 'rationale.schema.json');
  assert.equal(result.facts[0].fact_id, 'FCT-001');
});

test('item-01: an invented quote is dropped and logged', async () => {
  const { result, outDir } = await runItem01();
  assert.ok(result.facts.some((f) => f.source_refs[0].quote === 'We do not use a WAF at the moment.'));
  assert.ok(!result.facts.some((f) => /quantum/.test(f.source_refs[0].quote)));
  const dropped = readJson(path.join(outDir, 'dropped-facts.json'));
  assert.equal(dropped.length, 1);
  assert.equal(dropped[0].reason, 'quote not found in the document');
});

test('item-01: the image of the diagram only cross-checks labels', async () => {
  const { result, requests } = await runItem01();
  const png = result.register.find((d) => d.client_doc_ref === 'architecture.png');
  assert.equal(png.reading_method, 'image_model');
  assert.equal(result.facts.filter((f) => f.source_refs[0].doc_id === png.doc_id).length, 0);
  assert.equal(requests.filter((r) => r.response_format.json_schema.name === 'diagram_links').length, 0);
  assert.ok(!result.rationale.some((r) => r.kind === 'ambiguity'), 'labels match, so no ambiguity');
});

test('item-01: an unclear environment becomes a Rationale item', async () => {
  const { result } = await runItem01();
  const item = result.rationale.find((r) => r.title === 'Which environment does functional.md describe?');
  assert.ok(item);
  assert.equal(item.attention, 'needs_attention');
  assert.deepEqual(item.affects, ['DOC-04']);
});

test('different labels in the image and its source become an ambiguity', async () => {
  const labels = { diagram_labels: { title: null, labels: [{ label: 'VPC', region: 'right', is_actor: false }, { label: 'Mystery box', region: 'left', is_actor: false }] } };
  const { result } = await runItem01({ answers: { 'architecture.png': labels } });
  const item = result.rationale.find((r) => r.kind === 'ambiguity');
  assert.ok(item);
  assert.match(item.concluded, /Mystery box/);
});

// ── Partial failure and refusals ──────────────────────────────────────────────

test('an unreadable file is marked failed with a reason, gets a Rationale item, and the run continues', async () => {
  const dir = copyInputs('corrupt', (d) => {
    fs.writeFileSync(path.join(d, 'notes.docx'), 'this is not a zip file');
    const manifest = readJson(path.join(d, 'manifest.json'));
    manifest.push({ file: 'notes.docx', doc_type: 'manual', date_received: '2026-09-18' });
    fs.writeFileSync(path.join(d, 'manifest.json'), JSON.stringify(manifest));
  });
  const { result } = await runItem01({ inputDir: dir });
  assert.equal(result.status, 'done');
  const notes = result.register.find((d) => d.client_doc_ref === 'notes.docx');
  assert.equal(notes.read_status, 'failed');
  assert.match(notes.read_status_reason, /Reading failed/);
  const gap = result.rationale.find((r) => r.affects.includes(notes.doc_id));
  assert.equal(gap.kind, 'gap');
  assert.match(gap.would_change, /readable copy/);
  assert.ok(result.facts.length > 40, 'other documents are still read');
});

test('a refusal marks the document failed instead of stopping the run', async () => {
  const { result } = await runItem01({ answers: { 'functional.md': () => reply(null, 'content_filter') } });
  const doc = result.register.find((d) => d.client_doc_ref === 'functional.md');
  assert.equal(doc.read_status, 'failed');
  assert.equal(doc.read_status_reason, 'The model declined to read it.');
  assert.equal(result.status, 'done');
});

test('a file without a type gets a guessed type and an information item', async () => {
  const dir = copyInputs('untyped', (d) => fs.writeFileSync(path.join(d, 'extra.md'), '# Extra\n\nNothing here.'));
  const { result } = await runItem01({ inputDir: dir });
  const doc = result.register.find((d) => d.client_doc_ref === 'extra.md');
  assert.equal(doc.doc_type, 'other');
  assert.equal(doc.doc_type_label, 'not classified at upload');
  const item = result.rationale.find((r) => r.kind === 'assumption' && r.affects.includes(doc.doc_id));
  assert.equal(item.attention, 'information');
});

// ── Readers ───────────────────────────────────────────────────────────────────

test('html reader keeps sections and table rows', () => {
  const pieces = readers.readHtml('<html><body><h2>Access</h2><p>Admins use SSO.</p><table><tr><th>Host</th><th>Port</th></tr><tr><td>api</td><td>443</td></tr></table><script>x()</script></body></html>');
  assert.deepEqual(pieces.map((p) => p.location), ["section 'Access'", "table 1, row 1 (section 'Access')", "table 1, row 2 (section 'Access')"]);
  assert.equal(pieces[2].text, 'api | 443');
  assert.ok(!pieces.some((p) => /x\(\)/.test(p.text)));
});

test('docx reader reads paragraphs and tables', async () => {
  const JSZip = require('jszip');
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>The portal stores certificates in a database.</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Service</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Port</w:t></w:r></w:p></w:tc></w:tr><w:tr><w:tc><w:p><w:r><w:t>API</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>443</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>');
  const pieces = await readers.readDocx(await zip.generateAsync({ type: 'nodebuffer' }));
  assert.match(pieces[0].text, /stores certificates/);
  assert.equal(pieces.find((p) => p.location === 'table 1, row 2').text, 'API | 443');
});

test('xlsx reader names each value by its column', async () => {
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Assets');
  sheet.addRow(['Name', 'Type', 'Public']);
  sheet.addRow(['Cert DB', 'PostgreSQL', 'no']);
  const pieces = await readers.readXlsx(Buffer.from(await wb.xlsx.writeBuffer()));
  assert.equal(pieces[1].location, "sheet 'Assets', row 2");
  assert.equal(pieces[1].text, 'Name: Cert DB | Type: PostgreSQL | Public: no');
});

test('pdf reader uses the text layer and sends pages without text to the model', async () => {
  const { PDFDocument, StandardFonts } = require('pdf-lib');
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage();
  page.drawText('The certificate service calls the key service over HTTPS inside the private subnet.', { x: 20, y: 700, size: 9, font });
  doc.addPage();
  const bytes = Buffer.from(await doc.save());
  const { pieces, imagePages } = await readers.readPdf(bytes);
  assert.equal(pieces[0].location, 'page 1');
  assert.match(pieces[0].text, /key service over HTTPS/);
  assert.deepEqual(imagePages, [2]);
  const single = await readers.pdfPage(bytes, 2);
  assert.equal((await PDFDocument.load(single)).getPageCount(), 1);
});

test('a scanned PDF page goes to the model as a file and its facts are capped at medium', async () => {
  const { PDFDocument } = require('pdf-lib');
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const dir = copyInputs('scan');
  fs.writeFileSync(path.join(dir, 'scan.pdf'), Buffer.from(await pdf.save()));
  const manifest = readJson(path.join(dir, 'manifest.json'));
  manifest.push({ file: 'scan.pdf', doc_type: 'manual', date_received: '2026-09-18' });
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
  const scanned = { stage01_facts: { document: EMPTY_DOCUMENT, facts: [{ subject: 'Portal', fact_type: 'function', value: 'Users download certificates', location: 'page 1', quote: 'Download certificates', confidence: 'high' }] } };
  const { result, requests } = await runItem01({ inputDir: dir, answers: { 'scan.pdf': scanned } });
  const doc = result.register.find((d) => d.client_doc_ref === 'scan.pdf');
  assert.equal(doc.reading_method, 'image_model');
  assert.deepEqual(doc.page_methods, [{ page: 1, method: 'image_model' }]);
  const fact = result.facts.find((f) => f.source_refs[0].doc_id === doc.doc_id);
  assert.equal(fact.confidence, 'medium');
  const sent = requests.find((r) => JSON.stringify(r.messages).includes('scan.pdf'));
  assert.equal(sent.messages[1].content[1].type, 'file');
});

test('an image without a source file is read in two passes; unclear arrows become an ambiguity', async () => {
  const dir = copyInputs('image-only', (d) => {
    fs.rmSync(path.join(d, 'architecture.drawio'));
    const manifest = readJson(path.join(d, 'manifest.json')).filter((m) => m.file !== 'architecture.drawio');
    fs.writeFileSync(path.join(d, 'manifest.json'), JSON.stringify(manifest));
  });
  const image = {
    diagram_labels: { title: 'Production Architecture', labels: [{ label: 'API Gateway', region: 'centre', is_actor: false }, { label: 'Cert Service', region: 'right', is_actor: false }] },
    diagram_links: { containment: [], arrows: [{ from: 'API Gateway', to: 'Cert Service', label: null, clear: true }, { from: 'API Gateway', to: '?', label: null, clear: false }], environment: 'prod', environment_quote: 'Production Architecture' },
  };
  const { result } = await runItem01({ inputDir: dir, answers: { 'architecture.png': image } });
  const doc = result.register.find((d) => d.client_doc_ref === 'architecture.png');
  const facts = result.facts.filter((f) => f.source_refs[0].doc_id === doc.doc_id);
  assert.equal(facts.length, 3);
  assert.ok(facts.every((f) => f.confidence === 'medium'));
  assert.ok(result.rationale.some((r) => r.kind === 'ambiguity' && /could not be read clearly/.test(r.title)));
});

// ── Quotes, chunks, redaction, storage ────────────────────────────────────────

test('quote check ignores spacing, case and emphasis, and follows "..." in order', () => {
  const text = 'These answers describe `kcp-dev`.\n\n**5. How do people sign in?**  Operators   sign in with the corporate SSO.';
  assert.ok(quoteFound('these answers describe kcp-dev', text));
  assert.ok(quoteFound('Operators sign in ... corporate SSO', text));
  assert.ok(!quoteFound('corporate SSO ... Operators', text));
  assert.ok(!quoteFound('', text));
});

test('large documents are split with one piece of overlap', () => {
  const pieces = Array.from({ length: 5 }, (_, i) => ({ location: `page ${i + 1}`, text: 'x'.repeat(100) }));
  const chunks = chunkPieces(pieces, 250);
  assert.ok(chunks.length > 1);
  assert.equal(chunks[1][0].location, chunks[0][chunks[0].length - 1].location);
});

test('with redaction on, sensitive details never reach the model and come back in the facts', async () => {
  const dir = copyInputs('redact', (d) => {
    fs.appendFileSync(path.join(d, 'client-answers.md'), '\n\n**13. Where does it run?**\n\nThe gateway is at api.portal.example.com (10.0.0.5) in account 123456789012, run by Alex Doe.\n');
  });
  const answers = {
    'client-answers.md': (name, body) => {
      const sent = JSON.stringify(body);
      const quote = /The gateway is at \[HOST-1\] \(\[IP-1\]\) in account \[ACCOUNT-1\], run by \[NAME-1\]/.exec(body.messages[1].content);
      assert.ok(quote, 'tokens expected in the request');
      for (const secret of ['api.portal.example.com', '10.0.0.5', '123456789012', 'Alex Doe']) assert.ok(!sent.includes(secret), `${secret} was sent`);
      return reply({ document: EMPTY_DOCUMENT, facts: [{ subject: 'Gateway', fact_type: 'attribute', value: 'The gateway runs at [HOST-1]', location: 'answer 13', quote: quote[0], confidence: 'high' }] });
    },
  };
  const { result, outDir } = await runItem01({ inputDir: dir, answers, redactor: new Redactor({ enabled: true, names: ['Alex Doe'] }) });
  const fact = result.facts.find((f) => f.subject === 'Gateway');
  assert.equal(fact.value, 'The gateway runs at api.portal.example.com');
  assert.match(fact.source_refs[0].quote, /api\.portal\.example\.com \(10\.0\.0\.5\) in account 123456789012, run by Alex Doe/);
  assert.equal(readJson(path.join(outDir, 'redaction-map.json'))['[HOST-1]'], 'api.portal.example.com');
  const png = result.register.find((d) => d.client_doc_ref === 'architecture.png');
  assert.equal(png.read_status, 'failed', 'images are not sent while hiding is on');
});

test('each model call is recorded with the pinned model and prompt version', async () => {
  fs.rmSync(process.env.LLM_AUDIT_FILE, { force: true });
  await runItem01();
  const lines = fs.readFileSync(process.env.LLM_AUDIT_FILE, 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(lines.map((l) => [l.stage, l.prompt_version]), [
    ['01-extract-text', 'extract-v1'], ['01-extract-text', 'extract-v1'], ['01-extract-image', 'image-v1'],
  ]);
});

test('seeding logs in as the pipeline and stores the run', async () => {
  const { result } = await runItem01();
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body), auth: init.headers.Authorization });
    if (url.endsWith('/service-token')) return { ok: true, status: 200, json: async () => ({ access_token: 'svc' }) };
    return { ok: true, status: 201, json: async () => ({ run_number: 1, refused: [] }) };
  };
  const stored = await seedStage01({ api: 'http://api', assessmentId: 'ASS_1', secret: 's3cret', result, fetchImpl });
  assert.equal(stored.run_number, 1);
  assert.deepEqual(calls[0].body, { secret: 's3cret' });
  assert.equal(calls[1].url, 'http://api/api/v1/assessments/ASS_1/stages/01/runs');
  assert.equal(calls[1].auth, 'Bearer svc');
  assert.deepEqual(Object.keys(calls[1].body), ['document_register', 'facts', 'conflicts', 'rationale']);
});
