'use strict';

/**
 * draw.io reader (spec 19, DR-17). No model: shapes, containment and arrows come
 * straight from the XML. Containment is taken from the parent attribute when a shape
 * sits in a group or container, else from geometry (the smallest labelled box that
 * fully holds the shape). Unlabelled boxes are never zones.
 */

const zlib = require('zlib');
const { XMLParser } = require('fast-xml-parser');

const ENVIRONMENT_WORDS = [
  ['prod', /\b(prod|production)\b/i],
  ['staging', /\b(staging|stage|pre-?prod)\b/i],
  ['dev', /\b(dev|development|test)\b/i],
];

function cleanLabel(value) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeDiagram(diagram) {
  if (diagram.mxGraphModel) return diagram.mxGraphModel;
  const text = typeof diagram === 'string' ? diagram : diagram['#text'];
  if (!text || !text.trim()) return null;
  const inflated = zlib.inflateRawSync(Buffer.from(text.trim(), 'base64')).toString('utf8');
  const xml = decodeURIComponent(inflated);
  return parser().parse(xml).mxGraphModel;
}

function parser() {
  return new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', isArray: (name) => ['diagram', 'mxCell', 'object', 'UserObject'].includes(name) });
}

function asCells(root) {
  const cells = [];
  for (const cell of root.mxCell || []) cells.push(cell);
  // Shapes with custom properties are wrapped in <object> or <UserObject>.
  for (const wrapper of [...(root.object || []), ...(root.UserObject || [])]) {
    const inner = Array.isArray(wrapper.mxCell) ? wrapper.mxCell[0] : wrapper.mxCell;
    if (inner) cells.push({ ...inner, id: wrapper.id, value: wrapper.label ?? inner.value });
  }
  return cells;
}

function geometry(cell) {
  const g = cell.mxGeometry || {};
  return { x: Number(g.x || 0), y: Number(g.y || 0), w: Number(g.width || 0), h: Number(g.height || 0) };
}

function absolute(cell, byId) {
  const g = geometry(cell);
  let parent = byId.get(cell.parent);
  while (parent && parent.vertex === '1') {
    const pg = geometry(parent);
    g.x += pg.x;
    g.y += pg.y;
    parent = byId.get(parent.parent);
  }
  return g;
}

function inside(a, b) {
  return a !== b && a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h && b.w * b.h > a.w * a.h;
}

function environmentOf(text) {
  for (const [env, pattern] of ENVIRONMENT_WORDS) if (pattern.test(text)) return env;
  return null;
}

function readPage(model, pageNumber) {
  const cells = asCells(model.root || {});
  const byId = new Map(cells.map((c) => [c.id, c]));
  const vertices = cells.filter((c) => c.vertex === '1');
  const texts = vertices.filter((c) => /^text;/.test(c.style || '') && cleanLabel(c.value));
  const shapes = vertices
    .filter((c) => !texts.includes(c))
    .map((c) => ({ id: c.id, label: cleanLabel(c.value), style: c.style || '', box: absolute(c, byId), parent: c.parent }));
  const labelled = shapes.filter((s) => s.label);
  const unlabelledBoxes = shapes.filter((s) => !s.label && labelled.some((l) => inside(l.box, s.box)));

  for (const shape of labelled) {
    const holders = labelled.filter((other) => inside(shape.box, other.box)).sort((a, b) => a.box.w * a.box.h - b.box.w * b.box.h);
    shape.inside = holders.map((h) => h.label);
    shape.isContainer = labelled.some((other) => inside(other.box, shape.box));
    shape.isActor = /shape=umlActor/.test(shape.style);
  }

  const labelById = new Map(shapes.map((s) => [s.id, s.label]));
  const arrows = cells
    .filter((c) => c.edge === '1')
    .map((c) => ({ id: c.id, from: labelById.get(c.source) || '', to: labelById.get(c.target) || '', label: cleanLabel(c.value) }));

  return { page: pageNumber, title: texts.map((t) => cleanLabel(t.value)), shapes: labelled, unlabelledBoxes, arrows };
}

