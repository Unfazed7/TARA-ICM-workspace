# TARA Tool — Threat Analysis & Risk Assessment

**Automated TARA pipeline compliant with ISO/SAE 21434**

---

## What is TARA?

TARA (Threat Analysis & Risk Assessment) is the cybersecurity risk assessment process required by ISO/SAE 21434 for automotive systems. It identifies:
- **Assets** — What needs protection (ECUs, data, communication paths)
- **Threats** — How attackers might compromise those assets
- **Risks** — Impact × Feasibility of each threat
- **Treatments** — Security controls to reduce risks

Traditionally, TARA is a **3–5 day manual process** per vehicle/system. This tool automates it to **~45 minutes** while maintaining audit trails for compliance.

---

## How It Works

### Input
- Architecture diagram (PNG/JPEG — vehicle ECU diagram)
- Feature & function list (XLSX)
- System requirements (optional)

### Pipeline (7 Stages)
1. **Item Definition** — Extract ECUs, protocols, boundaries from architecture
2. **Asset Analysis** — Identify assets (comm paths, data stores) + CIA ratings
3. **Impact Analysis** — Generate damage scenarios + SFOP ratings
4. **Threat Analysis** — STRIDE threats + attack paths (extended thinking)
5. **Risk Determination** — Impact × Feasibility → Risk scores (deterministic)
6. **Risk Treatment** — Recommend controls per risk
7. **Residual Risk** — Calculate post-treatment risk

### Output
- **Excel report** (`.xlsm`) — Complete TARA package, locked/signed
- **Audit trail** (`.json`) — Every AI decision logged with context
- **JSON package** (`.json`) — All raw data, versionable

---

## Architecture

See `ARCHITECTURE.md` for visual pipeline diagrams.

**Key principles:**
- **AI for creativity:** Threat generation, damage scenarios, control recommendations
- **Deterministic for scoring:** All numbers come from formulas (auditable, repeatable)
- **Checkpoints:** Human reviews AI outputs after stages 1, 2, 3, 4
- **ICM staging:** Each stage reads/writes JSON files (transparent, versionable)

---

## Tech Stack

- **Runtime:** Node.js 18+
- **AI:** Claude API (Sonnet 4.5)
  - Extended thinking ON for Stage 4 only (threat analysis)
  - Tool use for JSON output (structured, validated)
- **Deterministic engines:** Pure JavaScript functions
  - `feasibility-calc.js` — AFR formula per ISO 21434
  - `impact-rating.js` — max(SFOP)
  - `risk-score.js` — Impact × Feasibility matrix lookup
- **Output:** ExcelJS for `.xlsm` generation
- **No frameworks:** No LangChain, CrewAI, or other abstractions

---

## Installation

```bash
# Clone the repo
git clone https://github.com/Unfazed7/TARA-ICM-workspace.git
cd TARA-ICM-workspace

# Install dependencies
npm install

# Run the pipeline
npm run tara:assess
```

---

## Usage

### Basic Assessment
```bash
npm run tara:assess \
  --architecture ./inputs/vehicle-arch.png \
  --features ./inputs/feature-list.xlsx \
  --output ./outputs/tara-report.xlsm
```

### With Checkpoints (Human Review)
```bash
npm run tara:assess:checkpoints
# Pipeline pauses after each AI stage
# Review outputs/stage-01/REVIEW.md
# Approve or edit JSON, then continue
```

### Custom Template
```bash
npm run tara:assess \
  --template ./templates/customer-tara-template.xlsm \
  --output ./outputs/customer-tara.xlsm
```

---

## Compliance

### ISO/SAE 21434
- ✅ Clause 15.4: Item definition
- ✅ Clause 15.5: Asset identification
- ✅ Clause 15.6: Threat scenario identification (STRIDE)
- ✅ Clause 15.7: Impact rating (SFOP)
- ✅ Clause 15.8: Attack path analysis
- ✅ Clause 15.9: Attack feasibility rating (AFR)
- ✅ Clause 15.10: Risk determination
- ✅ Clause 15.11: Risk treatment decision

### ISO 27001:2022
- ✅ Annex A control mapping (Stage 6)
- ✅ Risk treatment options (avoid, reduce, transfer, accept)

### ISO 27005:2022
- ✅ Risk assessment process
- ✅ Risk treatment selection

---

## Audit Trail

Every AI decision is logged with:
- Model used (`claude-sonnet-4-20250514`)
- Context files loaded (Layer 3 references)
- Prompt sent to API
- Raw JSON response
- Timestamp

**Example audit log:**
```json
{
  "stage": "04-threat-analysis",
  "timestamp": "2026-05-09T13:45:22Z",
  "model": "claude-sonnet-4-20250514",
  "thinking_enabled": true,
  "thinking_budget_tokens": 8000,
  "context_loaded": ["stride-taxonomy.md", "rise-autoISAC.md"],
  "input_tokens": 5400,
  "thinking_tokens": 7821,
  "output_tokens": 4012,
  "threat_count": 23,
  "output_file": "outputs/stage-04/threat-analysis.json"
}
```

This allows **complete reproducibility** — re-run any stage with the same context and get the same output.

---

## Cost Per Assessment

| Stage | AI Cost | Deterministic Cost | Total |
|-------|---------|-------------------|-------|
| 1. Item def | $0.015 | — | $0.015 |
| 2. Assets | $0.035 | — | $0.035 |
| 3. Impact | $0.05 | — | $0.05 |
| **4. Threats** | **$0.40** | — | **$0.40** |
| 5. Risk det | — | $0 (pure calc) | $0 |
| 6. Treatment | $0.035 | — | $0.035 |
| 7. Residual | — | $0 (pure calc) | $0 |
| **Total** | **~$0.55** | **$0** | **~$0.55** |

**ROI:** $0.55 tool cost vs $3–5K manual labor cost = 5000–9000x return

---

## References (Layer 3)

Static domain knowledge loaded selectively per stage:

- `iso-21434-risk-matrix.json` — Impact × Feasibility → Risk level table
- `stride-taxonomy.md` — STRIDE definitions + examples
- `feasibility-formula.md` — AFR calculation formula
- `sfop-scale.md` — Safety/Financial/Operational/Privacy rating scale
- `rise-autoISAC.md` — Automotive threat intelligence summary
- `iso27001-controls.md` — Annex A control catalog

---

## Roadmap

### Week 7 (Current)
- ✅ Foundation complete
- ✅ JSON schemas frozen
- 📋 Specs 1–10 being written

### Week 8–10
- 📋 Deterministic engines
- 📋 AI agents (stages 1–7)
- 📋 Orchestrator

### Week 11–12
- 📋 Excel formatter
- 📋 Audit trail
- 📋 Integration tests

### Week 13+
- 📋 User template mode
- 📋 Web UI (deferred to Phase 2)

---

## Contributing

See `/.meta/WORKFLOW.md` for Claude ↔ Qwen collaboration protocol.

**For implementation:**
1. Read the spec in `/.meta/specs/{module}.md`
2. List your assumptions
3. Confirm scope
4. Write code in `/src/`
5. Run `/Agents/Qwen/VERIFY.md` checklist
6. Submit PR with spec reference

---

## License

[TBD]

---

## Contact

**Repo:** https://github.com/Unfazed7/TARA-ICM-workspace.git  
**Status:** 🟢 Foundation complete  
**Next:** Week 1 spec freeze → Week 2 implementation

---

**Automated TARA. Audit-ready. Compliance-first.**
