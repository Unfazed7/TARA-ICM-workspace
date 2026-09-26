'use strict';

const fs = require('fs');
const https = require('https');
const path = require('path');
const { URL } = require('url');

const RAW_HOST = 'raw.githubusercontent.com';
const OWNER = 'mukul975';
const REPO = 'Anthropic-Cybersecurity-Skills';
const BRANCH = 'main';
const INDEX_URL = `https://${RAW_HOST}/${OWNER}/${REPO}/${BRANCH}/index.json`;
const OUTPUT_DIR = path.resolve(__dirname, '../.meta/controls');
const REQUEST_TIMEOUT_MS = 8000;
const REQUEST_DELAY_MS = 150;
const MAX_SKILL_BYTES = 50 * 1024;
const KEYWORDS = [
  'auth', 'oauth', 'jwt', 'token', 'session', 'cookie',
  'access', 'rbac', 'permission', 'privilege', 'authoriz',
  'api', 'endpoint', 'gateway',
  'encrypt', 'tls', 'ssl', 'certificate', 'cryptograph',
  'log', 'monitor', 'audit', 'detect', 'alert', 'siem',
  'input', 'validat', 'sanitiz', 'xss', 'injection', 'csrf',
  'secure', 'harden', 'protect',
  'mfa', 'credential', 'password', 'identity', 'saml', 'oidc',
  'cors', 'header', 'csp', 'firewall', 'waf',
  'web', 'http', 'https'
];
const TREATMENT_FUNCTIONS = new Set(['PR', 'DE', 'RS']);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertRawGithubUrl(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' || parsed.hostname !== RAW_HOST) {
    throw new Error(`Refusing non-raw.githubusercontent.com URL: ${value}`);
  }
}

function fetchText(url) {
  assertRawGithubUrl(url);
  return new Promise((resolve) => {
    const request = https.get(url, { timeout: REQUEST_TIMEOUT_MS }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const contentType = response.headers['content-type'] || '';
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          statusCode: response.statusCode,
          contentType,
          body: Buffer.concat(chunks).toString('utf8')
        });
      });
    });

    request.on('timeout', () => {
      request.destroy();
      resolve({ ok: false, statusCode: 0, contentType: '', body: '', timeout: true });
    });
    request.on('error', (error) => {
      resolve({ ok: false, statusCode: 0, contentType: '', body: '', error });
    });
  });
}

function isPlainText(contentType) {
  return !contentType || contentType.toLowerCase().startsWith('text/');
}

function candidateMatches(skill) {
  const haystack = `${skill.name || ''} ${skill.description || ''}`.toLowerCase();
  return KEYWORDS.some((keyword) => haystack.includes(keyword));
}

function normalizeSkillPath(skill) {
  return skill.path || `skills/${skill.name}`;
}

function skillRawUrl(name) {
  const encodedName = String(name).split('/').map(encodeURIComponent).join('/');
  return `https://${RAW_HOST}/${OWNER}/${REPO}/${BRANCH}/skills/${encodedName}/SKILL.md`;
}

function skillGithubUrl(name) {
  const encodedName = String(name).split('/').map(encodeURIComponent).join('/');
  return `https://github.com/${OWNER}/${REPO}/tree/${BRANCH}/skills/${encodedName}`;
}

function parseYamlScalar(value) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((part) => part.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  }
  return trimmed.replace(/^["']|["']$/g, '');
}

function parseFrontmatter(content) {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  if (lines[0] !== '---') return null;

  const endIndex = lines.indexOf('---', 1);
  if (endIndex === -1) return null;

  const fields = {};
  let currentKey = null;
  for (const rawLine of lines.slice(1, endIndex)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('- ') && currentKey) {
      if (!Array.isArray(fields[currentKey])) fields[currentKey] = [];
      fields[currentKey].push(parseYamlScalar(trimmed.slice(2)));
      continue;
    }

    const keyMatch = rawLine.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (keyMatch) {
      const key = keyMatch[1].trim();
      const value = keyMatch[2].trim();
      currentKey = ['name', 'description', 'domain', 'subdomain', 'tags', 'nist_csf', 'mitre_attack'].includes(key)
        ? key
        : null;
      if (!currentKey) continue;
      fields[key] = parseYamlScalar(value);
      continue;
    }

    if (currentKey && typeof fields[currentKey] === 'string') {
      fields[currentKey] = `${fields[currentKey]} ${trimmed}`.trim();
    }
  }
  return fields;
}

