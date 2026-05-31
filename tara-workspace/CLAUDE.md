# TARA Lima — Multi-Type Workspace Router (Layer 0)

**Tool:** TARA Lima — Automated Threat Analysis & Risk Assessment  
**Model:** claude-sonnet-4-20250514  
**Design:** Each TARA type is fully isolated in its own subfolder.

---

## Supported TARA Types

| Folder | Type | Status |
|--------|------|--------|
| `web-based-tara/` | Web-Based Application TARA | ✅ Active — MVP |
| `vehicle-domain-tara/` | Vehicle & Domain Level TARA | 🔲 Future |
| `ecu-component-tara/` | ECU & Component Level TARA | 🔲 Future |

---

## Why Isolated Folders?

Each TARA type differs in:
- Asset taxonomy (web assets vs ECUs vs CAN signals)
- Cybersecurity properties (CIAAAN for web; CIA for hardware)
- Feasibility method (CVSS v3.1 for web; ISO 21434 AFR for hardware)
- Threat library (OWASP + API threats vs AUTOSAR/UDS/OBD threats)
- Impact dimensions (web: 7-dimension; automotive: SFOP)
- Standards emphasis (NIST 800-53 / ISO 27001 for web; ISO 21434 Clause 15 for ECU)

Isolating them means adding a new TARA type never touches the existing ones.

---

## How the Orchestrator Routes

```javascript
// run-tara.js (top-level)
const type = config.tara_type; // 'web-based' | 'vehicle-domain' | 'ecu-component'
const workspace = {
  'web-based':      './web-based-tara/orchestrator/run-web-tara.js',
  'vehicle-domain': './vehicle-domain-tara/orchestrator/run-vehicle-tara.js',
  'ecu-component':  './ecu-component-tara/orchestrator/run-ecu-tara.js',
};
require(workspace[type]).run(config);
```

---

## Adding a New TARA Type

1. Create `{type}-tara/` folder
2. Add `CLAUDE.md` (Layer 0 identity for that type)
3. Add `CONTEXT.md` (stage routing for that type)
4. Add `_config/` (type-specific domain knowledge)
5. Add `_engines/` (type-specific deterministic calculators)
6. Add `stages/` (type-specific stage agents)
7. Add `orchestrator/run-{type}-tara.js`
8. Register in this file's routing table above
9. Write spec in `.meta/specs/{type}-tara-architecture.md`

**Never modify another type's folder. Isolation is the contract.**

---

**Load next:** Read `web-based-tara/CLAUDE.md` for web TARA identity.  
**This file is read-only at runtime.**
