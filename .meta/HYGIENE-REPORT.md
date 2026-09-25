# Public Repo Hygiene Report

Task A2 of `.meta/CLAUDE-CODE-INSTRUCTIONS.md`, dated 2026-09-25. Read-only survey against DR-10: the repo is public, so nothing client-derived or confidential may be in it. Only `.gitignore` was changed (`/private-eval/` added).

Personal names found in file metadata are counted here, not quoted, so this report does not itself break rule W3.

---

## 1. Findings

| File | Why it may be sensitive | Evidence | Proposed action |
|---|---|---|---|
| `frontend/database/Assets/Asset list (version 1).xlsx` | Internal asset and attack-surface catalogue; author metadata names 2 people, so it looks like work product from an organisation | Sheets: Asset list, Interfaces List, Attack surfaces, Vehicle level, domain level, ECU or Component Level. First rows: "Assets / Sub-Properties / Type", "Update / OTA Master (connected to backend...) / Functionality", "S.NO / Interfaces / Rationale / Function", "1 / JTAG / Joint Test Action Group / Debug" | remove |
| `frontend/database/Assets/Asset threat mapping (version 1).xlsx` | R155 threat list enriched with internal mapping logic across 1026 columns; author metadata names 1 person | Sheets: "R155,Auto-ISAC & ASRG", Assets, Asset Mapping. First rows: "List of vulnerability or attack method... / ID / Attack / Attack Discription / Examples / Mitigation ID", "R155_TID / Threat Title / STRIDE / Description / Updated Include Logic / Asset mapped" | remove |
| `frontend/database/Assets/Asset_Structured_Mapping.xlsx` | Restructured copy of the asset list above; no author metadata, same content | Sheets: Vehicle, Domain, Component, ECU. First rows: "VEHICLE LEVEL ASSET REGISTER", "Asset Class / Asset / Data / Entity", "Process / Vehicle" | remove |
| `frontend/database/MITRE_EMB3D_Threats_Stencils_Logic v1.0 (1).xlsx` | Public MITRE EMB3D threats plus internal enrichment (stencils, logic); author metadata names 1 person | Sheets: MITRE_Threats_Enriched, Hardware, System Software, Application Software, Networking, Stencil_Library, 4 RAW sheets. First rows: "MITREEBM3D_TID / Threat Title / Pillar / STRIDE (given)", "TID-301 / Application Binaries Modified / Application Software / Tampering" | remove |
| `frontend/database/Mitre Database-2 (1).xlsx` | Mostly public MITRE EMB3D text; author metadata names 1 person | Sheets: Introduction, Hardware, System Software, Application Software, Networking. First rows: "Section / Details", "What is EMB3D? / A threat model for embedded devices" | remove |
| `frontend/database/R155_threat_logic v1.0 (1).xlsx` | Public R155 threat titles plus internal include-logic rules; author metadata names 2 people | Sheet: Sheet1. First rows: "R155_TID / Threat Title / STRIDE / Description / Updated Include Logic / Asset Category", "1.1 / Abuse of privileges by staff (insider attack) / Elevation Of Privilege" | remove |
| `frontend/database/TID-301_302_Stencil_and_Logic (2).xlsx` | Internal stencil and logic sets for two EMB3D threats; author metadata names 1 person | Sheets: Threats, Stencils, Logic_Sets, Application_Software_View. First rows: "Threat_ID / Threat_Title / Pillar / STRIDE_Primary", "TID-301 / 301-L1 / Physical engineering workstation path" | remove |
| `frontend/database/mitre data base TARA tool (1).xlsx` | Public EMB3D threats plus internal attack paths and worked explanations; author metadata names 2 people | Sheets: Introduction, Hardware, Networking, System Software, Application Software. First rows: "MITREEBM3D_TID / Threat Title / STRIDE / Description / Attack Paths", "TID-101 / Power Consumption Analysis Side Channel / Information Disclosure / Attack path 1..." | remove |
| `frontend/database/~$MITRE_EMB3D_Threats_Stencils_Logic v1.0 (1).xlsx` | Excel lock file left behind by an open workbook; not a workbook; contains the local user name of whoever had it open | File is 165 bytes, not a valid xlsx | remove |
| `frontend/src/data/taraAssets.ts` | Header says "parsed from Asset_Structured_Mapping.xlsx"; carries that workbook's asset and attack-surface lists into code. Imported by `frontend/src/components/visualizer/ComponentLibrary.tsx`, so deleting it breaks the frontend build | Matches workbook-only terms such as "OTA Master", "OTA Slave", "PRIVATE_CAN", "GMSL", "Storage flash" | replace with synthetic |
| `frontend/src/pages/Login.tsx` line 163, `frontend/src/pages/UserManagement.tsx` line 318 | Placeholder emails use `autotara.io`, which looks like a real domain | `you@autotara.io`, `john@autotara.io` | replace with synthetic (`example.com`) |
| `test-assets.csv` | Generic rows (OTA update service, telematics data, TLS session keys); no names or identifiers | Header plus 4 generic rows | keep |
| `tests/fixtures/**` | All generic diagnostic-platform and telematics examples written for tests; `inputs/architecture.png` is a 54-byte text placeholder, not an image | Checked every file | keep |
| `docs/ARCHITECTURE.md`, `docs/README.md`, `docs/tara-aegis-deployment-proposal.html` | Generic design text; the proposal mentions only "Customer's Server" | No names, hosts or identifiers found | keep |
| `frontend/public/docs/AutoTARA-SOP.md` | Generic SOP for the tool | No names, hosts or identifiers found | keep |
| `README.md` | Generic project description | No names, hosts or identifiers found | keep |
| `.meta/**` | Specs and governance are generic. `.meta/controls/*.json` comes from a public skills repository (vendor names appear only as public tooling references). `.meta/codex-briefs/BRIEF-backend-api.md` uses placeholder `a@b.com`. The analyst answers in `.meta/web-item-definition-questions.md` refer to past work only as TARA-1 to TARA-4 by input pattern, as DR-10 requires | No names, hosts or identifiers found | keep (analyst to confirm the answers contain no client-derived counts or component lists) |

