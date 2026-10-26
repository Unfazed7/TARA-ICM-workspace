// Item Definition layout engine (D-51, spec 24): checks that hold for any item definition.
// Runs the TypeScript engine directly (Node strips the types).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const here = __dirname;
const EXTERNAL = ['internet_external', 'corporate_it', 'third_party_saas', 'vehicle_field_device'];

// Every item definition fixture we have. Add new ones here as they arrive.
const FIXTURES = [{ name: 'item-01', file: 'fixtures/synthetic/item-01/expected/item-definition.json', maxCrossings: 1 }];

for (const fx of FIXTURES) test(`layout engine on ${fx.name}`, async (t) => {
  const engine = await import(path.join(here, '../frontend/src/components/stages/diagram/engine.ts'));
  const { findCrossings, findOverlaps } = await import(path.join(here, '../frontend/src/components/stages/diagram/route.ts'));
  const def = JSON.parse(fs.readFileSync(path.join(here, fx.file), 'utf8'));
  const result = engine.buildDiagram(def, EXTERNAL);
  const { layout, routes, crossings } = result;
  const nodeById = new Map(layout.nodes.map((n) => [n.id, n]));
  const inside = (n, b) => n.x >= b.x && n.y >= b.y && n.x + n.w <= b.x + b.w && n.y + n.h <= b.y + b.h;

  await t.test(`${fx.name}: every component is drawn once, inside the canvas`, () => {
    assert.equal(layout.nodes.length, def.elements.length);
    assert.equal(nodeById.size, def.elements.length);
    for (const n of layout.nodes) assert.ok(n.x >= 0 && n.y >= 0 && n.x + n.w <= layout.width && n.y + n.h <= layout.height, n.id);
  });

  await t.test(`${fx.name}: components never overlap`, () => {
    const ns = layout.nodes;
    for (let i = 0; i < ns.length; i++)
      for (let j = i + 1; j < ns.length; j++) {
        const a = ns[i], b = ns[j];
        assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${a.id} overlaps ${b.id}`);
      }
  });

  await t.test(`${fx.name}: every component sits inside the box of its container or zone`, () => {
    for (const e of def.elements) {
      const n = nodeById.get(e.element_id);
      const source = e.parent_container_id && def.containers.some((c) => c.container_id === e.parent_container_id) ? e.parent_container_id : e.zone_id;
      const boxes = layout.boxes.filter((b) => b.source === source);
      if (!boxes.length) continue; // a zone drawn only through its containers
      assert.ok(boxes.some((b) => inside(n, b)), `${e.element_id} is outside every box of ${source}`);
    }
  });

  await t.test(`${fx.name}: boxes nest and never cut through a component they do not hold`, () => {
    for (const b of layout.boxes)
      for (const n of layout.nodes) {
        const cut = n.x < b.x + b.w && n.x + n.w > b.x && n.y < b.y + b.h && n.y + n.h > b.y;
        if (cut) assert.ok(inside(n, b), `${b.id} cuts through ${n.id}`);
      }
  });

  await t.test(`${fx.name}: every connection is drawn with right angles, from border to border`, () => {
    assert.equal(routes.length, def.links.filter((l) => l.source_id !== l.destination_id).length);
    for (const r of routes) {
      const l = def.links.find((x) => x.link_id === r.id);
      for (let i = 0; i < r.points.length - 1; i++) {
        const [a, b] = [r.points[i], r.points[i + 1]];
        assert.ok(a[0] === b[0] || a[1] === b[1], `${r.id} has a slanted segment`);
      }
      for (const [pt, id] of [[r.points[0], l.source_id], [r.points.at(-1), l.destination_id]]) {
        const n = nodeById.get(id);
        const onX = (pt[0] === n.x || pt[0] === n.x + n.w) && pt[1] >= n.y && pt[1] <= n.y + n.h;
        const onY = (pt[1] === n.y || pt[1] === n.y + n.h) && pt[0] >= n.x && pt[0] <= n.x + n.w;
        assert.ok(onX || onY, `${r.id} does not start or end on ${id}`);
      }
    }
  });

  await t.test(`${fx.name}: connections never pass through a component or run on top of each other`, () => {
    for (const r of routes) {
      const l = def.links.find((x) => x.link_id === r.id);
      for (let i = 0; i < r.points.length - 1; i++) {
        const [a, b] = [r.points[i], r.points[i + 1]];
        for (const n of layout.nodes) {
          if (n.id === l.source_id || n.id === l.destination_id) continue;
          const hit = Math.min(a[0], b[0]) < n.x + n.w && Math.max(a[0], b[0]) > n.x && Math.min(a[1], b[1]) < n.y + n.h && Math.max(a[1], b[1]) > n.y;
          assert.ok(!hit, `${r.id} passes through ${n.id}`);
        }
      }
    }
    assert.deepEqual(findOverlaps(routes), []);
  });

  await t.test(`${fx.name}: crossings are reported truthfully and stay at or below ${fx.maxCrossings}`, () => {
    assert.equal(crossings.length, findCrossings(routes).length);
    assert.ok(crossings.length <= fx.maxCrossings, `${crossings.length} crossings`);
  });

  await t.test(`${fx.name}: the same input gives the same picture`, () => {
    const again = engine.buildDiagram(def, EXTERNAL);
    assert.deepEqual(again.layout.nodes, layout.nodes);
    assert.deepEqual(again.routes, routes);
  });
});
