'use strict';

// Agent tests for the legacy stages mock Anthropic-format responses, so they pin the
// legacy anthropic provider and send audit records to a temporary file.
const os = require('os');
const path = require('path');

process.env.LLM_PROVIDER = 'anthropic';
process.env.LLM_AUDIT_FILE = path.join(os.tmpdir(), `tara-llm-audit-${process.pid}.jsonl`);
