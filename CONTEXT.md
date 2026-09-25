# TARA Aegis: Domain Glossary

Shared language for TARA Aegis, a tool that produces ISO/SAE 21434 threat analysis and risk assessments for automotive systems. This is a glossary only. ICM routing files elsewhere in the repo are also named `CONTEXT.md`, but they serve a different purpose.

## Language

### Assessment scope

**TARA type**:
The kind of system a TARA is conducted on: web-based, vehicle-level, domain-level, or ECU/component-level.
_Avoid_: TARA mode, TARA flavour

**Item**:
The system under assessment, bounded as defined by ISO/SAE 21434 clause 9.3.
_Avoid_: target, system under test, scope

**Item Definition**:
The description of one **Item**: its **Elements**, the **Links** between them, and its boundary.
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

### Reading client documents (Stage 01)

**Client documents**:
The foundational material a client supplies for a TARA (architecture diagrams, functional documents, feature lists, topology exports, existing item definitions).
_Avoid_: inputs, uploads, source files

**Input Normalization**:
Stage 01, which reads every **Client document** once and turns it into **Facts** with **Source references** and a **Document register**, followed by **CP0**.
_Avoid_: ingestion, intake, parsing stage

**Document register**:
The record of every **Client document** received, with its version, date, type, environment described, read status, and what it was used for or ignored.
_Avoid_: file list, upload list, document index

**Fact**:
One statement about the system taken from the **Client documents**, carrying at least one **Source reference**.
_Avoid_: finding, observation, extracted data

**Source reference**:
A pointer from a **Fact** to one document in the **Document register**: the location (page, sheet, section or diagram region) and a short quote.
_Avoid_: citation, provenance, evidence link

### Checkpoints

**CP0 / Reading review**:
The analyst checkpoint after **Input Normalization** where the analyst confirms what was read and how, before anything is built from it.
_Avoid_: document review, intake check

**CP1 / Item Definition review**:
The analyst checkpoint after **Item Definition** where scope, boundary and assumptions are confirmed, corrected and finalized.
_Avoid_: boundary review, CP1 screen

**Agreed**:
The checkpoint group for items stated by two or more documents with no conflict; shown collapsed and checked by spot check.
_Avoid_: confirmed, verified, green

**Single source**:
The checkpoint group for items stated by only one document; the analyst skims them and can accept all at once.
_Avoid_: unverified, weak

**Needs you**:
The checkpoint group for conflicts, gaps, assumptions, scope questions and low-confidence reads; each one must be answered before the checkpoint can be confirmed.
_Avoid_: flagged, warnings, issues

**Open question**:
A question the documents do not answer, put to the analyst first and sent to the client only if the analyst cannot answer it.
_Avoid_: gap, TBD, clarification

**Fact type**:
One of the fixed kinds of fact the tool asks about to decide scope, such as who runs a component or where it can be reached from.
_Avoid_: question category, scoping criterion

**Analyst decision**:
A recorded change or answer made by the analyst at a checkpoint; it outranks every document and is re-applied on re-runs.
_Avoid_: override, manual edit, correction

### Item Definition content (Stage 02)

**Element**:
One independently deployed or configured part of the system, or an actor or external party it interacts with, inside exactly one **Container**.
_Avoid_: component, node, box

**Container**:
A grouping that holds **Elements** but is not one itself, such as a cloud account, region, VPC, subnet or cluster.
_Avoid_: group, parent element

**Zone**:
An area of equal trust that **Elements** sit in, such as internet, public subnet, private subnet or third-party SaaS; crossing between zones marks a trust boundary.
_Avoid_: trust area, security domain, segment

**Link**:
A connection between two **Elements**: a data flow (an intended exchange) or an exposure (reachability without an intended exchange).
_Avoid_: interface, edge, connection, arrow

**Scope decision**:
The status of one **Element** (in scope, interface, out of scope, or ambiguous) with a plain reason and the **Facts** and answers it rests on.
_Avoid_: scoping, classification, verdict

### Assets (Stage 03)

**Asset Identification**:
Stage 03, which derives **Assets** only from the finalized **Item Definition**, never from **Client documents**.
_Avoid_: asset analysis, asset extraction

**Asset**:
Something inside an in-scope or interface **Element** that is worth protecting, with the CIAAAN properties that apply to it.
_Avoid_: element, component, resource

## Relationships

- Every **TARA type** uses exactly one **Item Definition** variant: web-based uses the **Web Item Definition**; the other three share the **Vehicle Item Definition**.
- An **Item Definition** describes exactly one **Item**, and is anchored by exactly one **Boundary statement**.
- The flow is: **Input Normalization** (Stage 01), **CP0 / Reading review**, **Item Definition** (Stage 02), **CP1 / Item Definition review**, **Asset Identification** (Stage 03).
- No stage after **CP0** re-reads **Client documents**; **Item Definition** is built only from **Facts** confirmed at **CP0** and **Analyst decisions**.
- No stage after **CP1** reads anything except the finalized **Item Definition** and later stage outputs.
- Every **Fact** has one or more **Source references**, and each **Source reference** points to one entry in the **Document register**.
- Every **Element** sits in exactly one **Container**, has one **Scope decision**, and is supported by at least one **Fact**.
- A **Link** joins exactly two **Elements**; it crosses a trust boundary when they sit in different **Zones**.
- One **Element** yields zero or more **Assets**; a **Container** never yields an **Asset**.
- At each checkpoint every item is in exactly one of **Agreed**, **Single source** or **Needs you**.

## Example dialogue

> **Dev:** "The OTA backend diagram shows a telematics ECU. Do we run the **Vehicle Item Definition** too?"
> **Domain expert:** "No. It's a web-based TARA, so only the **Web Item Definition** runs, and the ECU is one external **Element** at the edge. The two variants never blend in one assessment."
> **Dev:** "The diagram also shows a load balancer the client's written answers never mention. Is that an **Element** now?"
> **Domain expert:** "Not yet. It's a **Fact** from one document that conflicts with another, so it goes to **Needs you** at **CP0**. Only after the analyst confirms it does **Item Definition** turn it into an **Element**."

## Flagged ambiguities

- "Input Normalization" originally meant a stage that turned a CSV or diagram directly into rated assets. Later it was briefly defined as running together with **Item Definition** as one step. Resolved: they are two stages separated by **CP0**. Input Normalization only reads **Client documents** into **Facts**; **Item Definition** builds from confirmed **Facts**.
- "Item Definition" was used for both a single shared agent and a per-type agent. Resolved: there are two variants (**Web** and **Vehicle**), never merged, so a web-based TARA of a system touching vehicle ECUs does not produce a blend of both.
- "Interface" was used both for a connection and for a scope status. Resolved: a connection is a **Link**; "interface" is only a **Scope decision** status.
- **Element** and **Asset** were used interchangeably. Resolved: an **Element** is a part of the system; an **Asset** is something inside an **Element** worth protecting. One **Element** can yield several **Assets** or none.
