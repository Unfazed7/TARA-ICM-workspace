# TARA ICM Workspace

**Status:** 🟢 Spec Engine Initialized (Awaiting Your Review)

This repository contains the **Claude architectural spec engine** for building a deterministic + AI-hybrid TARA (Threat Analysis & Risk Assessment) pipeline following ICM (Interpretable Context Methodology) architecture principles.

## 📋 What's Here

### Core Documents (Start Here)

1. **`DELIVERY-SUMMARY.md`** ← **READ THIS FIRST**
   - What was delivered
   - What you need to do next
   - 5 critical questions to answer
   - Timeline and status

2. **`Agents/claude/CLAUDE.md`** (Workspace Identity)
   - Claude's role as spec authority
   - Qwen's role as implementation executor
   - Workspace governance and rules
   - File ownership map

3. **`Agents/claude/CONTEXT.md`** (Module Status Tracker)
   - List of all 11 modules
   - Which specs are pending/complete
   - Implementation order
   - Dependency graph

4. **`Agents/claude/SPECIFICATIONS/00-json-schema-contracts.md`** (Foundational)
   - Complete JSON schemas for all 7 TARA stages
   - Tool use schemas for Claude API
   - **Must be frozen before any implementation**

### Supporting Documents

5. **`CLAUDE-QWEN-WORKFLOW.md`** (Collaboration Protocol)
   - How Claude and Qwen work together
   - Step-by-step collaboration flow
   - Escalation procedures
   - Quick reference checklist

6. **`ARCHITECTURE-MAP.md`** (Visual Guide)
   - Data flow diagram (7 stages)
   - Minute-by-minute timing breakdown
   - Dependency graph
   - Success metrics

7. **`SPEC-ENGINE-INITIALIZATION.md`** (Summary)
   - What each document does
   - Next action items
   - Status tracker

---

## ⚡ Quick Start (Next 48 Hours)

1. **Read** `DELIVERY-SUMMARY.md` (15 min)
2. **Read** `Agents/claude/CLAUDE.md` (10 min)
3. **Read** `Agents/claude/CONTEXT.md` (10 min)
4. **Review** `Agents/claude/SPECIFICATIONS/00-json-schema-contracts.md` (20 min)
5. **Answer** the 5 critical questions in DELIVERY-SUMMARY.md (15 min)
6. **Approve or request changes** on GitHub (30 min)

**Total:** ~90 minutes for complete understanding

---

## 🎯 The Mission

Build a production-grade TARA tool that:
- Transforms architecture diagrams + feature lists → complete TARA assessment
- Uses Claude for deep threat analysis (with extended thinking)
- Uses deterministic engines for all scoring (auditable, repeatable)
- Generates Excel reports + audit trails (compliance-ready)
- Takes ~45 minutes per assessment (vs 3–5 days manual)

**Tech Stack:** Node.js, Claude API, ICM architecture (no frameworks)

---

## 🗂️ Repository Structure

```
/Agents/
├── claude/                          ← Claude's domain
│   ├── CLAUDE.md                    (workspace governance)
│   ├── CONTEXT.md                   (module tracker)
│   ├── SPECIFICATIONS/              (all architectural specs)
│   │   └── 00-json-schema-contracts.md  (foundational)
│   └── references/                  (static domain knowledge)
│       ├── iso-21434-risk-matrix.json
│       ├── stride-taxonomy.md
│       ├── feasibility-formula.md
│       └── sfop-scale.md
└── Qwen/                            ← Qwen's domain
    ├── QWEN_PROTOCOL.md             (execution rules)
    ├── VERIFY.md                    (post-code checklist)
    └── simplicity.md                (golden rule)

/src/                                ← Implementation (Qwen will build)
├── schemas/                         (JSON schema files)
├── stages/                          (Agent implementations)
├── engines/                         (Deterministic calculators)
├── orchestrator/                    (Pipeline runner)
└── output-formatters/               (Excel, audit, JSON)

/tests/                              ← Test suite (Qwen will build)
├── unit/
├── integration/
└── fixtures/                        (test data)

Root docs:
├── DELIVERY-SUMMARY.md              ← Your action checklist
├── SPEC-ENGINE-INITIALIZATION.md    (summary)
├── CLAUDE-QWEN-WORKFLOW.md          (how we work together)
├── ARCHITECTURE-MAP.md              (visual diagrams)
└── README.md                        (this file)
```

---

## 📅 Timeline

### Week 1 — Specs (Foundation)
- ✅ CLAUDE.md, CONTEXT.md, schema contracts spec DONE
- 📋 Claude writes 9 more specs (once you approve)
- 📋 Qwen creates JSON schema files

### Week 2 — Engines
- Deterministic calculators (pure functions)
- Unit tests for each

### Week 3–4 — AI Agents
- 4 Claude-powered agents (Stages 1, 2, 3, 4, 6)
- Integration tests

### Week 5 — Orchestration
- Pipeline runner with checkpoints

### Week 6 — Output Layer
- Excel formatter + audit trail

### Week 7+ — Polish & Validation

---

## ✅ Success Criteria (This Phase)

- ✅ You've read the core documents
- ✅ You've answered the 5 critical questions
- ✅ You've approved the foundation (or requested changes)
- ✅ Specs 1–10 are written and frozen
- ✅ Zero ambiguity before implementation

---

## 🤝 How This Works

