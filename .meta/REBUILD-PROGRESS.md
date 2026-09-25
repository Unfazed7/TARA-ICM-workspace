# Rebuild Progress

Tracks tasks from `.meta/CLAUDE-CODE-INSTRUCTIONS.md`. Status values: `pending`, `done`, `blocked`, `waiting-gate`.

| Task | Status | Date | Commit | Notes |
|---|---|---|---|---|
| A0 | done | 2026-09-25 | db847ec, then the commit that adds this row | Instructions and questions file replaced with the analyst's latest versions. Questions file now has sections A to O, including K. Local branch `claude-work` pushes to `claude` (accepted by analyst). Test dependencies to be installed before the first code task (accepted by analyst). |
| A1 | done | 2026-09-25 | 7c8a9cb | `.meta/STALE-INVENTORY.md`: 70 files, 7 governance conflicts. Gate: analyst approved all proposed actions. Decisions: `vehicle_type` becomes optional (record in A3, apply in C3 and C7); `scripts/demo-run.js` path updated in A6, deleted in C14. |
| A2 | done | 2026-09-25 | c2eb2e4, then the commit that adds this row | Gate: workbooks kept (open source), `taraAssets.ts` kept, lock file removed, placeholder emails moved to `example.com`. Test baseline recorded: `npm test` 61/66 (5 pre-existing failures: tests expect the old "ANTHROPIC_API_KEY is required" message, fixed with `llm-client.js` in C1); `pytest` 25/25 (run in a virtualenv, the system Python has a cryptography package conflict). |
| A3 | done | 2026-09-25 | b106838, then the commit that adds this row | `.meta/DECISIONS.md`: D-01 to D-26, all accepted. Gate: D-14 approved; D-17 accepted with Qwen discarded (its docs and folder are removed in A5, not superseded). |
| A4 | done | 2026-09-25 | the commit that adds this row | Root `CONTEXT.md` rewritten: 26 terms (16 new, including Asset), new flow and no-re-reading rules in Relationships, history of the Input Normalization meaning in Flagged ambiguities. Also removed existing em dashes (W1) and corrected the Item clause reference from 15.3 to 9.3. |
| A5 | done | 2026-09-25 | the commit that adds this row | `.meta/CLAUDE.md` is the one current governance document (roles, spec register, stage folders after A6). Qwen material removed per D-17: `.meta/WORKFLOW.md`, `Agents/Qwen/`, and the Qwen-era onboarding docs `.meta/DELIVERY-SUMMARY.md`, `.meta/SPEC-ENGINE-INITIALIZATION.md`, `.meta/YOUR-ACTION-CHECKLIST.md` (inventory had proposed superseding the first two; changed to removal by D-17). Codex docs, codex briefs, `Agents/Claude/REVIEW-PROTOCOL.md` (inventory said update; superseded because it reviews Codex work) and `AEGIS-STAGE1-INTEGRATION.md` superseded. `Agents/claude/` merged into `Agents/Claude/` (G3). `.meta/CONTEXT.md` is routing only, status now lives only here (G5). Spec numbering explained in the register (G6). Personal name replaced with "the analyst" in current docs; superseded docs keep it untouched per R6. |
| A6 | done | 2026-09-25 | the commit that adds this row | Stages renumbered 01 to 10 with `git mv`; legacy agents moved to `01-input-normalization/legacy/agent.csv-mode.js` and `02-item-definition/legacy/agent.v1.js` with superseded headers; `tara-workspace/stages/` removed; `03-asset-identification/` placeholder created. Schemas and fixtures renamed +2, all references updated. Tests unchanged from baseline: `npm test` 61/66 (same 5 known failures), `pytest` 25/25; `validate-all.js` and `validate-chain.js` pass on fixtures. Notes: (1) API stage numbers 1 to 7 kept (changing them is logic, for C13); `pipeline_runner.py` maps them to the new folders, runs the legacy CSV agent for API stage 1 and writes its asset register to Stage 03's output, where Stage 04 now reads it. (2) Also fixed old folder paths in the stage 05 to 10 `CONTEXT.md` files (not in the A1 list, needed for the grep check). (3) Pre-existing: `pipeline_runner.py` passes `--csv` to the legacy agent, which expects `--input` and `--mode`, so API stage 1 was already broken before A6; not fixed here. (4) Old folder names remain only in history docs, superseded docs, and files scheduled for A7 (`web-based-tara/CONTEXT.md`, `WEB-TARA-MVP-ARCHITECTURE.md`) and B1 (`10-backend-api.md`, `item-definition-agent.md`); a comment in `frontend/src/types/item-definition.ts` is left for C9. |
| A7 | done | 2026-09-25 | the commit that adds this row | Layer 0 (`web-based-tara/CLAUDE.md`), Layer 1 (`web-based-tara/CONTEXT.md`) and Layer 2 for stages 01, 02 (new) and 03 rewritten for the new flow; dispatcher `tara-workspace/CONTEXT.md` stage count updated. Routing table matches DR-1; every DR-2, DR-3, DR-8 and DR-9 rule appears in the Stage 01 or 02 `CONTEXT.md`. ID table kept with a note that B1 replaces it. Also, per the approved A1 inventory: `WEB-TARA-MVP-ARCHITECTURE.md` and `docs/ARCHITECTURE.md` superseded, `docs/README.md` rewritten (it had non-existent npm scripts, wrong ISO clause numbers and an Anthropic model). Stage 09 config list corrected to what its agent actually loads (`controls-catalogue.md`, `web-tara-constraints.md`). Docs only, no code changed. |
| B1 | waiting-gate | 2026-09-25 | the commit that adds this row | Specs 12a to 12d written (each under 800 tokens). Four schemas in `src/schemas/` (`stage-01-document-register`, `stage-01-facts`, `stage-02-item-definition`, `stage-02-questions`) with synthetic valid fixtures and 8 invalid fixtures, each failing for exactly its intended reason. Refusal rules: R-01, R-03, R-05, R-08 proved by fixtures; R-02, R-04, R-06, R-07, R-09 to R-12 planned as C3 API tests. ID conventions added to `web-based-tara/CONTEXT.md`. Old specs `01-input-normalization-agent.md` and `item-definition-agent.md` superseded; `00-json-schema-contracts.md` given a renumbering note. Found and fixed: `npm test` never ran `tests/schemas.test.js` (shell `**` glob); now 92 tests, 87 pass, same 5 known failures. `pytest` 25/25. Open point for analyst: external elements without a parent container (spec 12b rule 5). |
| B2 | pending | | | |
| B3 | pending | | | |
| B4 | pending | | | |
| B5 | pending | | | |
| B6 | pending | | | |
| B7 | pending | | | |
| C1 | pending | | | |
| C2 | pending | | | |
| C3 | pending | | | |
| C4 | pending | | | |
| C5 | pending | | | |
| C6 | pending | | | |
| C7 | pending | | | |
| C8 | pending | | | |
| C9 | pending | | | |
| C10 | pending | | | |
| C11 | pending | | | |
| C12 | pending | | | |
| C13 | pending | | | |
| C14 | pending | | | |
