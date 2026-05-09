# TARA ICM Architecture Map

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    TARA Assessment Pipeline                      │
│                  (ICM: 7 Stages + Orchestrator)                 │
└─────────────────────────────────────────────────────────────────┘

USER INPUT (Files)
  ├── architecture.png (vehicle ECU diagram)
  ├── feature-list.xlsx (features & functions)
  └── system-requirements.md (scope definition)
       │
       ↓
┌──────────────────────────────────────────────────────────────────┐
│                    STAGE 01: Item Definition                      │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │  Input:  architecture.png + feature-list.xlsx             │   │
│ │  Agent:  Claude Vision → extract ECUs, protocols, bounds  │   │
│ │  Output: item-definition.json                             │   │
│ │  ✅ Checkpoint: Human reviews item boundary              │   │
│ └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
       ↓ (item-definition.json passed to Stage 02)
┌──────────────────────────────────────────────────────────────────┐
│                   STAGE 02: Asset Analysis                        │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │  Input:  item-definition.json + architecture.png           │   │
│ │  Agent:  Claude → extract assets (comm paths, data stores) │   │
│ │  Ref:    Layer 3: asset-type-rules.md                      │   │
│ │  Output: asset-register.json (with CIA ratings)           │   │
│ │  ✅ Checkpoint: Human reviews asset list & CIA ratings    │   │
│ └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
       ↓ (asset-register.json)
┌──────────────────────────────────────────────────────────────────┐
│                   STAGE 03: Impact Analysis                       │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │  Input:  asset-register.json                               │   │
│ │  Agent:  Claude → generate damage scenarios, classify SFOP │   │
│ │  Ref:    Layer 3: sfop-scale.md                            │   │
│ │  Engine: impact-rating.js (deterministic)                  │   │
│ │  Output: impact-analysis.json (with impact ratings)       │   │
│ │  ✅ Checkpoint: Human reviews damage scenarios             │   │
│ └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
       ↓ (impact-analysis.json)
┌──────────────────────────────────────────────────────────────────┐
│              STAGE 04: Threat Analysis ⚡ EXTENDED THINKING       │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │  Input:  impact-analysis.json + asset-register.json        │   │
│ │  Agent:  Claude (thinking: 8000 tokens)                    │   │
│ │          → Generate STRIDE threats                         │   │
│ │          → Build attack paths (with circumvent steps)      │   │
│ │          → Estimate feasibility sub-factors               │   │
│ │  Ref:    Layer 3: stride-taxonomy.md                      │   │
│ │          Layer 3: rise-autoISAC.md (threat library)        │   │
│ │  Output: threat-analysis.json                             │   │
│ │  ✅ Checkpoint: Human reviews attacks & feasibility       │   │
│ └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
       ↓ (threat-analysis.json)
┌──────────────────────────────────────────────────────────────────┐
│         STAGE 05: Risk Determination (DETERMINISTIC ONLY)        │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │  Input:  threat-analysis.json + impact-analysis.json       │   │
│ │  Engines (no AI):                                          │   │
│ │    • feasibility-calc.js (AFR formula)                     │   │
│ │    • risk-score.js (impact × feasibility → level)         │   │
│ │  Ref:    Layer 3: iso-21434-risk-matrix.json               │   │
│ │  Output: risk-register.json                                │   │
│ │  ⚙️  No human checkpoint (purely mathematical)            │   │
│ └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
       ↓ (risk-register.json)
┌──────────────────────────────────────────────────────────────────┐
│                   STAGE 06: Risk Treatment                        │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │  Input:  risk-register.json                                │   │
│ │  Agent:  Claude → recommend controls, map to ISO 27001    │   │
│ │  Ref:    Layer 3: iso27001-controls.md                     │   │
│ │  Output: risk-treatment.json (controls per risk)          │   │
│ │  ✅ Checkpoint: Human approves control selections         │   │
│ └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
       ↓ (risk-treatment.json)
┌──────────────────────────────────────────────────────────────────┐
│    STAGE 07: Residual Risk Calculation (DETERMINISTIC ONLY)     │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │  Input:  risk-register.json + risk-treatment.json          │   │
│ │  Engine: risk-score.js (recalculate with post-treatment)  │   │
│ │  Output: residual-risk-register.json                       │   │
│ │          + tara-final-package.json (all 7 stages merged)  │   │
│ │  ⚙️  No human checkpoint (purely mathematical)            │   │
│ └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
       ↓ (tara-final-package.json)
