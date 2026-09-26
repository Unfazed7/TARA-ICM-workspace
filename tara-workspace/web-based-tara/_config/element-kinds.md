# Element Kinds (Layer 3)

Used by: Stage 02 (Item Definition), and the synonym table by the reconciliation engine (C5). Source: DR-13, decisions D-20, D-27. Schema: `src/schemas/stage-02-item-definition.schema.json`.

---

## 1. Containers (never elements)

| Kind | What it is |
|---|---|
| `cloud_account` | A cloud account or subscription hosting the item |
| `region` | A cloud region inside an account |
| `vpc` | A virtual network |
| `subnet` | A subnet inside a network; usually maps to a zone |
| `availability_zone` | A data-centre zone, only if documents make it matter |
| `cluster` | A Kubernetes or ECS cluster; parent of control plane, nodes and runtime |
| `namespace` | A namespace inside a cluster |
| `account_level_managed_services` | Holds managed services that sit outside any network (for example object storage, key service) |

Nesting: account > region > network > subnet > cluster > namespace > workload.
Each network also gets one `network_boundary_configuration` element (security groups, network ACLs, routes, endpoints).

**Parent rule (D-27):** an element inside the item's accounts has exactly one parent container. An element in an external zone (internet, corporate IT, third-party SaaS, vehicle or field device) has no parent container.

---

## 2. Element kinds

| Kind | What it is |
|---|---|
| `cluster_control_plane` | The cluster's management API and scheduler |
| `worker_nodes` | The machines a cluster runs workloads on |
| `pod_runtime` | The container runtime inside the cluster |
| `ecs_service` | A service in a container service without Kubernetes |
| `microservice_workload` | One deployed application service |
| `serverless_function` | A function, including API authorizers |
| `api_gateway` | A managed API front door |
| `load_balancer` | A load balancer |
| `waf` | A web application firewall |
| `cdn` | A content delivery network |
| `database` | One logical database |
| `object_storage_bucket` | One storage bucket |
| `cache` | An in-memory cache |
| `queue_stream` | A queue, topic or stream |
| `identity_provider` | A sign-in or identity service |
| `secrets_store` | A store for secrets and credentials |
| `kms_key` | One key in a key management service |
| `certificate_authority` | A service that issues certificates |
| `monitoring_logging` | Metrics and log collection |
| `audit_trail_config_recorder` | Audit trail or configuration history |
| `security_detection_tooling` | Threat detection and security posture tools |
| `landing_zone_governance` | Organisation-level guardrails (only if documented) |
| `ci_cd_pipeline` | Build and deploy pipeline |
| `iac_runner` | Infrastructure-as-code runner |
| `container_registry` | Container image registry |
| `nat_gateway` | Outbound address translation |
| `internet_gateway` | The network's route to the internet |
| `vpc_endpoint` | A private endpoint to a managed service |
| `network_interconnect` | Transit gateway, peering, VPN or direct connection |
| `network_boundary_configuration` | A network's security groups, ACLs, routes and endpoints |
| `dns` | Name resolution |
| `bastion_session_manager` | Administrative access path |
| `in_cluster_platform_component` | Ingress controllers, service mesh, operators |
| `workflow_engine` | Workflow or orchestration service |
| `iot_device_gateway` | Entry point for devices and vehicles |
| `device_provisioning_service` | Onboards devices and issues their identity |
| `signing_service` | Signs firmware, software or metadata |
| `data_warehouse` | Analytics store |
| `stream_processing_etl` | Stream processing or data pipelines |
| `backup_store` | Backups |
| `file_storage` | Shared file systems |
| `notification_gateway` | Email, SMS or push sending |
| `payment_gateway` | Payment processing |
| `mapping_provider` | Maps and location services |
| `third_party_saas` | Any other external software service |
| `partner_oem_backend` | A partner's or OEM's backend |
| `web_frontend` | Browser application |
| `mobile_app` | Mobile application |
| `admin_portal` | Administration interface |
| `field_device` | A device in the field that is not a vehicle |
| `external_vehicle_system` | A vehicle or vehicle unit; one element per vehicle-side identity, never broken down |
| `human_actor` | A person who uses or runs the system |
| `system_to_system_client` | Another system that calls the item |
| `unknown_kind` | Anything else; needs a `kind_label` and is logged for review |

