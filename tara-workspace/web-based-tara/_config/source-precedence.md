# Source Precedence (Layer 3)

Used by: Stage 01 (Input Normalization) and the reconciliation engine (C5). Source: DR-8, DR-9, decisions D-07, D-08, D-28. Spec: `.meta/specs/12a-document-register-and-facts.md`.

---

## 1. Rank by source (highest wins)

| Rank | Source |
|---|---|
| 1 | Analyst decision at a checkpoint (stored as `AD-###`, never a document) |
| 2 | Cloud configuration export (`config_export`) |
| 3 | Written client answers (`qa`) |
| 4 | Existing client item definition (`existing_item_definition`) |
| 5 | Architecture diagram (`diagram`) |
| 6 | Infrastructure or sizing document (`infra`) |
| 7 | Functional documentation, SRS, API specification, asset list (`functional`, `srs`, `api_spec`, `asset_list`) |
| 8 | User manual, other documents (`manual`, `other`) |
| 9 | Analyst free text entered at a checkpoint |

- **Within a rank, newer wins.** Newer means a later date on the document, or the later date received when there is none.
- **The analyst can change a document's rank at CP0.** The change is an analyst decision.
- **Asset list rows are hints**, not decisions: they suggest elements and data, and never outrank a diagram or client answer.

## 2. Always sent to the analyst ("Needs you"), never auto-resolved

- Internet exposure or the ingress path
- Which environment a document describes
- Whether a component exists
- Who owns or operates a component
- The authentication mechanism on an entry point
- A higher-ranked source that is older than a lower-ranked one
- Any conflict that fits none of the named kinds (`other`): record a short description of what disagrees and log it to `output/new-conflict-kinds.log`

## 3. Auto-resolved (losing value kept in the conflict log)

Naming differences, instance sizes, counts, versions.

## 4. Minimum input (checked before anything else)

1. A boundary statement, or at least the item name plus one sentence.
2. At least one document describing components: a diagram, an infrastructure or sizing document, a configuration export, or an architecture section.
3. At least one document describing behaviour: a functional document, API specification, user manual, SRS or Q&A.

If any is missing, stop and list exactly what is missing. A diagram is not required; without one, every link is marked "inferred from text".

## 5. Partial failure

If one file cannot be read but the minimum is still met, continue. Mark the file "failed" with the reason in the document register, show it at CP0, and add a question asking the client to send it again.
