# Scoping Facts (Layer 3)

> **INTERNAL. Never quote or paraphrase rule IDs or this file to the analyst.** Show the scope decision and a plain reason instead (see `analyst-language.md`).

Used by: Stage 02 (Item Definition). Source: DR-6 and DR-7 in `.meta/CLAUDE-CODE-INSTRUCTIONS.md`, decisions D-05, D-06, D-29.

---

## 1. Fact types (the stable part)

| ID | Fact type | Question template (fill the placeholders, reword for this system) |
|---|---|---|
| FT-01 | Who runs it | "Is {name} a service your cloud provider runs, or something your team installed and runs itself?" |
| FT-02 | Who controls its settings and permissions | "Who decides who can use {name} and who changes its settings?" |
| FT-03 | Dedicated or shared | "Is {name} used only by {item}, or also by other systems in the company?" |
| FT-04 | Where it can be reached from | "Can {name} be reached from the internet, or only from inside the network?" |
| FT-05 | What data it holds or carries | "What data does {name} store or carry? Does it include personal data, keys or credentials?" |
| FT-06 | Which environment, and what it shares | "Do test or staging environments share accounts, databases, keys or credentials with production?" |
| FT-07 | Whether it can push changes into the item | "Can {name} deploy code or infrastructure to production? Where are its credentials kept?" |

Facts outside FT-01 to FT-07 are asked as `generic` questions with a short topic (for example "authentication between gateway and service"). The same wording rules apply.

---

## 2. Rule mapping (answer to decision)

| Rule | Applies to | Facts needed | Answer -> decision | Default if unanswered (marked "assumed") |
|---|---|---|---|---|
| S1 Account | cloud account container | FT-01, FT-03 on the account | Own account: everything deployed in it is inside. Shared account: only the item's resources are inside; shared ones are flagged | Own account |
| S2 Plumbing | load balancer, NAT gateway, internet gateway, VPC endpoint, network interconnect | FT-02, plus generic "does it act on requests" | Forward only: in scope, configuration only for Stage 03. Acts on requests (authentication, filtering, TLS termination): full element | Forward only |
| S3 Managed service | any element with hosting type `managed` | FT-01, FT-02 | Provider-run: provider internals out (recorded as an assumption), customer-controlled surface in. Team-run: fully in scope | Provider-run, split |
| S4 Identity provider | identity provider | FT-03, FT-02, generic "where the token is checked" | Shared and run by central IT: interface, the item's token check in scope. Dedicated and run by the product team: in scope as configuration. Mixed: ambiguous, both options shown | Shared, interface |
| S5 Vehicle | external vehicle system, field device, IoT device gateway | generic "which vehicle unit it talks to", generic "is the in-vehicle side assessed elsewhere" | One interactor per vehicle-side identity, out of scope; the cloud endpoint of each channel in scope. In-vehicle asked to be in scope here: ambiguous, suggest a separate vehicle TARA | Out of scope, assessed elsewhere |
| S6 Third party | third-party SaaS, notification gateway, payment gateway, mapping provider, partner or OEM backend | FT-05, generic "how the item authenticates to it" | Interface element; the outbound link, the data it carries and the credentials the item holds are in scope | Interface |
| S7 Supply chain | CI/CD pipeline, IaC runner, container registry | FT-07 | Anything that can push code or infrastructure into the item is in scope, wherever it is hosted | In scope |
| S8 Monitoring and audit | monitoring and logging, audit trail, security detection tooling | FT-05, generic "who can read or delete the logs" | In scope; data category recorded | In scope |
| S9 Environments | cloud account container, once per item | FT-06 | Nothing shared: other environments out. Something shared: ambiguous | Nothing shared, marked assumed |
| S10 Actors and user devices | human actor, web frontend, mobile app, admin portal, system-to-system client | generic "who uses it and from which devices", generic "are admin machines managed" | Interactors, never broken down; admin access paths in scope | Interactors, admin paths in scope |
| S11 Nothing silent | every element | none | Every out-of-scope element has a recorded reason | not applicable |
| S12 Stated absences | facts of type `absence_stated` | none | Recorded as facts ("no WAF"); never turned into elements | not applicable |
| S13 Undocumented components | anything not in the confirmed facts | none | Becomes a question, never an element | not applicable |
| S14 No blending | whole item | none | Never use vehicle-variant structure; a vehicle is one external element | not applicable |

---

## 3. Triggers per element kind

Which fact types each kind needs. "S1 only" means the kind sits inside the item's own account and is in scope by the account rule; no scoping question is needed, but FT-05 may still be asked to record data for Stage 03.

