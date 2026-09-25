# Stage 02: Item Definition (Layer 2)

**Type:** AI plus deterministic grouping
**Checkpoint:** CP1 Item Definition review (analyst only)
**Spec:** `.meta/specs/12b-item-definition-model.md` and `.meta/specs/12c-questions-scope-and-analyst-decisions.md` (written in B1)
**Load from `_config/`:** `element-kinds.md`, `scoping-facts.md`, `analyst-language.md`
**Variant:** Web Item Definition only. Never blend in the vehicle variant.

---

## Purpose

Build the Web Item Definition from the facts confirmed at CP0: containers, zones, elements, links, functions, scope decisions, and the questions still needed to decide scope. Then discuss it with the analyst at CP1.

## Input

From the API only:
- facts confirmed at CP0;
- the analyst's answers and decisions;
- the boundary statement.

Never read client documents. If a needed fact is missing, it becomes a question, not a guess.

## Output (Layer 4, raw machine output)

- `output/item-definition.json`: containers, zones, elements, links, functions, assumptions, responsibility split, stated controls and stated absences, stakeholders, scope decisions, and the proposed boundary statement if the analyst left it blank (marked "proposed").
- `output/questions.json`: open questions, each tied to one element and one fact type.
- `output/new-kinds.log`: element kinds not in `element-kinds.md`, for later human review.

The confirmed version lives in `checkpoint-api` once seeded.

## Process

1. **Build the structure.**
   - Containers are not elements: cloud account, region, VPC, subnet, availability zone, namespace, cluster. Every element has exactly one parent container. Managed services outside a VPC sit in an "account-level managed services" container. Each VPC also gets one element for its network boundary configuration.
   - One element per independently deployed or configured unit with its own identity, access policy or distinct data content. Never one per pod, table, endpoint, storage prefix or security group. Never one "backend" or one "database" covering parts with different data.
   - Links are data flows (intended exchange) or exposures (reachability without intended exchange), each with protocol, authentication, encryption, data carried and whether it crosses a trust boundary. OAuth2, OIDC, SAML, TLS, mTLS, API keys, JWT, X.509, IAM roles and session cookies are authentication or encryption attributes, not protocols. If no diagram was supplied, every link is marked "inferred from text".
   - Never invent a zone the confirmed facts do not show. Components mentioned nowhere in the confirmed facts become questions, never elements. Stated absences ("no WAF") are recorded as facts.
   - A vehicle or ECU the item talks to is one external element at the edge, never broken down.
2. **Generate questions.**
   - Start from the fact types each element kind needs, as listed in `scoping-facts.md`.
   - A reasoning model may add questions after looking at the elements.
   - A separate model call tries to answer each question from the confirmed facts; a question that can be answered with a quote is dropped before the analyst sees it.
   - Every question names one element and one fact type. Duplicates by (element, fact type) are removed. At most 3 questions per element by default.
   - Questions go to the analyst first; only the ones the analyst cannot answer go to the client question list.
3. **Decide scope.** Apply the internal mapping in `scoping-facts.md` only when the facts it needs are known. Otherwise propose the default, mark it "assumed" and link the question that would settle it. Nothing is scoped out silently: every out-of-scope element has a recorded reason.
4. **Unknown element kinds:** ask the full fact set FT-01 to FT-07 and log the kind in `output/new-kinds.log`. Only a human adds new rules.
5. **Seed through the API** and log anything refused.

`scoping-facts.md` is internal. Never quote it, paraphrase it, or name its rule IDs to the analyst. Show the decision and a plain reason instead, for example: "Sign-in service: outside the assessment. Reason: you said it is the company-wide login used by other applications and managed by central IT. The point where this system checks the login token is inside the assessment."

## Rules the API enforces

The API refuses, item by item, and says why:
- an element without at least one supporting fact;
- a link whose source or destination element does not exist;
- a question without an element and a fact type, or a duplicate (element, fact type);
- more questions for one element than the cap;
- a scope decision without a reason;
- any write that references a fact not confirmed at CP0;
- any confirm call that does not come from the analyst;
- confirming CP1 while a "Needs you" card is unanswered (unless the analyst marked it "send to client");
- any write to a confirmed CP1 version (409).

The server, not the model, computes groups, counts, coverage and trust-boundary crossings.

## Checkpoint: CP1 Item Definition review

Same review by exception as CP0: Agreed, Single source and Needs you groups computed by the server, four-part "Needs you" cards (What I concluded, Why, What I assumed, What would change it), 3 to 5 spot-checked Agreed items, and no confirm while a "Needs you" card is open. Target: 10 to 25 "Needs you" cards.

CP1 shows:
- the boundary statement, marked "proposed" if the agent wrote it;
- the container tree and zones, elements, the Data Flow Inventory (links) and trust boundaries;
- each element's scope decision with a plain reason;
- assumptions, responsibility split, stated controls and stated absences, stakeholders and open questions.

The analyst can change scope, add, delete, rename, merge or split an element, change its kind, move it to another zone, edit attributes, add or delete a link, resolve a conflict, edit the boundary statement, answer questions, attach a new document and re-run, lock items, export client questions, and ask "why?".

Re-runs create a new version. Analyst edits are stored as locked overrides and re-applied, and a diff is shown before the new version is accepted. An analyst edit is never silently overwritten.

**Writing to the analyst:** conclusion first, then reason, then source. One idea per sentence. One question per card. No rule IDs, scores or internal labels. "Why?" answers come only from stored sources and decisions; if nothing is stored, say it is an open question.

## What the next stage receives

Stage 03 receives, from the API, only the finalized Item Definition (CP1 confirmed). Out-of-scope elements stay listed but produce no assets.
