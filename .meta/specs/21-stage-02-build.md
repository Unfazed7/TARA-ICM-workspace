# Spec 21: Stage 02 Item Definition Build

**Status:** approved by the analyst for C8 (2026-10-02).
**Code:** `stages/02-item-definition/` (`agent.js`, `lib/`, `prompts/`), `_engines/item-builder.js`, `_engines/scope-rules.js`
**Decisions:** D-27, D-31 to D-34, D-36, D-37, D-45
**See also:** 12b, 12c (model and questions), 13a, 13b (Rationale), 18 (store), `_config/scoping-facts.md`.

## Goal

Build the Web Item Definition from Stage 01 facts that are not rejected: the model proposes, code checks, applies fixed rules and decides scope from the rules table, which a human refines over time.

## Success Criteria

```bash
node --test tests/stage-02/stage02-build.test.js   # item-01 answer key reproduced; model faked
```

## File Ownership

WILL touch: the Stage 02 folder, the two engines, `scoping-facts.md` (sections 5 and 6: question wording), `models.json` (`02-explain`, prompt versions). WON'T touch: the API, Stage 01.

## Input/Output

Input: a Stage 01 result (`--stage01 <folder>` or the current API run), optional boundary. Output: `item-definition.json` (scope decisions inside), `questions.json`, `rationale.json`, `stage02-log.json`, `new-kinds.log`. `--seed` stores through spec 18.

**Model calls:** `02-build` proposes items by name with cited facts, plus fixed scoping words per element (runs, controls, shared, reachable, data, environments shared, pushes changes) and answered topics; `02-generate-questions` suggests extra questions; `02-answer-check` (one batch) marks questions the facts answer, with a quote; `02-explain` writes the plain reason per scope decision.

## Process

1. Ids by order. Items without a usable fact are dropped (rejected or unknown facts never used).
2. Fixed rules: the zone decides the parent; actors carry no provider, hosting or exposure; exposure `yes` needs evidence, an open exposure disagreement forces `yes` plus an assumption, "internal" without evidence means `no`; one boundary configuration element per network; trust-boundary crossing from zones; no diagram means every link is inferred from text; unknown kinds logged.
3. Starter questions from the trigger table (section 3) for facts still `unknown`, worded from sections 1, 5 and 6; the account container gets FT-01, FT-03, FT-06. Suggestions kept only with a known target and valid fact type or topic. Deduplicate; answer check drops answered ones (quote checked against the cited facts) and records the answer; cap open questions per target (3, 7 for unknown kinds).
4. Scope by code: kind gives rules; supply chain and third parties are interfaces; a shared identity provider is an interface, a dedicated one run by the item team is in scope; actors are interfaces; vehicle side out; unknown kinds ambiguous; the rest in scope. A decision is assumed only when the rule depends on an answer and a linked question is open.
5. Reasons from the model, rejected if they show ids or rule names (template reason instead).
6. Rationale from templates: assumed scope decisions, every other open question once, assumptions, building ambiguities, and one item listing links with unknown authentication or encryption.

## Validation Rules

1. Output is checked against the three schemas; exit code 3 if it fails (files kept for inspection).
2. Only a human edits `scoping-facts.md`; changes are checked against item-01.

## Error Conditions

Build call fails: the stage stops with a clear message. Suggest, answer-check or explain fails: template reasons, questions stay open, one gap item says which steps did not run.

## Verification Steps

```bash
npm test && cd checkpoint-api && python -m pytest
```
