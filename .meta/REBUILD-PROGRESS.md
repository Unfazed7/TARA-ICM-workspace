# Rebuild Progress

Tracks tasks from `.meta/CLAUDE-CODE-INSTRUCTIONS.md`. Status values: `pending`, `done`, `blocked`, `waiting-gate`.

| Task | Status | Date | Commit | Notes |
|---|---|---|---|---|
| A0 | done | 2026-09-25 | db847ec, then the commit that adds this row | Instructions and questions file replaced with the analyst's latest versions. Questions file now has sections A to O, including K. Local branch `claude-work` pushes to `claude` (accepted by analyst). Test dependencies to be installed before the first code task (accepted by analyst). |
| A1 | done | 2026-09-25 | 7c8a9cb | `.meta/STALE-INVENTORY.md`: 70 files, 7 governance conflicts. Gate: analyst approved all proposed actions. Decisions: `vehicle_type` becomes optional (record in A3, apply in C3 and C7); `scripts/demo-run.js` path updated in A6, deleted in C14. |
| A2 | done | 2026-09-25 | c2eb2e4, then the commit that adds this row | Gate: workbooks kept (open source), `taraAssets.ts` kept, lock file removed, placeholder emails moved to `example.com`. Test baseline recorded: `npm test` 61/66 (5 pre-existing failures: tests expect the old "ANTHROPIC_API_KEY is required" message, fixed with `llm-client.js` in C1); `pytest` 25/25 (run in a virtualenv, the system Python has a cryptography package conflict). |
| A3 | done | 2026-09-25 | b106838, then the commit that adds this row | `.meta/DECISIONS.md`: D-01 to D-26, all accepted. Gate: D-14 approved; D-17 accepted with Qwen discarded (its docs and folder are removed in A5, not superseded). |
| A4 | pending | | | |
| A5 | pending | | | |
| A6 | pending | | | |
| A7 | pending | | | |
| B1 | pending | | | |
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
