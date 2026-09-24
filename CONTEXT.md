# TARA Aegis — Domain Glossary

Shared language for TARA Aegis, a tool that produces ISO/SAE 21434 threat analysis and risk assessments for automotive systems. This is a glossary only; ICM routing files elsewhere in the repo are also named `CONTEXT.md` but serve a different purpose.

## Language

### Assessment scope

**TARA type**:
The kind of system a TARA is conducted on: web-based, vehicle-level, domain-level, or ECU/component-level.
_Avoid_: TARA mode, TARA flavour

**Item**:
The system under assessment, bounded as defined by ISO/SAE 21434 §15.3.
_Avoid_: target, system under test, scope

**Item Definition**:
The description of one **Item** — its elements, the links between them, and its boundary.
_Avoid_: item def, boundary definition, architecture model

**Web Item Definition**:
The **Item Definition** variant for web-based TARAs, expressed in cloud and web vocabulary (services, clusters, networks, APIs).
_Avoid_: cloud item definition

**Vehicle Item Definition**:
The single **Item Definition** variant shared by vehicle-level, domain-level, and ECU/component-level TARAs, expressed in in-vehicle vocabulary (ECUs, buses, gateways).
_Avoid_: ECU item definition, hardware item definition

**Boundary statement**:
An analyst-written sentence naming the **Item** and what sits at its edge.
_Avoid_: scope statement, boundary prompt

## Relationships

- Every **TARA type** uses exactly one **Item Definition** variant: web-based uses the **Web Item Definition**; the other three share the **Vehicle Item Definition**.
- An **Item Definition** describes exactly one **Item**, and is anchored by exactly one **Boundary statement**.

## Example dialogue

> **Dev:** "The OTA backend diagram shows a telematics ECU. Do we run the **Vehicle Item Definition** too?"
> **Domain expert:** "No — it's a web-based TARA, so only the **Web Item Definition** runs. The two variants never blend in one assessment."

## Flagged ambiguities

- "Item Definition" was used for both a single shared agent and a per-type agent — resolved: there are two variants (**Web** and **Vehicle**), never merged, so a web-based TARA of a system touching vehicle ECUs doesn't produce a blend of both.
