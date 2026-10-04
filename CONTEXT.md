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
Stage 01, which reads every **Client document** once and turns it into **Facts** with **Source references** and a **Document register**, then hands over to **Item Definition** automatically.
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

### Review

**Rationale**:
The section below each stage's output that lists every assumption, conflict, ambiguity and gap the stage met, each with what was concluded, why (sources with quotes), what was assumed and what would change it. The analyst can mark each item confirmed or disputed at any time; this never stops or re-runs the pipeline.
_Avoid_: checkpoint, review gate, flags, warnings

**Assumptions**:
What the analyst sees on screen for the **Rationale**: a panel opened from the top bar, for the current stage or all stages, grouped by topic (exposure, sign-in, scope, environment, data, naming, reading notes), with items that need the analyst first (D-46).
_Avoid_: rationale panel, flags list

**Review status**:
The analyst's mark on a **Rationale** item: unreviewed, confirmed, or disputed with a note.
_Avoid_: approval, sign-off

**Agreed**:
The label for items stated by two or more documents with no conflict; listed last in the **Rationale**.
_Avoid_: confirmed, verified, green

**Single source**:
The label for items stated by only one document.
_Avoid_: unverified, weak

**Needs you**:
The label for conflicts, gaps, assumptions, scope questions and low-confidence reads; listed first in the **Rationale**, never blocking.
_Avoid_: flagged, warnings, issues

**Open question**:
A question the documents do not answer, put to the analyst first and sent to the client only if the analyst cannot answer it.
_Avoid_: gap, TBD, clarification

**Fact type**:
One of the fixed kinds of fact the tool asks about to decide scope, such as who runs a component or where it can be reached from.
_Avoid_: question category, scoping criterion

**Analyst decision**:
A recorded change or answer made by the analyst on a stage page; it outranks every document and is re-applied on re-runs.
_Avoid_: override, manual edit, correction

### Item Definition content (Stage 02)

**Element**:
One independently deployed or configured part of the system, or an actor or external party it interacts with, inside exactly one **Container**.
_Avoid_: component, node, box

**Asset type**:
What sort of thing an **Element** is, such as load balancer, ECS service or human actor, from the fixed list in the Stage 02 schema (`asset_type`). Decides which scoping rules and questions apply (D-46).
_Avoid_: kind, element kind, component type

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
- The flow is: **Input Normalization** (Stage 01), then **Item Definition** (Stage 02) automatically, then **Asset Identification** (Stage 03). Each stage shows its output with its **Rationale** below.
- Only **Input Normalization** reads **Client documents**; **Item Definition** is built only from **Facts** that are not rejected and **Analyst decisions**.
- **Asset Identification** onwards reads only the stored **Item Definition** and later stage outputs.
- Every **Fact** has one or more **Source references**, and each **Source reference** points to one entry in the **Document register**.
- Every **Element** sits in exactly one **Container**, has one **Scope decision**, and is supported by at least one **Fact**.
- A **Link** joins exactly two **Elements**; it crosses a trust boundary when they sit in different **Zones**.
- One **Element** yields zero or more **Assets**; a **Container** never yields an **Asset**.
- Every **Fact** carries exactly one of the labels **Agreed**, **Single source** or **Needs you**.

## Example dialogue

> **Dev:** "The OTA backend diagram shows a telematics ECU. Do we run the **Vehicle Item Definition** too?"
> **Domain expert:** "No. It's a web-based TARA, so only the **Web Item Definition** runs, and the ECU is one external **Element** at the edge. The two variants never blend in one assessment."
> **Dev:** "The diagram also shows a load balancer the client's written answers never mention. Is that an **Element** now?"
> **Domain expert:** "Yes, but it is flagged. It's a **Fact** from one document that conflicts with another, so **Item Definition** applies the safer default, treats it as public, and writes a **Rationale** item explaining both sides. The analyst can confirm or dispute that later without stopping the run."

## Flagged ambiguities

- "Input Normalization" originally meant a stage that turned a CSV or diagram directly into rated assets. Later it was briefly defined as running together with **Item Definition** as one step. Resolved: they are two stages that run one after the other. Input Normalization only reads **Client documents** into **Facts**; **Item Definition** builds from those **Facts**.
- "Item Definition" was used for both a single shared agent and a per-type agent. Resolved: there are two variants (**Web** and **Vehicle**), never merged, so a web-based TARA of a system touching vehicle ECUs does not produce a blend of both.
- "Interface" was used both for a connection and for a scope status. Resolved: a connection is a **Link**; "interface" is only a **Scope decision** status.
- **Element** and **Asset** were used interchangeably. Resolved: an **Element** is a part of the system; an **Asset** is something inside an **Element** worth protecting. One **Element** can yield several **Assets** or none.
- "Kind" was used for what sort of thing an **Element** is. Resolved: it is the **Asset type** (D-46). Stage 03 also uses the words "asset type" for its own list of **Asset** sorts (for example credentials); that list is separate and on hold, and must be reconciled when Stage 03 resumes.
- "CP0" and "CP1" were analyst checkpoints that stopped the pipeline after Stages 01 and 02. Replaced by the **Rationale** section on each stage page, which never blocks (D-36, D-37).
