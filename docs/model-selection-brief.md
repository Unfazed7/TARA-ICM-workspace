# Model selection brief (vendor-neutral)

Purpose: the reference to test candidate models against. Derived from the code and docs on
`deploy/oracle-setup` (llm-client.js, _config/models.json, stage CONTEXT.md files). It describes
the WORK, not a model. Nothing here favours a vendor.

## 1. What the system asks a model to do

The product turns client documents into an ISO/SAE 21434 style threat analysis (TARA) for a web
item. Deterministic engines do the maths; models do the reading and the judgement drafting; a human
reviews each stage.

| Stage | AI task (from models.json task names and stage docs) | Input | Output | What the model must be good at |
|---|---|---|---|---|
| 01 Input normalization | `01-extract-text`, `01-extract-image`, `01-extract-pdf-page`, `01-reconcile-leftovers` | client documents: text, PDF pages, diagrams/images | facts with source references, a document register | long-document reading, **vision** (diagrams, scanned pages), faithful extraction, no invented facts |
| 02 Item definition | `02-build`, `02-generate-questions`, `02-answer-check`, `02-explain` | Stage 01 facts | elements, zones, links, scope decisions, open questions, rationale | structured synthesis, large JSON output (max_tokens 32000), following a schema and domain rules |
| 03 Asset identification | `03-assets` | finalized item definition | assets with CIAAAN properties | domain judgement, consistent rule application |
| 04 Damage analysis | one call per asset x property | assets | damage scenarios | specific, realistic scenarios; no generic filler |
| 05 Threat identification | one threat per damage scenario | damage scenarios | threats | causal reasoning, specificity |
| 06 Attack path modelling | most demanding step (older doc says extended thinking ON) | threats | exactly 5-step attack path + CVSS v3.1 metrics with justification | multi-step reasoning, rule-bound numeric choices |
| 07 Impact analysis | per threat | threats, damage scenarios | 7-dimension impact ratings | calibration and consistency across items |
| 08 Risk scoring | none | | | deterministic only |
| 09 Risk treatment | per risk | risk register, controls catalogue | treatment option + control IDs | choosing only from a given list (no invented IDs) |
| 10 Residual risk | docs say deterministic; models.json has a `10-residual` entry | | | check which is true before choosing |
| Helpers | `review-assistant` (2000 tokens), `02-explain` (4000), `02-answer-check` | short context | short text | cheap, fast, plain-language |

## 2. Hard technical requirements (these decide whether a model can run at all)

The client (`tara-workspace/web-based-tara/stages/llm-client.js`) sends:
1. `response_format: json_schema` with `strict: true` -> the model/provider must support strict structured outputs. Biggest compatibility risk for open models.
2. Up to ~16 nullable/union fields per schema (provider schema-compile limit it already works around).
3. Tool calls (`tools`, `tool_choice`) for some stages.
4. Image input for Stage 01 image/PDF-page extraction.
5. Long output: up to 32k tokens in one reply; streaming is used.
6. One repair retry when the reply does not match the schema, so a model that is right "most of the time" still costs 2x.

Any OpenAI-compatible endpoint works with no code change: `LLM_PROVIDER=openai`, `LLM_BASE_URL=...`,
`LLM_API_KEY=...`, `LLM_MODEL=...`. Per-stage models are allowed by adding `model` to a stage entry in
`_config/models.json`.

## 3. Slots (not models): how many different models you probably need

| Slot | Stages | Needs | Optimise for |
|---|---|---|---|
| A. Reader | 01 | vision + long context + faithful extraction | accuracy of extraction, cost per page |
| B. Analyst | 02-07, 09 | strict JSON schema, domain reasoning, 16-32k output | schema validity, consistency, reasoning quality |
| C. Helper | explain, answer-check, review-assistant, questions | short text | latency and price |

Slot B may split in two (06 reasoning-heavy vs the rest) only if tests show a real gap.

## 4. Success criteria to measure (per candidate, per slot)

- Schema-valid on first try (%), and after the repair retry (%).
- Field accuracy versus analyst-approved output (use the edits analysts already make in the app as gold data).
- Fabrication: invented asset/control IDs, invented source references, facts not in the documents.
- Consistency: same input run 3 times -> how much the answer moves.
- Specificity: generic vs asset-specific damage scenarios and threats (analyst-scored 1-5).
- Refusal rate on security content (attack paths read as sensitive to some models).
- Cost per complete assessment (tokens in/out from the audit log) and wall-clock time.
- Provider stability: rate limits, outages, deprecations.

## 5. Constraints

- Budget: free or near-free for now.
- Data: client architecture documents can be confidential -> check each provider's data retention/training policy; free tiers often log prompts.
- Hosting: the Oracle Micro (1 GB) cannot host a model; any model is called over an API.
- Human review exists at every stage, so a small error rate is tolerable; silent fabrication is not.

## 6. Method

1. Build an eval set: 5-10 real assessments (documents in, analyst-approved stage outputs out).
2. Shortlist 5-8 candidates that pass the section 2 requirements (check supported parameters first).
3. Run each slot's stages on the eval set; record section 4 metrics from `audit/llm-calls.jsonl`.
4. Pick the cheapest model that clears the bar for each slot; re-run when a better one appears.
