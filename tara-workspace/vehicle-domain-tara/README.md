# Vehicle & Domain Level TARA

**Status:** 🔲 Future — not yet active

This folder will contain the Vehicle & Domain Level TARA module when development begins.

## Scope

- Vehicle-level TARA (ISO/SAE 21434 §15 full scope)
- Domain-level TARA (combined with vehicle-level)
- Asset types: ECUs, CAN signals, vehicle functions, OBD-II interface, telematics units
- Feasibility method: ISO 21434 AFR (5 sub-factors: elapsed time, expertise, knowledge, opportunity, equipment)
- Impact dimensions: SFOP (Safety, Financial, Operational, Privacy)
- Threat library: AUTOSAR threats, UDS attacks, CAN injection, replay attacks

## How to Activate

When ready to implement:
1. Add `CLAUDE.md` (Layer 0 identity)
2. Add `CONTEXT.md` (stage routing)
3. Add `_config/` with vehicle-domain-specific knowledge files
4. Add `_engines/` with ISO 21434 AFR calculator
5. Add `stages/` with vehicle-domain stage agents
6. Add `orchestrator/run-vehicle-tara.js`
7. Register in `tara-workspace/CLAUDE.md` routing table
8. Write spec in `.meta/specs/vehicle-domain-tara-architecture.md`

**Do not copy files from `web-based-tara/` — derive from scratch for this domain.**
