# Synthetic Reference Item 01: Key and Certificate Management Portal

**Status:** waiting for analyst review. The expected output is ground truth only after the analyst approves it.
**Approval:** not yet approved. (Record here: "Approved by the analyst on YYYY-MM-DD, after round N.")

A fictional portal on a public cloud that issues and revokes X.509 certificates. Built only from public knowledge of common cloud reference architectures. It describes no real system, client or engagement.

**Pattern reproduced:** the diagram contradicts the written answers (the TARA-2 input pattern: diagram, client Q&A, functional description).

---

## Files

| Path | What it is |
|---|---|
| `inputs/boundary.txt` | One-sentence boundary statement |
| `inputs/architecture.drawio` | The diagram source: one page, 24 icons, 19 arrows, all unlabelled |
| `inputs/architecture.png` | Image export of the same diagram |
| `inputs/client-answers.md` | Client answers to 12 intake questions |
| `inputs/functional.md` | Functional description: 4 actors, 11 functions |
| `expected/document-register.json` | Stage 01 register, 4 documents |
| `expected/facts.json` | Stage 01 facts, 70 (as proposed before CP0) |
| `expected/conflicts.json` | Stage 01 conflicts, 4 |
| `expected/item-definition.json` | Stage 02 item definition: 6 containers, 6 zones, 26 elements, 27 links, 11 functions, 6 assumptions |
| `expected/scope-decisions.json` | Stage 02 scope decisions, one per element |
| `expected/questions.json` | Stage 02 questions, 19 (16 open, 3 dropped because the documents answer them) |
| `expected/match-map.json` | Stub, filled at scoring time (task B7) |

The expected files are split for review. `tests/synthetic-items.test.js` joins `facts.json` with `conflicts.json`, and `item-definition.json` with `scope-decisions.json`, before checking them against the B1 schemas. It also checks the register hashes, every id reference, the parent rule by zone, one scope decision per element, question targets, duplicates and the cap, and em dashes.

If you edit an input file, update its `sha256` in `document-register.json`.

---

## Planted difficulties

