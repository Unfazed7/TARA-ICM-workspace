# ECU & Component Level TARA

**Status:** 🔲 Future — not yet active

This folder will contain the ECU & Component Level TARA module when development begins.

## Scope

- ECU-level TARA (ISO/SAE 21434 §15 focused scope)
- Component-level TARA (combined with ECU-level)
- Asset types: firmware images, HSM, secure boot chain, cryptographic keys, NVM, CAN interfaces
- Feasibility method: ISO 21434 AFR (5 sub-factors: elapsed time, expertise, knowledge, opportunity, equipment)
- Impact dimensions: SFOP (Safety, Financial, Operational, Privacy)
- Threat library: JTAG/debug port attacks, firmware extraction, key extraction, SWP attacks, glitch attacks

## How to Activate

When ready to implement:
1. Add `CLAUDE.md` (Layer 0 identity)
2. Add `CONTEXT.md` (stage routing)
3. Add `_config/` with ECU/component-specific knowledge files
4. Add `_engines/` with ISO 21434 AFR calculator
5. Add `stages/` with ECU/component stage agents
6. Add `orchestrator/run-ecu-tara.js`
7. Register in `tara-workspace/CLAUDE.md` routing table
8. Write spec in `.meta/specs/ecu-component-tara-architecture.md`

**Do not copy files from `web-based-tara/` — derive from scratch for this domain.**
