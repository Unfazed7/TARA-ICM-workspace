# TARA ICM Workspace — Spec Engine Initialization Complete

## What Was Just Established

The Claude **architectural spec engine** is now active. Three foundational documents have been created and committed to the repo:

### 1. `/Agents/claude/CLAUDE.md`
**Purpose:** Workspace identity and governance  
**Contains:**
- Claude's role (spec writer, design authority)
- Qwen's role (implementation executor)
- ICM 4-layer context model (Layers 0–4)
- File ownership map (all 10+ modules)
- Success criteria for the workspace
- Communication protocol between Claude and Qwen

**Key insight:** This is the "constitution" of the workspace. All future work traces back to rules defined here.

---

### 2. `/Agents/claude/CONTEXT.md`
**Purpose:** Routing table + module status tracker  
**Contains:**
- All 11 modules mapped to their specifications
- Implementation order (Week 1–4)
- Dependency graph (what must be done before what)
- Status tracker (pending/in-progress/complete)
- Open questions (to be resolved in individual specs)

**Key insight:** This is the "index" of the workspace. When you ask "what needs to be built next?", this document answers it.

---

### 3. `/Agents/claude/SPECIFICATIONS/00-json-schema-contracts.md`
**Purpose:** Define immutable I/O contracts for all 7 stages  
**Contains:**
- Complete JSON schema for each stage's input/output
- Tool use schemas (what Claude API will call)
- Validation rules (what makes valid/invalid)
- Concrete examples (not pseudocode)
- Test fixtures structure (what Qwen will validate against)

**Key insight:** This is the "contract" that all implementation depends on. Qwen cannot start coding Stage 1 until this spec is approved.

---

## The Collaboration Flow

```
Claude (you)                          Qwen Coder
    ↓                                    ↓
Write spec in /Agents/Claude/       Read spec
SPECIFICATIONS/{module}.md           ↓
    ↓                            Ask clarifying questions
Publish spec                      (if ambiguous)
    ↓                                    ↓
Update /Agents/Claude/             Confirm assumptions listed
CONTEXT.md (status = "ready")       Confirm scope clear
    ↓                                    ↓
                                   Write code in /src/
                                        ↓
                                   Run /Agents/Qwen/VERIFY.md
                                        ↓
                                   Submit PR:
                                   - spec reference
                                   - verification results
                                   - test coverage
                                        ↓
Review PR for                    Wait for review
spec compliance                      ↓
(not code style)              Merge to main
    ↓
Approve PR
```

---

## What Comes Next (Your Action Items)

### This Week (Spec Writing)

1. **Review the three documents above** — do they accurately capture the architecture?
   
2. **Approve or revise `/Agents/claude/CONTEXT.md`** — especially the module list and dependency graph

3. **Claude writes the remaining 10 specs** in this order:
   - `01-item-definition-agent.md` (Stage 1 — vision input, architecture extraction)
   - `02-asset-analysis-agent.md` (Stage 2 — CIA classification)
   - `03-impact-analysis-agent.md` (Stage 3 — damage scenarios, SFOP)
   - `04-threat-analysis-agent.md` (Stage 4 — **extended thinking, attack paths**)
   - `05-feasibility-engine.md` (deterministic calculator)
   - `05-risk-engine.md` (deterministic calculator)
   - `06-risk-treatment-agent.md` (Stage 6 — control recommendations)
   - `09-orchestrator.md` (Claude Code runner, checkpoints)
   - `10-excel-formatter.md` (output generation)
   - `11-audit-trail.md` (decision logging)

4. **After each spec is written**, update `/Agents/Claude/CONTEXT.md` to mark it as "ready for implementation"

### Week 2+ (Implementation by Qwen)

Once specs are frozen, Qwen will:
1. Write JSON schema files (validation)
2. Implement deterministic engines (pure functions)
3. Implement AI agents (Claude API calls)
4. Write integration tests
5. Build orchestrator

---

## Key Design Locks (Cannot change mid-implementation)

| Lock | Reason |
|------|--------|
| **JSON for all I/O** | Auditability + versioning |
| **Extended thinking Stage 4 only** | Cost control |
| **Filesystem-based (no DB)** | ICM principle + transparency |
| **No frameworks (LangChain, CrewAI, etc.)** | Ownership + startup latency |
| **Checkpoints after AI stages (1,2,3,4)** | Human review gates |
| **Tool use for JSON output** | Reliability over prompting |
| **7 sequential stages (no parallel)** | Linear workflow + checkpoints |

If any of these need to change, update them in CLAUDE.md first, then notify Qwen.

---

## Critical Success Factors

1. **Specs must be complete before Qwen codes** — no "figure it out during implementation"
2. **JSON schemas must be frozen** — changing them mid-code breaks everything
3. **Checkpoints are non-negotiable** — each AI stage output is reviewed by a human
4. **Extended thinking is limited to Stage 4** — don't expand budget elsewhere
5. **Audit trail is the differentiator vs Cymetris** — every AI decision must be logged and reproducible

---

## Questions for You

Before moving to spec #1 (item definition agent), confirm:

1. **Architecture diagram size limit?** Vision input has token cost. Is there a max file size?
   
2. **Checkpoint approval UI?** Should it be:
   - File-based: human edits `stages/01-*/output/REVIEW.md`, creates `APPROVED` file
   - Web form: simple HTTP endpoint to approve
   - Both?

3. **Extended thinking budget for Stage 4?** 8000 tokens estimated. Should Qwen test with real data first?

4. **Control library (Stage 6)?** Should it be:
   - Static JSON in Layer 3 (`/Agents/Claude/references/iso27001-controls.json`)
   - Claude generates controls dynamically
   - Hybrid (Claude augments a static library)?

5. **Residual risk calculation (Stage 7)?** After treatment is applied:
   - Use Claude's post-control feasibility estimate (Stage 6)
   - Re-run threat analysis (expensive, slower)
   - Use pre-computed lookup table

---

## Status Summary

| Deliverable | Status | Blocker | Next Step |
|-------------|--------|---------|-----------|
| CLAUDE.md | ✅ Complete | None | Review & approve |
| CONTEXT.md | ✅ Complete | None | Review & approve |
| JSON schemas spec | ✅ Complete | None | Review & approve |
| 10 other specs | 📋 Pending | Schema approval | Claude writes Week 1 |
| Qwen implementation | 📋 Pending | All specs frozen | Qwen starts Week 2 |

---

## How to Proceed

1. **Review the three files in `/Agents/claude/`**
2. **Provide feedback or approval** (use GitHub PR review or inline comments)
3. **Answer the 5 questions above** (guides next 4 specs)
4. **Claude proceeds with specs 1–10** once foundation is approved

---

**This spec engine is now ready to operate.**  
Commit hash: `2b48133`  
Repo: `https://github.com/Unfazed7/TARA-ICM-workspace.git`

All future specs will follow the format established in `00-json-schema-contracts.md`:
- Goal & Success Criteria
- File Ownership
- Key Interfaces
- Dependencies & Config
- Assumptions & Open Questions
- Implementation Order
- Verification Steps

**READY FOR YOUR REVIEW.** Provide feedback, then we proceed to Stage 1.
