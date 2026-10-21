'use strict';

/**
 * The topic an Assumption is grouped under on screen (spec 23). Set by code from the
 * template that writes the item, never by a model.
 */

const TOPICS = ['exposure', 'sign_in', 'scope', 'environment', 'data', 'naming', 'reading'];

const ASPECT_TOPIC = {
  exposure: 'exposure', existence: 'scope', environment: 'environment', ownership: 'scope',
  authentication: 'sign_in', encryption: 'data', size: 'scope', count: 'scope', version: 'scope',
  naming: 'naming', other: 'scope',
};

const TEXT_RULES = [
  [/internet|exposed|public|entry point|reachable/i, 'exposure'],
  [/authenticat|sign[- ]?in|log[- ]?in|token|credential|password|admin device|identity|sso/i, 'sign_in'],
  [/environment|production|staging|\bdev\b/i, 'environment'],
  [/data|record|audit|log|cache|database|stor|encrypt|key|secret|backup/i, 'data'],
];

function topicForAspect(aspect) {
  return ASPECT_TOPIC[aspect] || 'scope';
}

function topicForText(text, fallback = 'scope') {
  const hit = TEXT_RULES.find(([re]) => re.test(String(text || '')));
  return hit ? hit[1] : fallback;
}

module.exports = { TOPICS, topicForAspect, topicForText };