function asArray(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function csfFunctions(nistCsf) {
  return [...new Set(
    nistCsf
      .map((ref) => ref.split('.')[0])
      .filter((prefix) => TREATMENT_FUNCTIONS.has(prefix))
  )].sort();
}

function writeJson(fileName, value) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const summary = {
    run_timestamp: new Date().toISOString(),
    total_skills_in_index: 0,
    keyword_candidates: 0,
    fetch_succeeded: 0,
    fetch_failed: 0,
    fetch_skipped_no_frontmatter: 0,
    fetch_skipped_no_nist_csf: 0,
    treatment_candidates_final: 0,
    csf_breakdown: {
      PR: 0,
      DE: 0,
      RS: 0
    }
  };

  const indexResponse = await fetchText(INDEX_URL);
  if (!indexResponse.ok) {
    throw new Error(`Failed to fetch skill index: HTTP ${indexResponse.statusCode}`);
  }

  const index = JSON.parse(indexResponse.body);
  const skills = Array.isArray(index.skills) ? index.skills : [];
  summary.total_skills_in_index = skills.length;

  const candidates = skills
    .filter(candidateMatches)
    .map((skill) => ({
      name: skill.name,
      description: skill.description || '',
      path: normalizeSkillPath(skill)
    }));

  summary.keyword_candidates = candidates.length;
  writeJson('01-candidates.json', candidates);

  const treatmentCandidates = [];
  for (const candidate of candidates) {
    await delay(REQUEST_DELAY_MS);
    const url = skillRawUrl(candidate.name);
    const response = await fetchText(url);

    if (!response.ok || !isPlainText(response.contentType) || Buffer.byteLength(response.body, 'utf8') >= MAX_SKILL_BYTES) {
      summary.fetch_failed += 1;
      const reason = response.timeout ? 'timeout' : response.error ? response.error.message : `HTTP ${response.statusCode}`;
      console.error(`Skipping ${candidate.name}: ${reason}`);
      continue;
    }

    const frontmatter = parseFrontmatter(response.body);
    if (!frontmatter) {
      summary.fetch_skipped_no_frontmatter += 1;
      console.error(`Skipping ${candidate.name}: missing SKILL.md frontmatter`);
      continue;
    }

    summary.fetch_succeeded += 1;
    const nistCsf = asArray(frontmatter.nist_csf);
    if (nistCsf.length === 0) {
      summary.fetch_skipped_no_nist_csf += 1;
      continue;
    }

    const functions = csfFunctions(nistCsf);
    if (functions.length === 0) continue;

    for (const fn of functions) summary.csf_breakdown[fn] += 1;
    treatmentCandidates.push({
      name: frontmatter.name || candidate.name,
      description: frontmatter.description || candidate.description,
      subdomain: frontmatter.subdomain || '',
      nist_csf: nistCsf,
      mitre_attack: asArray(frontmatter.mitre_attack),
      csf_functions: functions,
      skill_url: skillGithubUrl(candidate.name)
    });
  }

  summary.treatment_candidates_final = treatmentCandidates.length;
  writeJson('02-treatment-candidates.json', treatmentCandidates);
  writeJson('03-enumeration-summary.json', summary);
  console.log(`Enumerated ${treatmentCandidates.length} treatment candidates from ${candidates.length} keyword candidates.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