## 2. Pattern search (all 336 tracked text files)

| Pattern | Result |
|---|---|
| 12-digit numbers (AWS account IDs) | none |
| ARNs, `s3://` paths, S3 bucket hostnames | none |
| Email addresses | 4, all placeholders (`a@b.com` twice, `you@autotara.io`, `john@autotara.io`) |
| IPv4 addresses | none, apart from the generic `0.0.0.0/0` in the questions file |
| Hostnames | only public ones (`github.com`, `raw.githubusercontent.com`, `draw.io`, `diagrams.net`) plus the `autotara.io` placeholder |
| Personal names | none in text files. Workbook metadata holds 6 distinct personal names across 7 of the 8 workbooks, and the lock file holds one local user name; all are listed for removal above |
| Company names | only public vendor references inside `.meta/controls/*.json` |

## 3. Git history

Removing a file in a new commit does **not** remove it from git history.

- The workbooks were first added in commit `67679db` (2026-06-03).
- They exist on `claude`, `develop` and `claude-local-wave2-all`. They are not on `main`.
- The repo has 0 forks.

If the workbooks are proprietary, the analyst chooses one or both of these:
1. **Make the repo private** in GitHub settings. This is fast and hides the history immediately.
2. **Rewrite history** to purge the files from every branch, then force-push. This changes every commit hash on those branches, so every clone (including a teammate's) must be re-cloned. Anyone who already cloned the repo keeps a copy.

## 4. Decisions (analyst, 2026-09-25)

1. **Workbooks: keep.** The analyst confirmed they are open source. No history rewrite or private repo needed.
2. **`frontend/src/data/taraAssets.ts`: keep as is.**
3. **Excel lock file: removed.** It is not a workbook and held a local user name.
4. **Placeholder emails: replaced** with `you@example.com` and `john@example.com`.
5. All other rows: keep, as proposed.
