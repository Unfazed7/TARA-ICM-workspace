'use strict';

/**
 * Optional hiding of sensitive details before text leaves the machine (spec 19, C4 step 2).
 * Off by default (`_config/redaction.json`). When on, account ids, IP addresses, bucket
 * names, hostnames and names from a local list are swapped for tokens such as [HOST-1],
 * and swapped back in what the model returns. The mapping is written only to the run's
 * output folder, which is git-ignored.
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.resolve(__dirname, '..', '..', '..', '_config', 'redaction.json');

const PATTERNS = [
  ['BUCKET', /\bs3:\/\/[a-z0-9.-]+|\barn:aws:s3:::[a-z0-9.-]+/gi],
  ['ACCOUNT', /\b\d{12}\b/g],
  ['IP', /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g],
  ['HOST', /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|io|internal|local|cloud|dev|app|aws|azure|gcp|corp|lan|co|uk|de|in|eu)\b/gi],
];

function loadConfig(file = process.env.REDACTION_CONFIG || CONFIG_FILE) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return { enabled: false };
  }
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class Redactor {
  constructor(config = loadConfig()) {
    this.enabled = Boolean(config.enabled);
    this.toToken = new Map();
    this.toValue = new Map();
    this.counts = {};
    this.patterns = [...PATTERNS];
    const names = config.names_file && fs.existsSync(config.names_file)
      ? fs.readFileSync(config.names_file, 'utf8').split('\n').map((n) => n.trim()).filter(Boolean)
      : (config.names || []);
    if (names.length) {
      const sorted = [...names].sort((a, b) => b.length - a.length).map(escapeRegex);
      this.patterns.unshift(['NAME', new RegExp(`\\b(?:${sorted.join('|')})\\b`, 'g')]);
    }
  }

  token(kind, value) {
    if (!this.toToken.has(value)) {
      this.counts[kind] = (this.counts[kind] || 0) + 1;
      const token = `[${kind}-${this.counts[kind]}]`;
      this.toToken.set(value, token);
      this.toValue.set(token, value);
    }
    return this.toToken.get(value);
  }

  hide(text) {
    if (!this.enabled || !text) return text;
    let out = text;
    for (const [kind, pattern] of this.patterns) out = out.replace(pattern, (match) => this.token(kind, match));
    return out;
  }

  restore(text) {
    if (!this.enabled || typeof text !== 'string') return text;
    return text.replace(/\[(?:NAME|BUCKET|ACCOUNT|IP|HOST)-\d+\]/g, (token) => this.toValue.get(token) ?? token);
  }

  restoreDeep(value) {
    if (typeof value === 'string') return this.restore(value);
    if (Array.isArray(value)) return value.map((v) => this.restoreDeep(v));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, this.restoreDeep(v)]));
    return value;
  }

  mapping() {
    return Object.fromEntries(this.toValue);
  }
}

module.exports = { Redactor, loadConfig };
