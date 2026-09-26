# Spec 12b: Item Definition Model (Stage 02)

**Status:** Revised after analyst review round 1 (B1 gate)
**Schema:** `src/schemas/stage-02-item-definition.schema.json`
**Decisions:** D-15, D-20, D-21

## Goal

Define the Web Item Definition built from CP0-confirmed facts.

## Success Criteria

```bash
node --test tests/schemas.test.js   # valid Stage 02 fixture passes, invalid ones fail
```

## File Ownership

WILL touch: the schema above, `tests/fixtures/valid|invalid/stage-02-*`, `tests/schemas.test.js`.
WON'T touch: agents, API code (C3, C8).

## Input/Output

- **Item:** item name; boundary statement with a `proposed` flag (true when the agent wrote it).
- **Container** (`CTR-##`) and **Zone** (`ZN-##`): kind, name, supporting facts; containers also have a parent and a zone. Kinds are listed in the schema (from DR-13 and DR-14).
- **Element** (`EL-###`): name, kind (`unknown_kind` needs a `kind_label`), parent container, zone, provider, hosting type, internet exposed (yes, no, unknown, with evidence), entry-point flag, authentication method, owner or operator, data handled, stated security configuration, supporting facts, confidence.
- **Data item:** specific item if known, one category (`unspecified` if only a category is known); for keys and credentials also purpose, where held, who can use it.
- **Link** (`IF-##`): type (data flow, exposure), source, destination, direction, protocol (transport or application only), port, usage at destination, authentication and encryption (named or "unknown"), data carried, crosses trust boundary, remark, inferred-from-text flag, supporting facts, confidence; optional sync/async, rate limiting, volume.
- **Function** (`FN-###`): name, plain description, actors, elements involved, endpoints, data read, data written, privileged flag, supporting facts.
- **Assumption** (`ASM-##`), responsibility split (provider side, customer side), stated controls and stated absences (as fact ids), stakeholders.

## Process

Stage 02 (C8) builds these from confirmed facts only; the server checks every reference before storing.

## Validation Rules

1. Every element, link, container, zone and function has at least one supporting fact.
2. An entry point, or an element exposed to the internet, has an authentication method.
3. OAuth2, OIDC, SAML, TLS, mTLS, API keys, JWT, X.509, IAM roles and session cookies are never protocols; they go in authentication or encryption. So the protocol is `mqtt`, not "MQTT over TLS"; plain `http` is recorded as `http` (an unencrypted endpoint is a finding).
4. A link with no diagram behind it has `inferred_from_text: true`.
5. The zone decides the parent. In the external zones (`internet_external`, `corporate_it`, `third_party_saas`, `vehicle_field_device`) an element has no parent container. In every other zone it has exactly one. There is no "external" container kind: containers describe real cloud structure only (refusal R-13).
6. Containers are never elements; a vehicle is one `external_vehicle_system` element.

## Error Conditions

Refusals are in specs 12d (R-03, R-04, R-12, R-13) and 12e (R-11).

## Verification Steps

```bash
node --test tests/schemas.test.js
```