---

## 3. Granularity

One element per independently deployed or configured unit with its own identity, access policy or distinct data content.

| Too fine (never) | Right | Too coarse (never) |
|---|---|---|
| one element per pod | one per deployed service | "the backend" |
| one per database table | one per logical database | one "Database" for several logical databases with different data |
| one per API endpoint | one per API gateway or service; endpoints go in functions | "the API" covering gateway, services and authorizers |
| one per storage prefix | one per bucket | one "S3" for buckets with different content |
| one per security group | one `network_boundary_configuration` per network | no network configuration at all |

---

## 4. Required attributes

ID, name, kind, parent container (unless in an external zone), zone, provider, hosting type (managed, self-hosted, unknown), internet exposed (yes, no, unknown, with evidence), owner or operator, supporting facts, confidence, and data handled for stores and processes. An authentication method is required for entry points and anything exposed to the internet. Stated security configuration is optional but wanted. No criticality field.

---

## 5. Actors

End user or customer; business operator or portal user; tenant or platform administrator; platform operator (SRE, DevOps); developer or CI identity; system-to-system client; support or helpdesk (only if documented); field device; external data sinks. Actors are interactors: never broken down.

---

## 6. Data categories

| Category | Use for |
|---|---|
| `pii_direct` | Personal data about people |
| `vehicle_linked_pii` | Data linked to a vehicle and so to a person (VIN, location) |
| `credentials_and_session_tokens` | Passwords, API keys, tokens, session cookies |
| `cryptographic_keys` | Keys; also record purpose, where held, who can use it |
| `certificates` | Certificates and chains |
| `firmware_software_artifacts` | Firmware and software packages |
| `signed_metadata` | Signed manifests and metadata |
| `configuration` | Settings and policies |
| `logs_and_telemetry` | Logs, metrics, telemetry |
| `audit_record_data` | Audit records; mark the store as a record store |
| `business_transactions` | Orders, rollouts, requests |
| `payment_data` | Card and payment data |
| `backups` | Backup copies |
| `unspecified` | Only a category is known; flagged for a question |

Record specific items when documents give them, plus one category.

---

## 7. Synonyms (for matching facts to kinds)

| Written in documents | Kind |
|---|---|
| ALB, NLB, ELB, application load balancer, ingress load balancer | `load_balancer` |
| API Gateway, API Management, APIM | `api_gateway` |
| Lambda, Cloud Functions, Azure Functions, authorizer | `serverless_function` |
| EKS, AKS, GKE, Kubernetes, ECS cluster | `cluster` (container) |
| S3 bucket, Blob container, GCS bucket | `object_storage_bucket` |
| RDS, Aurora, DynamoDB table set, Cosmos DB, Cloud SQL | `database` |
| ElastiCache, Redis, Memcached | `cache` |
| SQS, SNS, Kinesis, Service Bus, Pub/Sub, Kafka topic | `queue_stream` |
| Cognito, Entra ID, Okta, Keycloak, single sign-on | `identity_provider` |
| Secrets Manager, Key Vault secrets, HashiCorp Vault | `secrets_store` |
| KMS key, Key Vault key, HSM-backed key | `kms_key` |
| Private CA, ACM PCA | `certificate_authority` |
| CloudWatch, Azure Monitor, log analytics | `monitoring_logging` |
| CloudTrail, AWS Config, activity log | `audit_trail_config_recorder` |
| GuardDuty, Security Hub, Defender | `security_detection_tooling` |
| ECR, ACR, container registry | `container_registry` |
| Route 53, Cloud DNS | `dns` |
| CloudFront, Front Door, CDN | `cdn` |
| Transit Gateway, VPC peering, site-to-site VPN, Direct Connect, ExpressRoute | `network_interconnect` |
| Session Manager, bastion host, jump host | `bastion_session_manager` |
| IoT Core, IoT Hub, MQTT broker for vehicles | `iot_device_gateway` |
