# TARA ICM Workspace — Context & Routing

## Workspace Summary
**Purpose:** Build a deterministic + AI-hybrid TARA (Threat Analysis & Risk Assessment) pipeline following ICM architecture principles. 7 sequential stages, 3 deterministic engines, 4 Claude-powered agents, 1 orchestrator.

**Tech Stack:** Node.js, Claude API (Sonnet 4.5), Extended Thinking (Stage 4 only), Tool Use (JSON contracts), No frameworks.

**Team:** Claude (specs), Qwen Coder (implementation).

---

## Module Routing Table

| User Request | Module | Spec File | Status | Owner | Notes |
|---------------|--------|-----------|--------|-------|-------|
| "Design the JSON contracts" | JSON Schema Contracts | `SPECIFICATIONS/00-json-schema-contracts.md` | 📋 Pending | Claude | Must freeze before any implementation |
| "Build feasibility calculator" | Feasibility Engine | `SPECIFICATIONS/05-feasibility-engine.md` | 📋 Pending | Claude | Pure function: AFR formula |
| "Build impact rater" | Impact Engine | `SPECIFICATIONS/03-impact-engine.md` | 📋 Pending | Claude | Pure function: max(SFOP) |
| "Build risk scorer" | Risk Engine | `SPECIFICATIONS/05-risk-engine.md` | 📋 Pending | Claude | Pure function: impact × feasibility |
| "Build Stage 1 agent" | Item Definition Agent | `SPECIFICATIONS/01-item-definition-agent.md` | 📋 Pending | Claude | Vision input, extraction |
| "Build Stage 2 agent" | Asset Analysis Agent | `SPECIFICATIONS/02-asset-analysis-agent.md` | 📋 Pending | Claude | CIA classification |
| "Build Stage 3 agent" | Impact Analysis Agent | `SPECIFICATIONS/03-impact-analysis-agent.md` | 📋 Pending | Claude | Damage scenarios, SFOP |
| "Build Stage 4 agent" | Threat Analysis Agent | `SPECIFICATIONS/04-threat-analysis-agent.md` | 📋 Pending | Claude | **Extended thinking, attack paths** |
| "Build Stage 6 agent" | Risk Treatment Agent | `SPECIFICATIONS/06-risk-treatment-agent.md` | 📋 Pending | Claude | Control recommendations |
| "Build the orchestrator" | Claude Code Orchestrator | `SPECIFICATIONS/09-orchestrator.md` | 📋 Pending | Claude | Stage sequencing, checkpoints, file I/O |
| "Generate Excel output" | Excel Formatter | `SPECIFICATIONS/10-excel-formatter.md` | 📋 Pending | Claude | xlsm template filling |
| "Generate audit trail" | Audit Trail Logger | `SPECIFICATIONS/11-audit-trail.md` | 📋 Pending | Claude | JSON decision log per API call |
| "Fix a bug in Stage X" | (Module under test) | `/tests/unit/{module}.test.js` | 🔄 Ongoing | Qwen | Use VERIFY.md checklist |
| "Refactor old code" | (Target module) | `/src/{module}/` | 🔄 Ongoing | Qwen | Simplicity.md golden rule applies |

---

## Specification Writing Order (Claude's sequence)

### Week 1 — Foundation (This Week)
- [x] CLAUDE.md (workspace identity) — DONE
- [ ] CONTEXT.md (this file) — DOING
- [ ] `00-json-schema-contracts.md` — Next
- [ ] `01-item-definition-agent.md`
- [ ] `02-asset-analysis-agent.md`
- [ ] `03-impact-analysis-agent.md` + `03-impact-engine.md`
- [ ] `04-threat-analysis-agent.md` (extended thinking focus)

**Goal:** All stage specs + schema contracts frozen by end of Week 1. No ambiguity.

### Week 2 — Deterministic Engines
- [ ] `05-feasibility-engine.md`
- [ ] `05-risk-engine.md`
- [ ] `06-risk-treatment-agent.md`
- [ ] `09-orchestrator.md`

**Goal:** Qwen can implement engines without asking clarifying questions.

### Week 3 — Output Layer & Audit
- [ ] `10-excel-formatter.md`
- [ ] `11-audit-trail.md`
- [ ] Integration test specs

---

## Key Design Decisions (Locked)

