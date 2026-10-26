# Asset Rules (Layer 3)

Used by: Stage 03 (Asset Identification). Source: the analyst's answers G1 and G2, decision D-52. Spec: `.meta/specs/26-stage-03-assets.md`.
Read by code on every run (`_engines/asset-rules.js`), like `scoping-facts.md`, so rules can be refined here without code changes.

**Status: draft for the analyst's review (2026-10-26).**

Properties: C Confidentiality, I Integrity, A Availability, Au Authenticity, Az Authorization, NR Non-repudiation.

## 1. How the table is used

- Code finds the source (component, function, data item or connection), picks the row and sets the **Default** properties.
- **If data** adds properties when the component holds data of the listed categories (from Stage 02's data items). Write it as `C if pii_direct, vehicle_linked_pii; NR if audit_record_data`.
- **Model may add** lists properties that are off by default. The model may turn one on only with a reason, and every such change goes to the analyst (D-52).
- The model may also propose turning a default property off, with a reason. That change goes to the analyst too.
- An asset type with no row here produces no default. The model proposes the asset and its properties with a reason, and the item needs the analyst's attention. Rows for these types are added later.
- Containers never produce assets. `out_of_scope` components produce none. `interface` components produce only the item's side (section 4).

## 2. Components

| Asset type | Prefix | Asset | Default | If data | Model may add |
|---|---|---|---|---|---|
| `network_boundary_configuration` | NET | exposure configuration | I, A | | |
| `load_balancer` | NET | routing configuration | I, A | | |
| `nat_gateway` | NET | routing configuration | I, A | | |
| `internet_gateway` | NET | routing configuration | I, A | | |
| `api_gateway` | INF | gateway function and its sign-in configuration | Au, Az, I, A | | |
| `microservice_workload` | WL | service logic | I, A | | Az, C |
| `ecs_service` | WL | service logic | I, A | | Az, C |
| `serverless_function` | WL | function logic | I, A | | Az, C |
| `web_frontend` | WL | served application code | I, Au | | |
| `database` | DS | records held | C, I, A | NR if audit_record_data, business_transactions | NR |
| `object_storage_bucket` | DS | stored content | | I, Au, A if firmware_software_artifacts, signed_metadata; C, I if pii_direct, vehicle_linked_pii; I, A, NR if logs_and_telemetry, audit_record_data | C, I, A, Au, NR |
| `cache` | DS | session and sign-in state | C, I, Au, A | | |
| `queue_stream` | DS | messages in flight | I, A, Au | C if pii_direct, vehicle_linked_pii | |
| `identity_provider` | IAM | identities, roles and MFA settings | I, Au, Az, A | | |
| `secrets_store` | IAM | stored secrets as a set | C, I, A | | |
| `kms_key` | IAM | key material and key policy | C, I, A, Au | | |
| `signing_service` | IAM | signing key | C, I, Au | | |
| `certificate_authority` | INF | issuance function and issued certificates | Au, I, A | | |
| `monitoring_logging` | DS | logs and records | I, A, NR | C if pii_direct, vehicle_linked_pii | |
| `audit_trail_config_recorder` | DS | audit records | I, A, NR | C if pii_direct, vehicle_linked_pii | |
| `ci_cd_pipeline` | INF | pipeline and artifacts | I, Au, Az | | |
| `iac_runner` | INF | pipeline and artifacts | I, Au, Az | | |
| `container_registry` | INF | stored images | I, Au, Az | | |
| `cluster_control_plane` | INF | cluster API | Az, I, A, Au | | |
| `worker_nodes` | INF | nodes | I, A | | |
| `pod_runtime` | INF | workload isolation | I, Az | | |
| `iot_device_gateway` | INF | device sign-in and topic access | Au, Az, I, A | | |
| `device_provisioning_service` | INF | device sign-in and topic access | Au, Az, I, A | | |
| `human_actor` | EXT | the identity the item relies on | Au, NR | | |
| `system_to_system_client` | EXT | the identity the item relies on | Au, NR | | |
| `external_vehicle_system` | EXT | the identity the item relies on | Au, NR | | |
| `field_device` | EXT | the identity the item relies on | Au, NR | | |
| `partner_oem_backend` | EXT | the identity the item relies on | Au, NR | | |
| `third_party_saas` | EXT | the identity the item relies on (never its internals) | Au, NR | | |

No row yet: `waf`, `cdn`, `vpc_endpoint`, `network_interconnect`, `dns`, `bastion_session_manager`, `in_cluster_platform_component`, `workflow_engine`, `data_warehouse`, `stream_processing_etl`, `backup_store`, `file_storage`, `notification_gateway`, `payment_gateway`, `mapping_provider`, `mobile_app`, `admin_portal`, `security_detection_tooling`, `landing_zone_governance`, `unknown_kind`.

## 3. Other sources

| Source | Prefix | Asset | Default | If | Model may add |
|---|---|---|---|---|---|
| Function | API | the business function | Az, I, Au, A | NR if privileged | |
| Credential or token held in a secrets store (`credentials_and_session_tokens`) | IAM | the credential | C, Au | | I |
| Key or certificate held in a key store (`cryptographic_keys`, `certificates`) | IAM | the key or certificate | C, I, Au | | A |
| Connection carrying sensitive data across a trust boundary | COMM | data in transit | C, I | | Au |

Sensitive data categories for connections: `pii_direct`, `vehicle_linked_pii`, `credentials_and_session_tokens`, `cryptographic_keys`, `firmware_software_artifacts`, `signed_metadata`, `payment_data`, `business_transactions`, `audit_record_data`.

## 4. Interface components (G2)

An `interface` component gives only the item's side:
- the connection's data in transit, under the connection rule above;
- the external party's identity as the item uses it (EXT, Au, NR);
- credentials the item holds for that party (IAM, under the credential rule).

It never gives the external system's internals.

## 5. Checks code applies after the model

1. If the wrong party gets data because an entitlement check is missing, the property is Authorization, not Confidentiality.
2. Confidentiality on a workload stays off unless it holds data that no DS row covers.
3. A row whose every consequence is owned by other rows is removed and listed as information.
