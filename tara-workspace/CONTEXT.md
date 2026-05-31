# TARA Lima — Top-Level TARA Type Dispatcher (Layer 1)

Loaded by top-level orchestrator. Routes each assessment to the correct TARA type workspace.

---

## TARA Type Registry

| Type | Folder | Stage Count | Standards |
|------|--------|------------|-----------|
| `web-based` | `web-based-tara/` | 8 stages | ISO 21434 + ISO 27001 + OWASP + CVSS v3.1 |
| `vehicle-domain` | `vehicle-domain-tara/` | TBD | ISO 21434 §15 + UNECE WP.29/R155 |
| `ecu-component` | `ecu-component-tara/` | TBD | ISO 21434 §15 + AUTOSAR + UDS |

---

## Routing Logic

```
Assessment starts
    ↓
Orchestrator reads config.tara_type
    ↓
'web-based'      → load web-based-tara/CONTEXT.md → run web-based-tara/orchestrator/
'vehicle-domain' → load vehicle-domain-tara/CONTEXT.md → run vehicle-domain-tara/orchestrator/
'ecu-component'  → load ecu-component-tara/CONTEXT.md → run ecu-component-tara/orchestrator/
```

---

## Type Selection Guide

| System Under Assessment | Use This Type |
|------------------------|---------------|
| SaaS diagnostic portal, OTA backend, telematics cloud API | `web-based` |
| Full vehicle, system-of-systems, vehicle + cloud combined | `vehicle-domain` |
| Individual ECU, body controller, gateway module | `ecu-component` |
| Hardware component, sensor, actuator | `ecu-component` |
| OEM internal IT system | `web-based` |

---

## Shared Resources

The following are shared across all TARA types (do not duplicate inside type folders):

| Resource | Location | Used By |
|----------|----------|---------|
| JSON schema contracts | `.meta/specs/00-json-schema-contracts.md` | All types |
| Audit trail logger | `shared/audit-trail.js` | All types (TBD) |
| Excel formatter base | `shared/excel-formatter.js` | All types (TBD) |
| ISO 21434 risk matrix | Each type's `_config/` (may differ) | Per type |
