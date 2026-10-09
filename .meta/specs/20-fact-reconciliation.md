# Spec 20: Fact Reconciliation (Stage 01)

**Status:** approved by the analyst for C5 (2026-10-02).
**Code:** `tara-workspace/web-based-tara/_engines/fact-reconcile.js`, prompt `stages/01-input-normalization/prompts/compare-facts.md`
**Decisions:** D-07, D-28, D-33, D-37, D-44
**See also:** 12a (facts and conflicts), 13a and 13b (Rationale and defaults), 19 (reading).

## Goal

Turn per-document facts into one fact per statement with all its sources, find disagreements between documents, apply the default for each, label every fact, and write a Rationale item per conflict.

## Success Criteria

```bash
node --test tests/stage-01/reconcile.test.js   # item-01 answer key reproduced from split facts; model faked
```

## File Ownership

WILL touch: the engine, the prompt, Stage 01 `agent.js` (runs it after reading), `models.json` (`compare-v1`). WON'T touch: the API, Stage 02.

## Input/Output

Input: register, raw facts (`facts.raw.json`), reading Rationale. Output: `facts.json` (`{facts, conflicts}`), `rationale.json` (numbering continued), `fact-merge-map.json`, `reconcile-log.json`, `new-conflict-kinds.log`.

**One model call** (`01-reconcile-leftovers`) returns `same_names` (with why), `duplicates`, and `conflicts` with kind, aspect, subject and sides. Each side gives its fact ids and a fixed `reading`: exposure `exposed`/`not_exposed`; existence `exists`/`absent`; environment `prod`/`staging`/`dev`/`unknown`; ownership `item_team`/`other_party`; authentication or encryption `none`/`present`; else `stated`.

## Process

1. **Check the reply:** unknown ids, mixed-type duplicates, and conflicts without two sides from two documents are dropped and logged; an unknown kind becomes `other`.
2. **Same names:** the name from the higher-ranked document (newer within a rank) wins; the other names' facts take it. The losing existence fact is `rejected`; one auto-resolved `naming` conflict with an information Rationale item (D-44).
3. **Duplicates** of the same fact type, and existence facts with the same name, become one fact; value and subject from the best source; all sources kept.
4. **Defaults (13b), by reading:** exposed, exists, `prod`, item team, `none`. `naming`, `instance_size`, `count`, `version` take the higher rank and auto-resolve with losers kept, unless the higher-ranked document is older (`older_higher_precedence`, needs attention). Otherwise the higher rank is used, the item needs attention and says "I could not tell which option is safer"; `other` is logged as a new kind.
5. **Labels:** `needs_you` when in an open conflict; `agreed` with sources from two or more documents; else `single_source`.
6. **Rationale** from templates: both sides by document name, each side's quotes, the default, what would change it. No ids or rule names in the text.

## Validation Rules

1. The model never chooses a default or attention level; code does.
2. Every id in the output exists; conflicts have two or more facts.

## Error Conditions

Model error or refusal: existence facts with the same name and type are still joined, no conflicts are reported, and a needs-attention gap item says the documents were not compared. The run continues.

## Verification Steps

```bash
npm test
```