| Decision | Rationale | Status |
|----------|-----------|--------|
| **JSON for all I/O** | Auditable, parseable, versionable | ✅ Fixed |
| **Extended thinking Stage 4 only** | Cost control; deepest reasoning task | ✅ Fixed |
| **Filesystem-based staging** | ICM principle; transparent; versioned | ✅ Fixed |
| **No UI (Phase 1)** | Excel output sufficient for compliance; defer UI to Phase 2 | ✅ Fixed |
| **Tool use for JSON enforcement** | Reliability > prompting for JSON | ✅ Fixed |
| **Checkpoints after stages 1, 2, 3, 4** | Human review gates on all AI stages | ✅ Fixed |
| **No LangChain / frameworks** | Ownership, auditability, startup latency | ✅ Fixed |

---

## Dependency Graph

```
00-json-schema-contracts.md
├── 01-item-definition-agent.md
├── 02-asset-analysis-agent.md
├── 03-impact-analysis-agent.md
│   └── 03-impact-engine.md
├── 04-threat-analysis-agent.md
├── 05-feasibility-engine.md
│   └── 05-risk-engine.md
├── 06-risk-treatment-agent.md
├── 09-orchestrator.md
│   └── (all stages + engines)
├── 10-excel-formatter.md
│   └── (final TARA package JSON)
└── 11-audit-trail.md
    └── (all API calls logged)
```

**Read-before constraint:** 
- Qwen cannot start Stage 1 until `00-json-schema-contracts.md` is frozen.
- Qwen cannot start orchestrator until all stage specs are done.
- Qwen cannot start output formatters until stage 7 spec is complete.

---

## Phase-Based Implementation Roadmap

### Phase 1: Foundation + Engines (Week 1–3)
1. Freeze all specs (Claude)
2. Implement deterministic engines (Qwen)
3. Write unit tests for engines (Qwen)

### Phase 2: AI Agents (Week 3–5)
1. Implement Stage 1 agent (Qwen)
2. Implement Stage 2 agent (Qwen)
3. Implement Stage 3 agent (Qwen)
4. Implement Stage 4 agent with extended thinking (Qwen)
5. Implement Stage 6 agent (Qwen)
6. Integration test: Stage 1 → Stage 2 → Stage 3 (Qwen)

### Phase 3: Orchestration (Week 6)
1. Implement orchestrator (Qwen)
2. Implement checkpoint UX (Qwen)
3. E2E test: all 7 stages end-to-end (Qwen)

### Phase 4: Output + Audit (Week 7–8)
1. Implement Excel formatter (Qwen)
2. Implement audit trail logger (Qwen)
3. Test full pipeline with real TARA data (both)

---

## Open Questions (to be closed by specs)

1. **Vision input handling:** How large can architecture diagrams be? (Stage 1)
2. **Extended thinking token budget:** 8K is estimate—test with sample threat data? (Stage 4)
3. **Checkpoint approval UI:** File-based (edit JSON) vs web UI? (Orchestrator)
4. **Residual risk calculation:** Post-control feasibility comes from Claude estimate or re-run threat analysis? (Stage 7)
5. **Control library:** Is Layer 3 reference static JSON or Claude generates recommendations? (Stage 6)
6. **Audit trail detail level:** Full context snapshot per API call, or just inputs/outputs? (Stage 11)

**Spec writers:** Address these in the respective specifications. Don't defer to implementation.

---

## Success Criteria (Workspace Level)

| Criterion | Target | Status |
|-----------|--------|--------|
| All specs written & reviewed | Week 1 end | 🔄 In progress |
| All engines unit-tested | Week 3 end | 📋 Pending |
| Stage 1–7 agents implemented | Week 5 end | 📋 Pending |
| Full pipeline E2E tested | Week 6 end | 📋 Pending |
| Excel output validated | Week 7 end | 📋 Pending |
| Audit trail complete | Week 8 end | 📋 Pending |

---

## Communication Protocol

**Claude → Qwen:**
- Publish spec in `/Agents/Claude/SPECIFICATIONS/{module}.md`
- Update this CONTEXT.md (mark spec as "Ready for implementation")
- Qwen acknowledges: "Read spec, listed assumptions, ready to code"

**Qwen → Claude:**
- Submit PR with: spec reference, verification checklist, test results
- Claude reviews for spec compliance (not code style)

**Ambiguity Resolution:**
- If Qwen finds ambiguity in spec: add it to spec's "Open Questions" section
- Claude updates spec immediately
- Qwen waits for updated spec, then continues

---

Last Updated: 2026-05-09
Next Action: Claude writes `00-json-schema-contracts.md`