| Element kind | Fact types asked | Rules |
|---|---|---|
| `cluster_control_plane` | FT-01, FT-02 | S3 |
| `worker_nodes` | FT-01 | S1, S3 |
| `pod_runtime` | none: runs inside an in-scope cluster | S1 only |
| `ecs_service` | FT-05 | S1 only |
| `microservice_workload` | FT-05 | S1 only |
| `serverless_function` | FT-05 | S1, S3 |
| `api_gateway` | FT-01, FT-02, FT-04 | S2, S3 |
| `load_balancer` | FT-02, FT-04, generic "does it act on requests" | S2 |
| `waf` | FT-01, FT-02 | S3 |
| `cdn` | FT-01, FT-02, FT-04 | S3 |
| `database` | FT-01, FT-02, FT-05 | S3 |
| `object_storage_bucket` | FT-02, FT-04, FT-05 | S3 |
| `cache` | FT-01, FT-05 | S3 |
| `queue_stream` | FT-01, FT-05 | S3 |
| `identity_provider` | FT-02, FT-03, generic "where the token is checked" | S4 |
| `secrets_store` | FT-01, FT-02, FT-05 | S3 |
| `kms_key` | FT-01, FT-02, FT-05 | S3 |
| `certificate_authority` | FT-01, FT-02, FT-03 | S3, S4 |
| `monitoring_logging` | FT-05, generic "who can read or delete the logs" | S8 |
| `audit_trail_config_recorder` | FT-05, generic "who can read or delete the records" | S8 |
| `security_detection_tooling` | FT-01, FT-02 | S8 |
| `landing_zone_governance` | FT-02, FT-03 | S1 |
| `ci_cd_pipeline` | FT-07 | S7 |
| `iac_runner` | FT-07 | S7 |
| `container_registry` | FT-07, FT-02 | S7 |
| `nat_gateway` | FT-02 | S2 |
| `internet_gateway` | FT-02 | S2 |
| `vpc_endpoint` | FT-02 | S2 |
| `network_interconnect` | FT-02, FT-03 | S2 |
| `network_boundary_configuration` | none: always in scope as the configuration of an in-scope network | S1 only |
| `dns` | FT-01, FT-02 | S3 |
| `bastion_session_manager` | FT-02, FT-04 | S10 |
| `in_cluster_platform_component` | FT-01, FT-07 | S1, S7 |
| `workflow_engine` | FT-01, FT-05 | S3 |
| `iot_device_gateway` | FT-01, FT-04, generic "which vehicle unit it talks to" | S3, S5 |
| `device_provisioning_service` | FT-01, FT-05 | S3, S5 |
| `signing_service` | FT-01, FT-02, FT-05 | S3 |
| `data_warehouse` | FT-01, FT-03, FT-05 | S3 |
| `stream_processing_etl` | FT-01, FT-05 | S3 |
| `backup_store` | FT-02, FT-05, FT-06 | S3, S9 |
| `file_storage` | FT-02, FT-05 | S3 |
| `notification_gateway` | FT-05, generic "how the item authenticates to it" | S6 |
| `payment_gateway` | FT-05, generic "how the item authenticates to it" | S6 |
| `mapping_provider` | FT-05, generic "how the item authenticates to it" | S6 |
| `third_party_saas` | FT-05, generic "how the item authenticates to it" | S6 |
| `partner_oem_backend` | FT-03, FT-05, generic "how the item authenticates to it" | S6 |
| `web_frontend` | FT-04, generic "who uses it and from which devices" | S10 |
| `mobile_app` | FT-05, generic "who uses it and from which devices" | S10 |
| `admin_portal` | FT-04, generic "are admin machines managed" | S10 |
| `field_device` | generic "which vehicle unit it talks to" | S5 |
| `external_vehicle_system` | generic "which vehicle unit it talks to", generic "is the in-vehicle side assessed elsewhere" | S5 |
| `human_actor` | generic "who uses it and from which devices" | S10 |
| `system_to_system_client` | FT-03, generic "how it authenticates to the item" | S10 |
| `unknown_kind` | FT-01 to FT-07 (all) | see section 4 |

Only ask a fact the confirmed facts do not already answer (DR-6, guard 2). At most 3 visible questions per target, 7 for `unknown_kind`.

Container triggers: `cloud_account` gets FT-01 and FT-03 (S1) and FT-06 once per item (S9). Other containers need no question.

---

## 4. Unknown element kinds

1. Ask the full fact set FT-01 to FT-07.
2. Log the kind to `stages/02-item-definition/output/new-kinds.log` with its label and the element id.
3. If no existing rule fits the answers, mark the element `ambiguous` and say why in plain words. Never force it into the nearest rule.
4. Only a human adds new rules to this file.
