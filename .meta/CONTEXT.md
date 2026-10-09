# TARA ICM Workspace: Routing

Layer 1 routing for the meta-workspace (`.meta/`). It points to the right file; it does not track status. Task status lives only in `.meta/REBUILD-PROGRESS.md`.

Scope: Web-Based Automotive Application TARA, MVP phase.
Architecture: one folder per TARA type (`web-based-tara/`, `vehicle-domain-tara/`, `ecu-component-tara/`).

---

## If you want to...

| Want to | Go to |
|---|---|
| Know the rules, roles and where specs live | `.meta/CLAUDE.md` |
| Know what to do next | `.meta/REBUILD-PROGRESS.md`, then the task in `.meta/CLAUDE-CODE-INSTRUCTIONS.md` |
| Understand why something was decided | `.meta/DECISIONS.md` |
| Look up a term | `CONTEXT.md` (repo root) |
| Read the analyst's answers on the Web Item Definition | `.meta/web-item-definition-questions.md` |
| Read or write a spec | `.meta/specs/` (register in `.meta/CLAUDE.md`) |
| See which files still describe the old flow | `.meta/STALE-INVENTORY.md` |
| Check public repo hygiene findings | `.meta/HYGIENE-REPORT.md` |

---

## Runtime workspace

| Want to | Go to |
|---|---|
| Web TARA identity and rules (Layer 0) | `tara-workspace/web-based-tara/CLAUDE.md` |
| Web TARA stage routing (Layer 1) | `tara-workspace/web-based-tara/CONTEXT.md` |
| A stage's instructions (Layer 2) | `tara-workspace/web-based-tara/stages/<NN>-<name>/CONTEXT.md` |
| Domain knowledge (Layer 3) | `tara-workspace/web-based-tara/_config/` |
| Model access | `tara-workspace/web-based-tara/stages/llm-client.js` |
| Store and API | `checkpoint-api/` |
