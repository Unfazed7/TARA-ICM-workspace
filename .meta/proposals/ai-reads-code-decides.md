# Proposal: AI Reads, Code Decides

**Status:** on hold (analyst, 2026-10-01). Kept for future reference. Not a decision yet; if adopted it becomes D-38 and changes tasks B5, C4, C5 and C8.
**Prompted by:** the analyst's question after the B4 Rationale prototype: how to get that level of consistency from the real tool, relying less on the AI's own thinking.

---

## The idea

AI is good at reading messy text and images. It is inconsistent at deciding: two runs can word things differently or make different calls. So the tool limits the AI to reading, and fixed rules do all the deciding.

## What it looks like on item-01

**1. Reading the diagram: no AI at all.** The draw.io file is structured data. Code reads the 24 shapes and 19 arrows directly ("public ALB", "internal ALB", the arrow from Internet to public ALB, and so on). Same every time.

**2. Reading the client answers: the AI's only real job.** The AI reads answer 3 and must fill a fixed form, not write freely:

```
subject: API gateway
what:    reachable from the internet = yes
quote:   "The API gateway is the only public entry point"
where:   client answers, answer 3
```

Code then checks that the quote appears word for word in the document. If the AI invented or paraphrased it, the fact is dropped.

**3. Everything after that is code, following rules already in `_config/`:**

| Decision | Rule used | Result on item-01 |
|---|---|---|
| "public ALB" is a load balancer | Synonym table (`element-kinds.md`) | Always the same kind |
| Two documents disagree on the load balancer | Conflict rule plus the load balancer rule (D-33) | Treated as public, with a Rationale item |
| "internal ALB" is not exposed | Label "internal" means not exposed (D-33) | EL-026, not exposed |
| CI/CD is an interface | Supply chain rule (D-32) | Interface, with the reason stated |
| Question "who can delete audit records?" | Trigger table per component kind (`scoping-facts.md`) | Always asked for an audit trail |
| Rationale item text | Fixed sentence template filled from stored facts and quotes | Same wording every run |

**4. Where the AI still helps:** reading free text and images, and suggesting extra questions the rules missed. Code keeps a suggested question only if it names a known target and fact type and no fact already answers it. An optional AI rephrasing of Rationale text is allowed only if code confirms the ids, quotes and default are unchanged.

## What it gives

- **Same documents, same output.** Provable with a test that runs the tool twice on item-01 and compares.
- **Every statement traces to a real quote**, because invented quotes are rejected.
- **Fixing a wrong result means fixing a rule**, not hoping the AI behaves differently next time.
- **Trade-off:** the rules need care and will grow. When the tool meets something new, it says so in the Rationale ("I don't recognise this component kind") instead of guessing.

## Split of work, step by step

| Step | Current plan | Proposed |
|---|---|---|
| Read draw.io, Excel, config exports | Code parser | Same |
| Read prose and images | AI writes facts in free text | AI fills a fixed form per fact (subject, kind hint, endpoints, attribute name and value, exact quote) |
| Check quotes | Not planned | Code checks the quote word for word; fails mean the fact is dropped |
| Match names | Engine, AI for leftovers | Engine with the synonym table; AI leftovers only flagged, never auto-merged |
| Conflicts | Engine | Same |
| Build elements, links, zones | AI (C8) | Code (`_engines/item-definition-builder.js`) from typed facts |
| Scope | AI with the scoping rules | Code from the mapping table in `scoping-facts.md`; default plus "assumed" when facts are missing |
| Questions | AI generates, a second AI call checks | Starter questions by code from the trigger table; AI may suggest more, filtered by code |
| Rationale text | AI writes | Code fills fixed templates (`_engines/rationale-builder.js`) |

**Consistency safeguards:** temperature 0, pinned models (C1), quote verification, schema validation, refusal rules, a run-twice test on item-01, and the B7 scorer after every change.

## What adopting it would change

- `.meta/DECISIONS.md`: D-38.
- `.meta/CLAUDE-CODE-INSTRUCTIONS.md`: DR-12 gains AD-7 "AI reads, code decides"; C4 adds exact-quote checks and the fixed fact form; C5 flags leftovers; C8 splits into a deterministic builder and an AI question suggester; run-twice test added to C4 and C8.
- Fact schema: an optional `structured` part (kind hint, endpoints, attribute name and value), with spec 12a, fixtures and item-01 facts updated together.
- Stage 01 and 02 `CONTEXT.md` and Layer 0 `CLAUDE.md`: state the split.