| # | Difficulty | Where it is planted | Where the expected output shows it |
|---|---|---|---|
| 1 | Only public entry per the answers, but the diagram shows a public load balancer | Answer 3; diagram "public ALB" with an arrow from "Internet" | FCT-011, FCT-013, CNF-001 (not auto-resolved); EL-011 marked internet exposed; ASM-01; Q-002 on the load balancer; Q-015 on IF-09 |
| 2 | Answers describe the dev environment, the diagram title says production | Answer 2 (`kcp-dev`); diagram title | FCT-018, FCT-019, CNF-003 (not auto-resolved); ASM-03; Q-016 on the account (CTR-01) asks whether dev and production share anything; DOC-01 `prod`, DOC-03 `dev` |
| 3 | Component in text but not in the diagram | Functional section 3.7: CRL publisher and revocation list bucket | FCT-031, FCT-032; EL-007, EL-008; IF-17, IF-18 marked inferred from text |
| 4 | Component in the diagram but not in any text | Diagram "Cache" | FCT-030 (medium confidence); EL-017 with data `unspecified`; Q-003, Q-004; ASM-05 |
| 5 | Stated absence | Answer 4: no WAF | FCT-017 (`absence_stated`); `stated_absence_fact_ids`; no WAF element |
| 6 | Shared company identity provider | Answer 5: corporate SSO run by central IT, used by other applications | FCT-007; EL-004 `interface` in the corporate IT zone with no container; token check (EL-010) in scope; Q-017 dropped because answer 5 settles it |
| 7 | Managed key service with a customer key policy | Answer 6 | FCT-037, FCT-038 (`control_stated`); EL-019 with key purpose, where held, who can use it; responsibility split |
| 8 | Secrets store | Answer 7 | FCT-039, FCT-040; EL-020; IF-14 |
| 9 | Third-party notification service | Answer 8; diagram "Notification service" | EL-024 `interface` in the third-party zone; IF-15 with the API key and an email address (personal data) |
| 10 | CI/CD path into the item | Answer 9; diagram "CI/CD" arrow to the cluster | EL-025 (CI/CD) and EL-021 (registry) are `interface`: operational environment, outside the item even though the registry is in the portal's account (D-32). The entry points are in scope: IF-20, IF-21 (deploy) and IF-25, IF-26 (image pull, inferred from text). Q-011 on where the deploy credentials are kept |
| 11 | Unanswerable fact that must become a question | No document says who can read or delete audit records | Q-009 on EL-022 (and Q-010 on EL-023 for the logs) |
| 12 | Managed services drawn as a sidebar with one generic arrow | Diagram "Managed services" group, one arrow from "ECS cluster" | FCT-036; no link read from that arrow; links to the key, secrets store and logs (IF-13, IF-14, IF-22, IF-23) come from text and are marked inferred |
| 13 | Unlabelled grouping box that is not a subnet | Dashed box around CDN, portal UI bucket, API gateway and token authorizer | No zone or container for it; reason in DOC-01 `ignored_and_why` |
| 14 | Unlabelled arrows | Every arrow | Links read from arrows have protocol `unknown` unless text names it (IF-08, IF-09, IF-10, IF-11) |
| 15 | Same service, two names | Diagram "Key Service", functional "signing service" | CNF-004 `naming`, auto-resolved; FCT-029 rejected and not used by Stage 02 |
| 16 | Duplicate document | `architecture.png` is an export of `architecture.drawio` | DOC-02 registered, read with the image model, used only as a cross-check; no facts cite it |
| 17 | Irrelevant content | Answer 12: running cost | DOC-03 `ignored_and_why` |
| 18 | Two load balancers, one internet-facing and one internal (D-33) | Diagram "public ALB" in the public subnet and "internal ALB" in the private subnet; answer 3 names the internal one and the private link from the gateway | Two separate elements: EL-011 (internet-facing, exposed, in conflict) and EL-026 (internal, not exposed, FCT-069). IF-08 gateway to internal load balancer, IF-09 internet-facing to internal (bypass remark), IF-27 internal load balancer to the certificate service |

---

## Judgement calls for the analyst to check

These are choices I made where the design reference does not settle the answer. Please confirm or correct each one.

1. **Defaults after CP0 (confirmed by the analyst, round 1).** The expected item definition assumes the analyst sent the three open conflicts to the client and kept the proposed defaults: the internet-facing load balancer and the CDN are public, and production is assessed with the written answers assumed to hold for it.
2. **Facts status.** Expected facts are the Stage 01 output before CP0: all `proposed`, except the auto-resolved naming loser, which is `rejected`. The `group` values are what the server should compute.
3. **Human actors (settled, D-34).** People and calling systems have no provider, hosting type or internet exposure fields.
4. **Scope status for actors and internal services.** Set to `interface`, the closest status to "interactor". Operators and security admins are marked assumed because the device questions (Q-013, Q-012) are open.
5. **Team-run services on a managed cluster.** The certificate and key services are `self_hosted` (the team runs the code), while the database, storage and key service are `managed`. The API gateway and cache are `unknown` until Q-001 and Q-004 are answered.
6. **Network boundary configuration.** EL-014 is placed in the private subnet zone with the network as its parent. No document assigns it a zone.
7. **Internet gateway.** Its parent is the network, not the public subnet, although the diagram draws it inside the subnet.
8. **Protocols inferred from public knowledge.** API gateway calls are `https_rest`, PostgreSQL is `sql_wire`, bucket reads and writes are `s3_api`, and calls to managed services are `sigv4_service_api`. Protocols on unlabelled arrows with no supporting text stay `unknown`.
9. **Question set.** 16 open questions. You may want to drop some before this becomes ground truth.

---

## Contradiction resolved at the gate

`_config/scoping-facts.md` asks account-level questions (who runs the account, whether it is shared, whether environments share anything), but the B1 questions schema only allowed elements and links as targets. The analyst chose to let questions target containers (decision D-31). Item-01 now has Q-016 (do dev and production share anything, open) and Q-018 (is the account shared, dropped because answer 1 says it is dedicated), both on CTR-01.
