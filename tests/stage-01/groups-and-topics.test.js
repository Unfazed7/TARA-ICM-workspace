'use strict';

/** Spec 23: an Other document counts for the group it was added in; every Assumption has a topic. */

const test = require('node:test');
const assert = require('node:assert');
const { missingInput } = require('../../tara-workspace/web-based-tara/stages/01-input-normalization/lib/minimum-input');
const { topicForAspect, topicForText, TOPICS } = require('../../tara-workspace/web-based-tara/_engines/topics');

const BOUNDARY = 'The key and certificate portal and everything in its cloud account.';

test('an Other document counts for the group it was added in', () => {
  const docs = [
    { doc_id: 'DOC-01', client_doc_ref: 'policy.pdf', doc_type: 'other' },
    { doc_id: 'DOC-02', client_doc_ref: 'answers.md', doc_type: 'qa' },
  ];
  assert.equal(missingInput(BOUNDARY, docs).length, 1);
  assert.deepEqual(missingInput(BOUNDARY, docs, { 'DOC-01': 'components' }), []);
});

test('a failed document does not count, whatever its group', () => {
  const docs = [
    { doc_id: 'DOC-01', doc_type: 'other', read_status: 'failed' },
    { doc_id: 'DOC-02', doc_type: 'qa' },
  ];
  assert.equal(missingInput(BOUNDARY, docs, { 'DOC-01': 'components' }).length, 1);
});

test('topics come from fixed tables, never free text', () => {
  assert.equal(topicForAspect('exposure'), 'exposure');
  assert.equal(topicForAspect('authentication'), 'sign_in');
  assert.equal(topicForAspect('something new'), 'scope');
  assert.equal(topicForText('Which devices do admins use to sign in?'), 'sign_in');
  assert.equal(topicForText('Is the load balancer reachable from the internet?'), 'exposure');
  assert.equal(topicForText('Who can delete audit records?'), 'data');
  for (const t of ['exposure', 'sign_in', 'scope', 'environment', 'data', 'naming', 'reading']) assert.ok(TOPICS.includes(t));
});