┌──────────────────────────────────────────────────────────────────┐
│                      OUTPUT FORMATTERS                            │
│  ┌─────────────────┬──────────────────┬──────────────────────┐   │
│  │  Excel Output   │   Audit Trail    │   UI JSON Output     │   │
│  ├─────────────────┼──────────────────┼──────────────────────┤   │
│  │ xlsm file       │ JSON log per API │ JSON for web viewer  │   │
│  │ (our template)  │ call             │ (phase 2 deferred)   │   │
│  │ + user template │ (complete audit) │                      │   │
│  │ mode (schema    │ (compliance)     │                      │   │
│  │  mapping)       │                  │                      │   │
│  └─────────────────┴──────────────────┴──────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
       ↓
OUTPUTS TO USER:
  ├── TARA_Report_2026-05-09.xlsm (Excel, signed/locked)
  ├── audit-trail.json (decision log, reproducible)
  └── tara-final-package.json (all raw data, versionable)
```

---

## Data Flow: Minute-by-Minute

```
Time    Stage          Status              Token Cost    File I/O
─────────────────────────────────────────────────────────────────
T+0:00  Stage 01       Running             1500 input    Read: architecture.png
        Item def.      Claude vision       500 output    Write: item-definition.json
        (1 min)        ✅ Checkpoint
                       Human approves
                       
T+1:05  Stage 02       Running             2000 input    Read: item-definition.json
        Assets         Claude std          2000 output   Write: asset-register.json
        (1 min)        ✅ Checkpoint
                       Human approves
                       
T+2:10  Stage 03       Running             1500 input    Read: asset-register.json
        Impact         Claude std          3000 output   Write: impact-analysis.json
        (2 min)        impact-rating.js    0 (engine)    Call: impact-rating.js
                       ✅ Checkpoint
                       Human approves
                       
T+4:15  Stage 04       Running             5400 input    Read: impact-analysis.json
        Threats        Claude extended     8000 thinking Write: threat-analysis.json
        (3 min)        thinking            4000 output   
                       ✅ Checkpoint
                       Human reviews
                       attacks
                       
T+7:20  Stage 05       Running             —             Read: threat-analysis.json
        Risk det.      feasibility-calc    0 tokens      Read: impact-analysis.json
        (1 min)        risk-score.js       (engines)     Write: risk-register.json
                       ⚙️  No checkpoint
                       
T+8:25  Stage 06       Running             2000 input    Read: risk-register.json
        Treatment      Claude std          2000 output   Write: risk-treatment.json
        (1 min)        ✅ Checkpoint
                       Human approves
                       
T+9:30  Stage 07       Running             —             Read: risk-register.json
        Residual       risk-score.js       0 tokens      Read: risk-treatment.json
        (1 min)        (engine)            (engines)     Write: tara-final-package.json
                       ⚙️  No checkpoint
                       
T+10:35 Output         Running             —             Read: tara-final-package.json
        Formatters     Excel filler        0 tokens      Write: TARA_Report.xlsm
        (2 min)        Audit trail gen     (engines)     Write: audit-trail.json
                       
T+12:40 COMPLETE       Deliver             ≈13K tokens   ✅ Ready for review
                                           (total cost)
```

---

## Module Dependency Graph

```
FROZEN FIRST:
  00-json-schema-contracts
  (all stages depend on this)
       ↓
   ┌─────────────────────────────┐
   │  Deterministic Engines:     │
   │  • feasibility-calc.js      │
   │  • impact-rating.js         │
   │  • risk-score.js            │
   └─────────────────────────────┘
       ↓
   ┌─────────────────────────────┐
   │  Stage Agents (in order):   │
   │  1. Item Definition         │→ 2. Assets  →  3. Impact
   │                             │
   │  4. Threats (extended thinking, needs 1-3 complete)
   │  6. Treatment (needs 5 complete)
   │  (Stages 5, 7 are deterministic only)
   └─────────────────────────────┘
       ↓
   ┌─────────────────────────────┐
   │  Orchestrator:              │
   │  • Sequencing               │
   │  • Checkpoint UX            │
   │  • File I/O management      │
   └─────────────────────────────┘
       ↓
   ┌─────────────────────────────┐
   │  Output Formatters:         │
   │  • Excel                    │
   │  • Audit Trail              │
   │  • JSON (for UI, phase 2)   │
   └─────────────────────────────┘
