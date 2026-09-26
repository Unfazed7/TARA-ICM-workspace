# Link Model (Layer 3)

Used by: Stage 02 (Item Definition). Source: DR-14, decisions D-21, D-29. Schema: `src/schemas/stage-02-item-definition.schema.json` (`links`, `zones`).

---

## 1. Two link types

| Type | Meaning | Example |
|---|---|---|
| `data_flow` | An intended exchange of data | The API gateway forwards rollout requests to the update service |
| `exposure` | Reachability without an intended exchange | The database accepts connections from the whole application subnet |

Both get `IF-##` IDs.

## 2. Attributes

**Mandatory:** ID, type, source element, destination element, direction (one way or both ways), protocol, usage at destination, authentication mechanism (named, or "unknown"), encryption (named, or "unknown"), data carried (with categories from `element-kinds.md`), crosses trust boundary, remark (a security-relevant observation, may be empty), inferred-from-text flag, supporting facts, confidence.

**If known:** port. **Optional:** sync or async, rate limiting, volume.

An unknown authentication or encryption mechanism is a gap: ask a question on the link itself (target `IF-##`).

## 3. Protocols

Transport and application protocols only.

| Value | Covers |
|---|---|
| `http` | Plain HTTP (unencrypted; always worth a remark) |
| `https_rest` | HTTPS and REST APIs |
| `graphql` | GraphQL |
| `grpc` | gRPC |
| `websocket` | WebSocket |
| `ocpp` | EV charging protocols such as OCPP |
| `mqtt` | MQTT (TLS goes in encryption) |
| `amqp` | AMQP |
| `kafka` | Kafka |
| `cloud_messaging_api` | Kinesis, SQS, SNS and similar APIs |
| `sql_wire` | SQL database wire protocols |
| `redis` | Redis |
| `s3_api` | Object storage API |
| `presigned_url` | Pre-signed download or upload URLs |
| `sigv4_service_api` | Signed cloud service API calls |
| `imds` | Instance metadata service |
| `nfs` | Network file system |
| `smtp` | Email |
| `sms_gateway_api` | SMS gateway API |
| `payment_gateway_api` | Payment gateway API |
| `webhook` | Webhooks, including payment callbacks |
| `jwks_fetch` | Fetching token signing keys |
| `dns` | DNS |
| `ssh` | SSH |
| `session_manager` | Managed session access |
| `sftp` | SFTP |
| `vpn_ipsec` | VPN or IPsec |
| `direct_connect` | Dedicated private connection |
| `other` | Named in the remark |
| `unknown` | Not documented; becomes a question |

**Never protocols:** OAuth2, OIDC, SAML, TLS, mTLS, API keys, JWT, X.509, IAM roles, session cookies. Record them as authentication or encryption.

## 4. Zones

| Kind | Meaning |
|---|---|
| `internet_external` | The public internet and anyone on it |
| `edge_public_subnet` | Public subnet or edge services |
| `private_application_subnet` | Private subnet where application services run |
| `data_subnet` | Separate data subnet (only if a separate subnet group is documented) |
| `account_managed_services` | Managed services outside any network |
| `control_management_plane` | Administrative and management access |
| `governance_account` | Organisation governance account (only if documented) |
| `corporate_it` | The company's own IT (for example central sign-in) |
| `third_party_saas` | Outside service providers |
| `vehicle_field_device` | Vehicles and field devices |

Never invent a zone the confirmed facts do not show. A drawn box is a zone only if it is labelled as one or confirmed by text.

The four external zones are `internet_external`, `corporate_it`, `third_party_saas` and `vehicle_field_device`; elements there have no parent container (D-27).

## 5. Trust boundaries

A link crosses a trust boundary when its source and destination sit in different zones. The server computes this from the zones; the agent does not decide it.

## 6. Inferred links

If no diagram was supplied, every link is marked `inferred_from_text: true`. A link read only from an image has confidence no higher than medium. A link with an unclear endpoint becomes a question, not a guess. Managed services drawn as a sidebar with one generic arrow produce no per-service links.