```
Claude (You)                    Qwen Coder (AI)
    ↓                               ↓
Write specs                     Read specs
    ↓                               ↓
Publish in /Agents/Claude/   Ask clarifying questions
    ↓                               ↓
Update CONTEXT.md             Confirm assumptions
    ↓                               ↓
Approve or revise             "Ready to code"
    ↓                               ↓
                            Write code in /src/
                                    ↓
                            Run VERIFY.md checklist
                                    ↓
                            Submit PR with spec ref
                                    ↓
Review for spec         Wait for review approval
compliance              Merge to main
    ↓
Approve PR & update CONTEXT.md
```

Each module follows this cycle. 11 modules = 11 cycles.

---

## 📞 Critical Path (Next 48 Hours)

### For You (Omkar)

1. Read DELIVERY-SUMMARY.md
2. Answer these 5 questions:
   - Vision input size limit? (Stage 1)
   - Checkpoint approval UI? (file-based vs web?)
   - Extended thinking budget? (8K tokens or test first?)
   - Control library source? (static JSON or Claude-generated?)
   - Residual risk calculation? (estimates or re-run?)
3. Approve or request changes
4. I write 9 more specs

### For Qwen Coder (After your approval)

1. Read CLAUDE.md + CONTEXT.md
2. Read all specs as published
3. Create JSON schema files
4. Wait for implementation signals

---

## 🔐 Design Decisions (Locked)

These **cannot change** mid-implementation:

- **JSON for all I/O** (auditability)
- **Extended thinking Stage 4 only** (cost control)
- **Filesystem-based** (ICM principle)
- **No frameworks** (ownership + speed)
- **Tool use for AI outputs** (reliability)
- **Checkpoints after AI stages** (human review)
- **7 sequential stages** (no parallelization)

---

## 🚀 To Get Started

```bash
# Clone the repo
git clone https://github.com/Unfazed7/TARA-ICM-workspace.git
cd TARA-ICM-workspace

# Read the documents
cat DELIVERY-SUMMARY.md                    # Start here
cat Agents/claude/CLAUDE.md                # Workspace rules
cat Agents/claude/CONTEXT.md               # Module list
cat Agents/claude/SPECIFICATIONS/00-json-schema-contracts.md  # Contract

# Answer the critical questions
# (add to a GitHub issue or comment)

# Approve the foundation
# (GitHub PR review or inline comment)

# Next: Specs 1–10 will be written automatically
```

---

## 📊 Metrics & Status

| Component | Status | Owner | Timeline |
|-----------|--------|-------|----------|
| Workspace governance (CLAUDE.md) | ✅ Done | Claude | — |
| Module tracking (CONTEXT.md) | ✅ Done | Claude | — |
| Schema contracts spec | ✅ Done | Claude | Awaiting approval |
| 9 remaining specs | 📋 Pending | Claude | Week 1 (after approval) |
| JSON schemas | 📋 Pending | Qwen | Week 1–2 |
| Deterministic engines | 📋 Pending | Qwen | Week 2 |
| AI agents | 📋 Pending | Qwen | Week 3–4 |
| Orchestrator | 📋 Pending | Qwen | Week 5 |
| Output formatters | 📋 Pending | Qwen | Week 6 |

---

## ❓ FAQ

**Q: Why start with specs, not code?**  
A: Specs catch ambiguity early (cheap fix). Code uncovers ambiguity late (expensive fix). 1 week of specs saves 3–4 weeks of rework.

**Q: Can Qwen and Claude work in parallel?**  
A: Not yet. Specs must be frozen before Qwen codes. After specs are done, they work in parallel (Claude writes next spec, Qwen implements current spec).

**Q: What if a schema needs to change mid-implementation?**  
A: It shouldn't. Schemas are frozen. If it must change, Claude updates spec + schema + test fixtures, and notifies Qwen.

**Q: Can we use LangChain / CrewAI / frameworks?**  
A: No. They add abstraction cost without benefit for this workflow. Pure Claude API + Node.js is simpler and faster.

**Q: How long does the full build take?**  
A: ~10 weeks (1 week specs, 2–3 weeks implementation, 1–2 weeks integration, 1 week polish).

---

## 📖 Documentation Index

- **DELIVERY-SUMMARY.md** → Your action checklist (start here)
- **Agents/claude/CLAUDE.md** → Workspace identity
- **Agents/claude/CONTEXT.md** → Module tracker
- **Agents/claude/SPECIFICATIONS/*.md** → Architectural specs
- **CLAUDE-QWEN-WORKFLOW.md** → How we collaborate
- **ARCHITECTURE-MAP.md** → Visual diagrams
- **Agents/Qwen/QWEN_PROTOCOL.md** → Qwen's rules
- **Agents/Qwen/VERIFY.md** → Post-code checklist

---

## 🎯 Next Action

1. **Read DELIVERY-SUMMARY.md** (15 min)
2. **Answer the 5 critical questions** (15 min)
3. **Approve or request changes** (GitHub)
4. **Claude proceeds with specs 1–10**

---

**Status:** 🟢 Spec engine initialized, awaiting your review  
**Commits:** `2b48133` → `a6f64b5`  
**Date:** 2026-05-09  
**Repo:** https://github.com/Unfazed7/TARA-ICM-workspace.git

---

**Everything is ready. The foundation is built. Time for your review and approval.**
