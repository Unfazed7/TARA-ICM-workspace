'use strict';

/**
 * Readers that turn a document into located pieces of text: [{location, text}].
 * The model only ever sees these pieces, and every quote it returns is checked
 * against them (spec 19). No model is used here.
 */

const { parse } = require('node-html-parser');

/** Markdown and plain text: one piece per heading section (or per blank-line block when there are none). */
function readText(buffer) {
  const text = buffer.toString('utf8').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const pieces = [];
  let heading = null;
  let current = [];
  let section = 0;
  const flush = () => {
    const body = current.join('\n').trim();
    if (body) pieces.push({ location: heading ? `section '${heading}'` : `part ${section || 1}`, text: body });
    current = [];
  };
  for (const line of lines) {
    const match = /^(#{1,6})\s+(.*)$/.exec(line) || /^\*\*(\d+\.\s.*?)\*\*\s*$/.exec(line);
    if (match) {
      flush();
      section += 1;
      heading = (match[2] || match[1]).replace(/\*+/g, '').trim();
    }
    current.push(line);
  }
  flush();
  return pieces;
}

function textOf(node) {
  return node.text.replace(/\s+/g, ' ').trim();
}

/** HTML (and Word, which is converted to HTML first): sections by heading, tables by row. */
function readHtml(input) {
  const root = parse(Buffer.isBuffer(input) ? input.toString('utf8') : input);
  for (const tag of root.querySelectorAll('script, style, nav, noscript')) tag.remove();
  const body = root.querySelector('body') || root;
  const pieces = [];
  let heading = null;
  let buffer = [];
  let tableCount = 0;
  const flush = () => {
    const text = buffer.join('\n').trim();
    if (text) pieces.push({ location: heading ? `section '${heading}'` : 'start of document', text });
    buffer = [];
  };
  const walk = (node) => {
    for (const child of node.childNodes) {
      if (child.nodeType !== 1) {
        const t = child.text.replace(/\s+/g, ' ').trim();
        if (t) buffer.push(t);
        continue;
      }
      const tag = child.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag)) {
        flush();
        heading = textOf(child);
        buffer.push(heading);
      } else if (tag === 'table') {
        flush();
        tableCount += 1;
        const rows = child.querySelectorAll('tr');
        rows.forEach((row, i) => {
          const cells = row.querySelectorAll('th, td').map(textOf);
          if (cells.some(Boolean)) pieces.push({ location: `table ${tableCount}, row ${i + 1}${heading ? ` (section '${heading}')` : ''}`, text: cells.join(' | ') });
        });
      } else if (['p', 'li', 'pre', 'blockquote', 'dt', 'dd', 'caption'].includes(tag)) {
        const t = textOf(child);
        if (t) buffer.push(tag === 'li' ? `- ${t}` : t);
      } else {
        walk(child);
      }
    }
  };
  walk(body);
  flush();
  return pieces;
}

async function readDocx(buffer) {
  const mammoth = require('mammoth');
  const { value } = await mammoth.convertToHtml({ buffer });
  return readHtml(value);
}

/** Excel: one piece per row, with the header row naming each value. */
async function readXlsx(buffer) {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const pieces = [];
  workbook.eachSheet((sheet) => {
    let header = null;
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const values = row.values.slice(1).map((v) => cellText(v));
      if (!values.some(Boolean)) return;
      if (!header) {
        header = values;
        pieces.push({ location: `sheet '${sheet.name}', row ${rowNumber} (header)`, text: values.join(' | ') });
        return;
      }
      const text = values.map((v, i) => (v ? (header[i] ? `${header[i]}: ${v}` : v) : '')).filter(Boolean).join(' | ');
      pieces.push({ location: `sheet '${sheet.name}', row ${rowNumber}`, text });
    });
  });
  return pieces;
}

function cellText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (value.richText) return value.richText.map((r) => r.text).join('').trim();
    if (value.text) return String(value.text).trim();
    if (value.result !== undefined) return String(value.result).trim();
    if (value instanceof Date) return value.toISOString().slice(0, 10);
  }
  return String(value).replace(/\s+/g, ' ').trim();
}

/** PDF: text layer per page. Pages with too little text are returned for the model to read. */
async function readPdf(buffer, minChars = 80) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, isEvalSupported: false });
  const doc = await task.promise;
  const pageCount = doc.numPages;
  const pieces = [];
  const imagePages = [];
  for (let n = 1; n <= doc.numPages; n += 1) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    let text = '';
    for (const item of content.items) text += item.str + (item.hasEOL ? '\n' : ' ');
    text = text.replace(/[ \t]+/g, ' ').replace(/\n\s*/g, '\n').trim();
    if (text.length >= minChars) pieces.push({ location: `page ${n}`, text, page: n });
    else imagePages.push(n);
  }
  await task.destroy();
  return { pieces, imagePages, pageCount };
}

/** One page of a PDF as its own small PDF, to send to the model. */
async function pdfPage(buffer, pageNumber) {
  const { PDFDocument } = require('pdf-lib');
  const source = await PDFDocument.load(buffer);
  const single = await PDFDocument.create();
  const [page] = await single.copyPages(source, [pageNumber - 1]);
  single.addPage(page);
  return Buffer.from(await single.save());
}

module.exports = { readText, readHtml, readDocx, readXlsx, readPdf, pdfPage };