/** Parses a draw.io file into pages of shapes and arrows. Throws on unreadable XML. */
function parseDrawio(buffer) {
  const doc = parser().parse(buffer.toString('utf8'));
  if (!doc.mxfile && !doc.mxGraphModel) throw new Error('not a draw.io file (no mxfile element)');
  const diagrams = doc.mxfile ? doc.mxfile.diagram || [] : [{ mxGraphModel: doc.mxGraphModel }];
  return diagrams.map((d, i) => {
    const model = decodeDiagram(d);
    return model ? readPage(model, i + 1) : { page: i + 1, title: [], shapes: [], unlabelledBoxes: [], arrows: [] };
  });
}

function arrowQuote(arrow) {
  return arrow.label ? `${arrow.from} -> ${arrow.to} (${arrow.label})` : `${arrow.from} -> ${arrow.to} (unlabelled arrow)`;
}

/**
 * Facts written by code from a parsed diagram. Each fact has one source reference;
 * C5 merges them with facts from other documents.
 */
function drawioFacts(pages, docId) {
  const facts = [];
  const add = (fact) => facts.push({ confidence: 'high', ...fact });
  for (const page of pages) {
    const p = `page ${page.page}`;
    for (const title of page.title) {
      const env = environmentOf(title);
      if (env) add({ subject: 'Environment', fact_type: 'environment', value: `The diagram title names the ${env} environment`, source: { doc_id: docId, location: `${p}, title`, quote: title } });
    }
    for (const shape of page.shapes) {
      const where = shape.inside.length ? ` inside ${shape.inside.map((l) => `'${l}'`).join(', ')}` : '';
      add({
        subject: shape.label,
        fact_type: shape.isActor ? 'actor' : 'component_exists',
        value: shape.isActor ? `'${shape.label}' is drawn as an actor${where}` : `'${shape.label}' is drawn${where}${shape.isContainer ? ' and contains other shapes' : ''}`,
        source: { doc_id: docId, location: `${p}, shape '${shape.label}'`, quote: shape.label },
      });
    }
    for (const arrow of page.arrows) {
      if (!arrow.from || !arrow.to) continue;
      add({
        subject: arrow.from,
        fact_type: 'link_exists',
        value: arrow.label ? `An arrow labelled '${arrow.label}' goes from '${arrow.from}' to '${arrow.to}'` : `An unlabelled arrow goes from '${arrow.from}' to '${arrow.to}'`,
        source: { doc_id: docId, location: `${p}, arrow from '${arrow.from}' to '${arrow.to}'`, quote: arrowQuote(arrow) },
      });
    }
  }
  return facts;
}

function drawioSummary(pages) {
  const titles = pages.flatMap((p) => p.title);
  const environments = [...new Set(titles.map(environmentOf).filter(Boolean))];
  const ignored = [];
  const unlabelledBoxes = pages.reduce((n, p) => n + p.unlabelledBoxes.length, 0);
  if (unlabelledBoxes) ignored.push(`${unlabelledBoxes} unlabelled box(es) around other shapes not used as zones: no label, and a drawn box is a zone only if labelled or confirmed by text.`);
  const arrows = pages.flatMap((p) => p.arrows);
  if (arrows.length && arrows.every((a) => !a.label)) ignored.push('Arrows have no labels, so no protocol was read from them.');
  const dangling = arrows.filter((a) => !a.from || !a.to).length;
  if (dangling) ignored.push(`${dangling} arrow(s) not attached to a shape at one end were ignored.`);
  return {
    title: titles[0] || null,
    environment: environments.length === 1 ? environments[0] : null,
    environment_quote: environments.length === 1 ? titles.find((t) => environmentOf(t)) : null,
    used_for: 'Components, containment and arrows',
    ignored_and_why: ignored.join(' '),
    labels: pages.flatMap((p) => p.shapes.map((s) => s.label)),
  };
}

module.exports = { parseDrawio, drawioFacts, drawioSummary, cleanLabel, environmentOf };