```

---

## Who Owns What (Responsibility Matrix)

| Component | Claude (Spec) | Qwen (Code) | Shared |
|-----------|---------------|------------|--------|
| CLAUDE.md workspace rules | ✍️ Write | ✓ Follow | Review cycle |
| JSON schemas | ✍️ Spec | ✍️ Implement | Frozen approval |
| Stage agents (1,2,3,4,6) | ✍️ Spec | ✍️ Code | Code review |
| Deterministic engines | ✍️ Spec formula | ✍️ Implement | Test coverage |
| Orchestrator | ✍️ Spec | ✍️ Code | Integration test |
| Excel formatter | ✍️ Spec | ✍️ Code | Template validation |
| Audit trail | ✍️ Spec | ✍️ Code | Audit review |
| Tests | Checkpoint design | ✍️ Write & run | Results validation |
| Git history | Review commits | ✍️ Write commits | Quality gates |

---

## Risk Mitigations Baked In

| Risk | Mitigation |
|------|-----------|
| **AI hallucination** | Tool use for JSON output (not free-form text) |
| **Auditability loss** | Audit trail logs every API call + decision |
| **Schema evolution disaster** | Frozen schemas; changes require explicit review |
| **Extended thinking runaway** | Budget limited to 8K tokens, Stage 4 only |
| **Context bloat** | ICM: each stage loads only what it needs (2–8K tokens) |
| **Silent failures** | Checkpoints require human approval after each AI stage |
| **Implementation drift** | Spec enforcement in code review (does code match spec?) |
| **Vendor lock-in** | No LangChain; pure Claude API + Node.js |

---

## Phase Timeline

```
Week 1: Foundation
  Day 1–2: Specs 00–10 written by Claude
  Day 3–5: Qwen reads specs, asks clarifications
  Deliverable: All specs frozen, zero ambiguity

Week 2: Deterministic Engines
  Day 1–3: Qwen implements 3 engines (feasibility, impact, risk-score)
  Day 4–5: Unit tests for each engine
  Deliverable: All engines passing tests

Week 3–4: AI Agents
  Week 3: Stages 1, 2, 3 agents (standard inference)
  Week 4: Stage 4 agent (extended thinking), Stage 6 agent
  Deliverable: All agents working, passing integration tests

Week 5: Orchestration
  Day 1–3: Orchestrator (sequencing, checkpoints, file I/O)
  Day 4–5: E2E tests (all 7 stages end-to-end)
  Deliverable: Full pipeline running, checkpoints working

Week 6: Output Layer
  Day 1–3: Excel formatter
  Day 4–5: Audit trail logging
  Deliverable: Complete TARA package generated, auditable

Week 7: Polish & Demo
  Day 1–3: Test with real TARA data
  Day 4–5: Documentation, demo prep
  Deliverable: Production-ready tool
```

---

## Success Metrics (How to Know It Works)

```
✅ Schema Validation
   Run: npm test -- fixtures/
   All valid samples pass, all invalid samples fail

✅ Engine Correctness
   Run: npm test -- engines/
   risk_score = impact × feasibility (verified)
   impact_rating = max(SFOP) (verified)
   AFR formula correct per ISO 21434 (verified)

✅ Agent Output Format
   Run: npm test -- agents/
   All tool_use calls return valid JSON
   Output matches schema exactly
   No null required fields

✅ Orchestration E2E
   Run: npm run tara:full-assessment
   All 7 stages execute in sequence
   Checkpoints pause for human approval
   Final package validates against schema

✅ Audit Trail
   Run: npm test -- audit-trail
   Every API call logged with timestamp
   Every decision traceable to prompt + context
   Complete reproducibility

✅ Excel Output
   Open tara-report.xlsm in Excel
   All risk scores calculated correctly
   All controls mapped
   All enums valid
   File is signed/locked
```

---

## Quick Navigation

| Looking for... | Go to... |
|---|---|
| How do Claude & Qwen work together? | CLAUDE-QWEN-WORKFLOW.md |
| What's the status of each module? | /Agents/Claude/CONTEXT.md |
| What are the rules of this workspace? | /Agents/Claude/CLAUDE.md |
| What's the JSON contract for Stage X? | /Agents/Claude/SPECIFICATIONS/0X-*.md |
| What should I implement next? | /Agents/Claude/CONTEXT.md (ordered list) |
| How do I run the full pipeline? | /src/orchestrator/ (README) |
| Where's the test data? | /tests/fixtures/ |

---

**Commit:** `2fb9563`  
**Last updated:** 2026-05-09  
**Status:** 🟢 Ready for implementation
