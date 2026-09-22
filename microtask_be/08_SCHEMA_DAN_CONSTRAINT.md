# Schema dan constraint — katalog turunan

Semua table/field/type/null/FK/index/CHECK dan invariants berikut berasal dari11/11A. Source tetap mengendalikan; teks SHOULD/recommended/implementation choice tidak berubah menjadi MUST. Target forward migration dan real MySQL rejection tests ada pada owner.

<a id="schema-8"></a>

## 11 §8 — `teams` — Application-Owned

Owner: [BE-007](BE-007.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 200.

Purpose: organizational/profile master data only.

| Column       | Type               | Null | Notes                          |
| ------------ | ------------------ | ---: | ------------------------------ |
| `id`         | BIGINT UNSIGNED PK |   No |                                |
| `name`       | VARCHAR(150)       |   No | Human Team name, e.g. Team NOC |
| `is_active`  | BOOLEAN            |   No | default true                   |
| `created_at` | DATETIME/TIMESTAMP |   No |                                |
| `updated_at` | DATETIME/TIMESTAMP |   No |                                |

Constraints/indexes:

- unique Team name under application-normalized/case-insensitive comparison;
- referenced Team SHOULD be deactivated rather than deleted;
- Team MUST NOT appear in authorization pivots.

Explicitly forbidden:

```text
units
divisions
reviewer_scopes
approver_scopes
team_permission_scopes
```

<a id="schema-9"></a>

## 11 §9 — `users` — Application-Owned

Owner: [BE-007](BE-007.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 228.

| Column                    | Type                            | Null | Notes                                                                                      |
| ------------------------- | ------------------------------- | ---: | ------------------------------------------------------------------------------------------ |
| `id`                      | BIGINT UNSIGNED PK              |   No | Spatie-compatible model ID                                                                 |
| `team_id`                 | BIGINT UNSIGNED FK → `teams.id` |  Yes | nullable for bootstrap/protected seed; normal configured user requires Team by domain rule |
| `name`                    | VARCHAR(150)                    |   No | human sign-off/display identity                                                            |
| `username`                | VARCHAR(150)                    |   No | login identifier                                                                           |
| `password`                | VARCHAR(255)                    |   No | secure hash only                                                                           |
| `is_active`               | BOOLEAN                         |   No | default true                                                                               |
| `must_change_password`    | BOOLEAN                         |   No | temporary credential gate                                                                  |
| `is_protected_superadmin` | BOOLEAN                         |   No | protected seeded identity marker                                                           |
| `password_changed_at`     | DATETIME/TIMESTAMP              |  Yes | security/session support                                                                   |
| `remember_token`          | VARCHAR(100)                    |  Yes | Laravel compatibility if used                                                              |
| `created_at`              | DATETIME/TIMESTAMP              |   No |                                                                                            |
| `updated_at`              | DATETIME/TIMESTAMP              |   No |                                                                                            |

Constraints/indexes:

- unique `username` using case-insensitive application rule;
- index `team_id`;
- `team_id` `ON DELETE RESTRICT`;
- password plaintext MUST never be stored;
- temporary password plaintext MUST never receive its own DB column;
- protected Superadmin invariants are application/domain enforced and security-tested;
- Team change does **not** revoke sessions by itself because Team is not authorization.

Normal user deletion is not a history-erasure mechanism. Actor references use `ON DELETE RESTRICT`; operationally disable accounts when referenced historical identity must remain.

A user MUST have a valid active Team before creating a new NSCMF. Bootstrap nullability exists only so the protected seed/account setup can exist before Team setup is complete.

<a id="schema-10"></a>

## 11 §10 — Spatie Package-Owned Tables — MUST Reuse Standard Schema

Owner: [BE-008](BE-008.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 259.

The following tables belong to `spatie/laravel-permission ^8` and MUST NOT be recreated under alternate names:

### `roles`

```text
id BIGINT UNSIGNED PK
name VARCHAR
guard_name VARCHAR
created_at
updated_at
UNIQUE(name, guard_name)
```

### `permissions`

```text
id BIGINT UNSIGNED PK
name VARCHAR
guard_name VARCHAR
created_at
updated_at
UNIQUE(name, guard_name)
```

### `model_has_roles`

```text
role_id
model_type
model_id BIGINT UNSIGNED
PRIMARY KEY(role_id, model_id, model_type)
```

### `model_has_permissions`

```text
permission_id
model_type
model_id BIGINT UNSIGNED
PRIMARY KEY(permission_id, model_id, model_type)
```

This table remains because the package owns it, but current MVP admin UI MUST NOT expose direct permission-to-user assignment.

### `role_has_permissions`

```text
permission_id
role_id
PRIMARY KEY(permission_id, role_id)
```

Package indexes/FKs MUST follow the published package migration for the installed 8.x version rather than being manually reimplemented from memory.

<a id="schema-11"></a>

## 11 §11 — Spatie Configuration Constraints

Owner: [BE-008](BE-008.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 315.

Current DB design assumes:

```php
'teams' => false,
'enable_wildcard_permission' => false,
```

and a single `web` guard.

Therefore package tables MUST NOT receive Spatie Team foreign keys or Team-scoped uniqueness.

Forbidden duplicate/custom RBAC tables:

```text
user_roles
user_permissions
role_permissions
effective_permissions
reviewer_roles
approver_roles
```

`session.login` and `session.logout` MUST NOT be seeded into `permissions`.

<a id="schema-12"></a>

## 11 §12 — `system_settings` — Application-Owned Singleton, Typed

Owner: [BE-009](BE-009.md), [BE-126](BE-126.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 341.

Purpose: persist the small set of approved runtime-configurable application settings that must be changed from the authenticated application UI without converting product/security rules into a generic settings engine.

Current schema:

| Column                               | Type                            | Null | Notes                                                                    |
| ------------------------------------ | ------------------------------- | ---: | ------------------------------------------------------------------------ |
| `id`                                 | BIGINT UNSIGNED PK              |   No | singleton row; current application uses exactly one active row           |
| `technical_log_auto_cleanup_enabled` | BOOLEAN                         |   No | default `true`                                                           |
| `technical_log_retention_value`      | INT UNSIGNED                    |   No | default `30`; must be `>=1`                                              |
| `technical_log_retention_unit`       | VARCHAR(8)                      |   No | `DAY` or `MONTH`; default `DAY`                                          |
| `updated_by_user_id`                 | BIGINT UNSIGNED FK → `users.id` |  Yes | last successful authenticated settings actor; nullable bootstrap/default |
| `created_at`                         | DATETIME/TIMESTAMP              |   No |                                                                          |
| `updated_at`                         | DATETIME/TIMESTAMP              |   No |                                                                          |

Constraints:

```text
technical_log_retention_value >= 1
technical_log_retention_unit IN ('DAY', 'MONTH')
```

Application invariant:

```text
exactly one effective system_settings row
```

Mutation rules:

- Protected Superadmin only;
- requires `system.settings.manage` under current RBAC mapping;
- requires valid sensitive re-authentication proof according to Security Rules;
- Security Audit records mutation without storing secret values;
- changing these fields NEVER changes authoritative Business/Access/Security Audit retention;
- turning cleanup OFF does not require clearing the retention value/unit; last configured values remain available for re-enable;
- no fixed maximum retention value at product-policy level.

Forbidden expansions without approved specification change:

```text
settings(key,value)
JSON settings blob
generic arbitrary environment override table
Business/Access/Security audit retention columns
password policy overrides
MFA toggle
business-state configuration
attachment-limit override
export-retention override
```

<a id="schema-13"></a>

## 11 §13 — `nscmf_records`

Owner: [BE-010](BE-010.md), [BE-047](BE-047.md), [BE-045](BE-045.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 398.

One row = one NSCMF record, independent of Activation/Change detail tables.

| Column                          | Type                            | Null | Notes                                                                |
| ------------------------------- | ------------------------------- | ---: | -------------------------------------------------------------------- |
| `id`                            | BIGINT UNSIGNED PK              |   No |                                                                      |
| `request_no`                    | VARCHAR(64)                     |   No | original display casing                                              |
| `request_no_normalized`         | VARCHAR(64)                     |   No | server-derived lower(trim) uniqueness key                            |
| `numbering_mode`                | VARCHAR(16)                     |   No | `AUTOMATIC` / `MANUAL`                                               |
| `family`                        | VARCHAR(16)                     |   No | `ACTIVATION` / `CHANGE`                                              |
| `subtype`                       | VARCHAR(32)                     |   No | family-valid subtype                                                 |
| `request_date`                  | DATE                            |  Yes | required at Submit, nullable Draft                                   |
| `owner_user_id`                 | BIGINT UNSIGNED FK → `users.id` |   No | own-record authority anchor                                          |
| `team_id`                       | BIGINT UNSIGNED FK → `teams.id` |   No | Team captured at record creation; informational, never authorization |
| `business_status`               | VARCHAR(32)                     |   No | canonical status only                                                |
| `record_version`                | BIGINT UNSIGNED                 |   No | optimistic concurrency token, default 1                              |
| `requested_by_user_id`          | BIGINT UNSIGNED FK → `users.id` |  Yes | first successful Submit actor                                        |
| `first_submitted_at`            | DATETIME/TIMESTAMP              |  Yes | first successful Submit timestamp                                    |
| `current_workflow_iteration_id` | BIGINT UNSIGNED FK              |  Yes | null before first Submit/Cancelled                                   |
| `is_archived`                   | BOOLEAN                         |   No | separate from status                                                 |
| `archived_at`                   | DATETIME/TIMESTAMP              |  Yes | current archive state metadata                                       |
| `archived_by_user_id`           | BIGINT UNSIGNED FK → `users.id` |  Yes | current archive actor                                                |
| `archive_reason`                | VARCHAR(2000) / TEXT            |  Yes | mandatory when currently archived                                    |
| `created_at`                    | DATETIME/TIMESTAMP              |   No |                                                                      |
| `updated_at`                    | DATETIME/TIMESTAMP              |   No |                                                                      |

`team_id` is captured from the owner's Team when the NSCMF is created and MUST NOT be used in authorization queries. Later user Team changes do not silently rewrite historical NSCMF Team metadata.

### 13.1 Canonical Status CHECK

Allowed values exactly:

```text
DRAFT
PENDING_REVIEW
REVISION_REQUIRED
PENDING_APPROVAL
REJECTED
APPROVED
CANCELLED
```

No other persistent business status is allowed.

### 13.2 Family/Subtype CHECK

```text
ACTIVATION → ACTIVATION | UPGRADE_DOWNGRADE | DEACTIVATION
CHANGE     → MAINTENANCE | UPGRADE | EMERGENCY
```

### 13.3 Archive CHECK

If `is_archived = true`, `business_status` MUST be one of:

```text
APPROVED
REJECTED
CANCELLED
```

Archive does not alter `business_status`.

### 13.4 Submission / Iteration Integrity

Domain/database constraints SHOULD preserve:

- `DRAFT` and `CANCELLED` have no current workflow iteration;
- all post-submit workflow states have a current workflow iteration;
- `requested_by_user_id` / `first_submitted_at` are null before first successful Submit and non-null after it;
- `CANCELLED` can only arise before first successful Submit.

The `current_workflow_iteration_id` FK is added after `nscmf_workflow_iterations` exists to avoid migration-order circularity.

### 13.5 Request Number Rules

`request_no_normalized` has a unique index.

Manual number:

- outer whitespace trimmed;
- length 3–64;
- valid characters from `06`;
- globally unique case-insensitive.

Automatic number:

```text
NSCMF-YYYYMM-#####
```

is allocated server-side once and is not regenerated by ordinary updates.

After first successful Submit, Request No is immutable.

### 13.6 No Hard Delete

`nscmf_records` has **no `deleted_at` business deletion path** and no normal delete permission. Archive is the supported lifecycle mechanism.

<a id="schema-14"></a>

## 11 §14 — Record Version Semantics — Critical

Owner: [BE-010](BE-010.md), [BE-047](BE-047.md), [BE-045](BE-045.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 498.

`record_version` is the single optimistic concurrency token for mutable NSCMF content.

Rules:

- Draft / Revision / Result persistence requires `expected_version`;
- successful mutation atomically increments `record_version`;
- stale expected version fails without overwrite;
- child-table mutations increment parent `nscmf_records.record_version` in the same transaction;
- workflow transitions also increment the record version while holding the row lock;
- export snapshot captures the exact `record_version` at request time.

No child table introduces an independent competing business version token unless a future explicit requirement requires it.

<a id="schema-15"></a>

## 11 §15 — `nscmf_number_sequences`

Owner: [BE-010](BE-010.md), [BE-047](BE-047.md), [BE-045](BE-045.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 517.

| Column       | Type               | Null | Notes                   |
| ------------ | ------------------ | ---: | ----------------------- |
| `year_month` | CHAR(6) PK         |   No | `YYYYMM`                |
| `last_value` | INT UNSIGNED       |   No | last allocated sequence |
| `updated_at` | DATETIME/TIMESTAMP |   No |                         |

Allocation rules:

- global monthly sequence; not split by family or Team;
- counter increment is concurrency-safe under short transaction/row lock;
- sequence gaps are allowed;
- allocated value is never reused;
- allocation must remain consumed even if a later unrelated creation step fails after allocation commitment.

<a id="schema-16"></a>

## 11 §16 — `nscmf_activation_details`

Owner: [BE-011](BE-011.md), [BE-049](BE-049.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 537.

Exactly one row for `family=ACTIVATION`.

| Column                         | Type                  | Null | Validation meaning              |
| ------------------------------ | --------------------- | ---: | ------------------------------- |
| `nscmf_record_id`              | BIGINT UNSIGNED PK/FK |   No | 1:1                             |
| `customer_name`                | VARCHAR(150)          |  Yes | required at Submit              |
| `contact_name`                 | VARCHAR(150)          |  Yes | required at Submit              |
| `installation_rfs_date`        | DATE                  |  Yes | subtype-dependent               |
| `lan_ip_allocation`            | TEXT                  |  Yes | validated/parses IP/CIDR/ranges |
| `wan_ip`                       | VARCHAR(255)          |  Yes | IPv4/IPv6/CIDR                  |
| `gateway`                      | VARCHAR(255)          |  Yes | single IPv4/IPv6                |
| `pop`                          | VARCHAR(255)          |  Yes |                                 |
| `regional`                     | VARCHAR(255)          |  Yes |                                 |
| `preferred_upstream`           | VARCHAR(255)          |  Yes |                                 |
| `secondary_upstream`           | VARCHAR(255)          |  Yes |                                 |
| `primary_noc_link`             | VARCHAR(255)          |  Yes |                                 |
| `secondary_noc_link`           | VARCHAR(255)          |  Yes |                                 |
| `downlink_router`              | VARCHAR(255)          |  Yes |                                 |
| `bandwidth_international_mbps` | DECIMAL(14,3)         |  Yes | >0 if present                   |
| `bandwidth_domestic_iix_mbps`  | DECIMAL(14,3)         |  Yes | >0 if present                   |
| `bandwidth_mixed_mbps`         | DECIMAL(14,3)         |  Yes | >0 if present                   |
| `domain_name_1`                | VARCHAR(253)          |  Yes | FQDN                            |
| `domain_name_2`                | VARCHAR(253)          |  Yes | FQDN                            |
| `primary_dns`                  | VARCHAR(255)          |  Yes | IP                              |
| `secondary_dns`                | VARCHAR(255)          |  Yes | IP                              |
| `mx_primary`                   | VARCHAR(255)          |  Yes | FQDN or priority + FQDN         |
| `mx_secondary`                 | VARCHAR(255)          |  Yes | FQDN or priority + FQDN         |
| `hosting_platform`             | VARCHAR(255)          |  Yes | dependency-controlled           |
| `hosting_capacity_gb`          | DECIMAL(14,3)         |  Yes | >0 if present                   |
| `migrate_domain`               | BOOLEAN               |   No | default false                   |
| `migrate_hosting`              | BOOLEAN               |   No | default false                   |
| `created_at`                   | DATETIME/TIMESTAMP    |   No |                                 |
| `updated_at`                   | DATETIME/TIMESTAMP    |   No |                                 |

Draft fields remain nullable; `06` owns action-stage requiredness.

<a id="schema-17"></a>

## 11 §17 — `nscmf_activation_references`

Owner: [BE-012](BE-012.md), [BE-050](BE-050.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 575.

Optional multi-select reference values.

| Column            | Type               | Null |
| ----------------- | ------------------ | ---: |
| `id`              | BIGINT UNSIGNED PK |   No |
| `nscmf_record_id` | BIGINT UNSIGNED FK |   No |
| `reference_type`  | VARCHAR(16)        |   No |
| `specification`   | VARCHAR(255)       |  Yes |

Allowed `reference_type`:

```text
IWO
VELOSHIP
TICKET
OTHER
```

Unique `(nscmf_record_id, reference_type)`; `OTHER` requires `specification` at applicable validation stage.

<a id="schema-18"></a>

## 11 §18 — `nscmf_activation_service_blocks`

Owner: [BE-012](BE-012.md), [BE-051](BE-051.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 597.

| Column                | Type                 | Null |
| --------------------- | -------------------- | ---: |
| `id`                  | BIGINT UNSIGNED PK   |   No |
| `nscmf_record_id`     | BIGINT UNSIGNED FK   |   No |
| `service_context`     | VARCHAR(16)          |   No |
| `service_id`          | VARCHAR(100)         |  Yes |
| `service_status`      | VARCHAR(16)          |  Yes |
| `service_description` | VARCHAR(2000) / TEXT |  Yes |
| `service_location`    | VARCHAR(500)         |  Yes |
| `created_at`          | DATETIME/TIMESTAMP   |   No |
| `updated_at`          | DATETIME/TIMESTAMP   |   No |

`service_context`: `EXISTING|NEW`.

`service_status` if present: `ACTIVATED|DEACTIVATED`.

Unique `(nscmf_record_id, service_context)`.

<a id="schema-19"></a>

## 11 §19 — `nscmf_activation_sla_items`

Owner: [BE-012](BE-012.md), [BE-052](BE-052.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 617.

```text
id BIGINT PK
nscmf_record_id FK
row_no TINYINT UNSIGNED CHECK 1..3
requirement_text VARCHAR(1000)
UNIQUE(nscmf_record_id, row_no)
```

<a id="schema-20"></a>

## 11 §20 — `nscmf_activation_virtual_connections`

Owner: [BE-012](BE-012.md), [BE-052](BE-052.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 627.

```text
id BIGINT PK
nscmf_record_id FK
row_no TINYINT UNSIGNED CHECK 1..3
bandwidth_mbps DECIMAL(14,3) NULL CHECK >0 when present
UNIQUE(nscmf_record_id, row_no)
```

<a id="schema-21"></a>

## 11 §21 — `nscmf_activation_priority_destinations`

Owner: [BE-012](BE-012.md), [BE-052](BE-052.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 637.

```text
id BIGINT PK
nscmf_record_id FK
row_no TINYINT UNSIGNED CHECK 1..3
destination VARCHAR(255)
UNIQUE(nscmf_record_id, row_no)
```

<a id="schema-22"></a>

## 11 §22 — `nscmf_activation_direct_site_details`

Owner: [BE-013](BE-013.md), [BE-053](BE-053.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 647.

Optional Customer Site Direct technical data, 1:1 with Activation record.

| Column                | Type                  | Null |
| --------------------- | --------------------- | ---: |
| `nscmf_record_id`     | BIGINT UNSIGNED PK/FK |   No |
| `local_loops`         | VARCHAR(255)          |  Yes |
| `lastmile`            | VARCHAR(255)          |  Yes |
| `bwa`                 | VARCHAR(255)          |  Yes |
| `antenna_tower`       | VARCHAR(255)          |  Yes |
| `direction`           | VARCHAR(255)          |  Yes |
| `rssi`                | DECIMAL(12,3)         |  Yes |
| `latency_ms`          | DECIMAL(14,3)         |  Yes |
| `packet_loss_percent` | DECIMAL(5,2)          |  Yes |
| `routers`             | VARCHAR(255)          |  Yes |
| `ups`                 | VARCHAR(255)          |  Yes |
| `stabilizer`          | VARCHAR(255)          |  Yes |
| `cable`               | VARCHAR(255)          |  Yes |
| `created_at`          | DATETIME/TIMESTAMP    |   No |
| `updated_at`          | DATETIME/TIMESTAMP    |   No |

Checks: latency >=0; packet loss 0..100; no invented RSSI range.

<a id="schema-23"></a>

## 11 §23 — `nscmf_activation_pop_site_details`

Owner: [BE-013](BE-013.md), [BE-053](BE-053.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 671.

Optional Customer Site at POP data, 1:1.

| Column                | Type                  | Null |
| --------------------- | --------------------- | ---: |
| `nscmf_record_id`     | BIGINT UNSIGNED PK/FK |   No |
| `switch_distribution` | VARCHAR(255)          |  Yes |
| `port`                | VARCHAR(255)          |  Yes |
| `vlan_id`             | SMALLINT UNSIGNED     |  Yes |
| `local_loops`         | VARCHAR(255)          |  Yes |
| `routers`             | VARCHAR(255)          |  Yes |
| `cpe_indoor`          | VARCHAR(255)          |  Yes |
| `cpe_outdoor`         | VARCHAR(255)          |  Yes |
| `created_at`          | DATETIME/TIMESTAMP    |   No |
| `updated_at`          | DATETIME/TIMESTAMP    |   No |

`vlan_id` CHECK `1..4094` when present.

<a id="schema-24"></a>

## 11 §24 — `nscmf_change_details`

Owner: [BE-014](BE-014.md), [BE-055](BE-055.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 694.

Exactly one row for `family=CHANGE`.

| Column                    | Type                  | Null | Notes                    |
| ------------------------- | --------------------- | ---: | ------------------------ |
| `nscmf_record_id`         | BIGINT UNSIGNED PK/FK |   No | 1:1                      |
| `maintenance_purpose`     | VARCHAR(4000) / TEXT  |  Yes | subtype-dependent        |
| `target_execution_date`   | DATE                  |  Yes | required at Submit       |
| `monitoring_period_value` | DECIMAL(14,3)         |  Yes | >0 when applicable       |
| `monitoring_period_unit`  | VARCHAR(32)           |  Yes | normalized duration unit |
| `rollback_scenario`       | VARCHAR(4000) / TEXT  |  Yes | required at Submit       |
| `announcement_timing`     | VARCHAR(40)           |  Yes | exactly one at Submit    |
| `created_at`              | DATETIME/TIMESTAMP    |   No |                          |
| `updated_at`              | DATETIME/TIMESTAMP    |   No |                          |

`announcement_timing` values:

```text
ONE_WEEK_BEFORE
TWO_WEEKS_BEFORE
TWO_DAYS_BEFORE_EMERGENCY
```

`monitoring_period_unit` values:

```text
MINUTE
HOUR
DAY
WEEK
```

`monitoring_period_value` and `monitoring_period_unit` are both NULL or both present.

<a id="schema-25"></a>

## 11 §25 — `nscmf_change_facing_challenges`

Owner: [BE-015](BE-015.md), [BE-056](BE-056.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 729.

```text
id BIGINT PK
nscmf_record_id FK
row_no TINYINT UNSIGNED CHECK 1..3
challenge_text VARCHAR(1000)
UNIQUE(nscmf_record_id, row_no)
```

<a id="schema-26"></a>

## 11 §26 — `nscmf_change_identified_problems`

Owner: [BE-015](BE-015.md), [BE-056](BE-056.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 739.

```text
id BIGINT PK
nscmf_record_id FK
row_no TINYINT UNSIGNED CHECK 1..3
problem_text VARCHAR(1000)
UNIQUE(nscmf_record_id, row_no)
```

<a id="schema-27"></a>

## 11 §27 — `nscmf_change_service_impacts`

Owner: [BE-015](BE-015.md), [BE-057](BE-057.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 749.

| Column              | Type               | Null |
| ------------------- | ------------------ | ---: |
| `id`                | BIGINT UNSIGNED PK |   No |
| `nscmf_record_id`   | BIGINT UNSIGNED FK |   No |
| `impact_code`       | VARCHAR(16)        |   No |
| `other_description` | VARCHAR(500)       |  Yes |

Allowed values exactly:

```text
NOC15
NOC23
NOC361
REGIONAL
POP
CUSTOMER
OTHER
```

Unique `(nscmf_record_id, impact_code)`; `OTHER` requires description at Submit/Resubmit. These values are business form values, not authorization Team values.

<a id="schema-28"></a>

## 11 §28 — `nscmf_change_improvement_items`

Owner: [BE-015](BE-015.md), [BE-058](BE-058.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 772.

```text
id BIGINT PK
nscmf_record_id FK
row_no TINYINT UNSIGNED CHECK 1..3
plan_text VARCHAR(1000) NULL
target_kpi VARCHAR(1000) NULL
UNIQUE(nscmf_record_id, row_no)
```

<a id="schema-29"></a>

## 11 §29 — `nscmf_change_results`

Owner: [BE-015](BE-015.md), [BE-059](BE-059.md), [BE-076](BE-076.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 783.

Up to 5 ordered Result of Changes rows.

| Column                    | Type                 | Null |
| ------------------------- | -------------------- | ---: |
| `id`                      | BIGINT UNSIGNED PK   |   No |
| `nscmf_record_id`         | BIGINT UNSIGNED FK   |   No |
| `row_no`                  | TINYINT UNSIGNED     |   No |
| `result_summary`          | VARCHAR(2000) / TEXT |  Yes |
| `performance_information` | VARCHAR(2000) / TEXT |  Yes |
| `result_status`           | VARCHAR(255)         |  Yes |
| `created_at`              | DATETIME/TIMESTAMP   |   No |
| `updated_at`              | DATETIME/TIMESTAMP   |   No |

Constraints:

- `row_no` CHECK 1..5;
- unique `(nscmf_record_id, row_no)`;
- zero rows allowed on first Submit;
- any started row complete at Submit/Resubmit;
- minimum one complete row before Reviewer Forward;
- Result mutation during `PENDING_REVIEW` increments parent `record_version` and is ownership/permission constrained;
- this table MUST NOT contain/generalize planning fields.

<a id="schema-30"></a>

## 11 §30 — Iteration Rule — Confirmed

Owner: [BE-016](BE-016.md), [BE-078](BE-078.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 812.

```text
First successful Submit              → Iteration 1
Return / Revision / Resubmit         → same iteration
Approver Return Reviewer/Requester   → same iteration
Approved or Rejected → Reopen        → new iteration
```

<a id="schema-31"></a>

## 11 §31 — `nscmf_workflow_iterations`

Owner: [BE-016](BE-016.md), [BE-078](BE-078.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 821.

| Column                     | Type                            | Null | Meaning                                           |
| -------------------------- | ------------------------------- | ---: | ------------------------------------------------- |
| `id`                       | BIGINT UNSIGNED PK              |   No |                                                   |
| `nscmf_record_id`          | BIGINT UNSIGNED FK              |   No | parent                                            |
| `iteration_no`             | INT UNSIGNED                    |   No | starts at 1                                       |
| `predecessor_iteration_id` | BIGINT UNSIGNED self-FK         |  Yes | null for Iteration 1                              |
| `started_via`              | VARCHAR(16)                     |   No | `FIRST_SUBMIT` / `REOPEN`                         |
| `started_by_user_id`       | BIGINT UNSIGNED FK → `users.id` |   No | Submit/Reopen actor                               |
| `started_at`               | DATETIME(6)                     |   No |                                                   |
| `reviewed_by_user_id`      | BIGINT UNSIGNED FK → `users.id` |  Yes | current-iteration successful Forward actor        |
| `reviewed_at`              | DATETIME(6)                     |  Yes | current effective Review sign-off                 |
| `approved_by_user_id`      | BIGINT UNSIGNED FK → `users.id` |  Yes | successful final Approve actor                    |
| `approved_at`              | DATETIME(6)                     |  Yes |                                                   |
| `closed_status`            | VARCHAR(16)                     |  Yes | `APPROVED` / `REJECTED` only                      |
| `closed_at`                | DATETIME(6)                     |  Yes | terminal closure of iteration                     |
| `superseded_at`            | DATETIME(6)                     |  Yes | set if a later Reopen creates successor iteration |
| `created_at`               | DATETIME/TIMESTAMP              |   No |                                                   |
| `updated_at`               | DATETIME/TIMESTAMP              |   No |                                                   |

Constraints:

- unique `(nscmf_record_id, iteration_no)`;
- `iteration_no >= 1`;
- predecessor belongs to same record;
- `closed_status` only `APPROVED`/`REJECTED`;
- `approved_by_user_id`/`approved_at` only when closed Approved;
- exactly one current iteration is referenced by `nscmf_records.current_workflow_iteration_id` after first Submit.

<a id="schema-32"></a>

## 11 §32 — Sign-Off Semantics

Owner: [BE-016](BE-016.md), [BE-078](BE-078.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 851.

### Requested By

`nscmf_records.requested_by_user_id` / `first_submitted_at` = actor/timestamp of first successful Submit and are not overwritten by Reopen.

### Reviewed By

Current workflow iteration `reviewed_by_user_id` / `reviewed_at` = actor/timestamp of currently effective successful Forward.

Approver return requiring fresh review clears current `reviewed_by_*`; historical Forward remains in Business Audit.

### Approved By

Current/historical workflow iteration `approved_by_user_id` / `approved_at` = actor successfully committing `PENDING_APPROVAL -> APPROVED`.

No exclusive Approver assignment table exists. One successful eligible approval closes the iteration; stale subsequent actions fail current-state revalidation.

<a id="schema-33"></a>

## 11 §33 — No Reviewer Assignment Ownership Table

Owner: [BE-016](BE-016.md), [BE-078](BE-078.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 869.

Intentionally absent:

```text
nscmf_review_assignments
nscmf_approver_assignments
reviewer_owner_id
approver_owner_id
```

Multiple Reviewer contributors are represented through Business Audit events. Opening a record creates neither assignment nor ownership.

<a id="schema-34"></a>

## 11 §34 — `business_audit_events`

Owner: [BE-017](BE-017.md), [BE-081](BE-081.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 886.

| Column                  | Type                            | Null |
| ----------------------- | ------------------------------- | ---: |
| `id`                    | BIGINT UNSIGNED PK              |   No |
| `nscmf_record_id`       | BIGINT UNSIGNED FK              |   No |
| `workflow_iteration_id` | BIGINT UNSIGNED FK              |  Yes |
| `actor_user_id`         | BIGINT UNSIGNED FK → `users.id` |  Yes |
| `actor_type`            | VARCHAR(16)                     |   No |
| `event_type`            | VARCHAR(64)                     |   No |
| `from_status`           | VARCHAR(32)                     |  Yes |
| `to_status`             | VARCHAR(32)                     |  Yes |
| `reason`                | VARCHAR(2000) / TEXT            |  Yes |
| `comment`               | VARCHAR(2000) / TEXT            |  Yes |
| `record_version_before` | BIGINT UNSIGNED                 |  Yes |
| `record_version_after`  | BIGINT UNSIGNED                 |  Yes |
| `metadata_json`         | JSON                            |  Yes |
| `occurred_at`           | DATETIME(6)                     |   No |

`actor_type`: `USER|SYSTEM`.

Typical explicit `event_type` examples:

```text
RECORD_CREATED
DRAFT_UPDATED
SUBMITTED
RESULT_UPDATED
REVIEW_FORWARDED
REVIEW_RETURNED
REVIEW_REJECTED
APPROVAL_RETURNED_REVIEWER
APPROVAL_RETURNED_REQUESTER
APPROVAL_REJECTED
APPROVED
REOPENED
CANCELLED
ARCHIVED
UNARCHIVED
ATTACHMENT_ADDED
ATTACHMENT_REMOVED
```

<a id="schema-35"></a>

## 11 §35 — `business_audit_changes`

Owner: [BE-017](BE-017.md), [BE-081](BE-081.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 929.

| Column                    | Type               | Null |
| ------------------------- | ------------------ | ---: |
| `id`                      | BIGINT UNSIGNED PK |   No |
| `business_audit_event_id` | BIGINT UNSIGNED FK |   No |
| `field_path`              | VARCHAR(255)       |   No |
| `value_kind`              | VARCHAR(32)        |  Yes |
| `old_value_text`          | LONGTEXT           |  Yes |
| `new_value_text`          | LONGTEXT           |  Yes |

Business Audit rows are append-oriented. Normal application code MUST NOT update/delete historical events or changes.

<a id="schema-36"></a>

## 11 §36 — `access_audit_events`

Owner: [BE-017](BE-017.md), [BE-082](BE-082.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 946.

| Column              | Type                            | Null |
| ------------------- | ------------------------------- | ---: |
| `id`                | BIGINT UNSIGNED PK              |   No |
| `actor_user_id`     | BIGINT UNSIGNED FK → `users.id` |   No |
| `event_type`        | VARCHAR(64)                     |   No |
| `nscmf_record_id`   | BIGINT UNSIGNED FK              |  Yes |
| `attachment_id`     | BIGINT UNSIGNED FK              |  Yes |
| `export_request_id` | BIGINT UNSIGNED FK              |  Yes |
| `occurred_at`       | DATETIME(6)                     |   No |

Typical: `RECORD_VIEWED`, `ATTACHMENT_VIEWED`, `ATTACHMENT_DOWNLOADED`, `EXPORT_REQUESTED`, `EXPORT_DOWNLOADED`, `PRIVILEGED_AUDIT_VIEWED`.

No routine Access Audit event becomes a Business Timeline row.

<a id="schema-37"></a>

## 11 §37 — `security_audit_events`

Owner: [BE-017](BE-017.md), [BE-083](BE-083.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 962.

| Column              | Type                            | Null |
| ------------------- | ------------------------------- | ---: |
| `id`                | BIGINT UNSIGNED PK              |   No |
| `actor_user_id`     | BIGINT UNSIGNED FK → `users.id` |  Yes |
| `target_user_id`    | BIGINT UNSIGNED FK → `users.id` |  Yes |
| `subject_username`  | VARCHAR(150)                    |  Yes |
| `event_type`        | VARCHAR(64)                     |   No |
| `outcome`           | VARCHAR(16)                     |   No |
| `session_id`        | VARCHAR(255)                    |  Yes |
| `ip_address`        | VARCHAR(45)                     |  Yes |
| `nscmf_record_id`   | BIGINT UNSIGNED FK              |  Yes |
| `attachment_id`     | BIGINT UNSIGNED FK              |  Yes |
| `export_request_id` | BIGINT UNSIGNED FK              |  Yes |
| `metadata_json`     | JSON                            |  Yes |
| `occurred_at`       | DATETIME(6)                     |   No |

Typical events include login failure/throttling, credential reset, temporary-password replacement, role changes, permission changes, session revocation, account enable/disable, malware outcomes, signing readiness/failure, privileged security-audit access, and protected Core Settings mutation.

`outcome`: `SUCCESS|FAILURE|DENIED|ERROR`.

Passwords, hashes of supplied passwords, temporary-password plaintext, private keys, passphrases, secret tokens, or raw sensitive payloads MUST NOT be stored.

<a id="schema-38"></a>

## 11 §38 — Authoritative Audit Retention

Owner: [BE-017](BE-017.md), [BE-083](BE-083.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 986.

These tables have **no age-based application purge**:

```text
business_audit_events
business_audit_changes
access_audit_events
security_audit_events
```

Normal app code exposes no delete path.

Technical Log cleanup setting in `system_settings` is explicitly prohibited from targeting these tables.

<a id="schema-39"></a>

## 11 §39 — `nscmf_attachments`

Owner: [BE-018](BE-018.md), [BE-096](BE-096.md), [BE-098](BE-098.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 1005.

| Column                  | Type                            | Null | Notes                                      |
| ----------------------- | ------------------------------- | ---: | ------------------------------------------ |
| `id`                    | BIGINT UNSIGNED PK              |   No |                                            |
| `nscmf_record_id`       | BIGINT UNSIGNED FK              |   No |                                            |
| `uploaded_by_user_id`   | BIGINT UNSIGNED FK → `users.id` |   No |                                            |
| `original_filename`     | VARCHAR(255)                    |   No | metadata only                              |
| `extension`             | VARCHAR(16)                     |   No | normalized                                 |
| `detected_mime_type`    | VARCHAR(150)                    |   No | server detected                            |
| `size_bytes`            | BIGINT UNSIGNED                 |   No | >0; <=20MB                                 |
| `sha256`                | CHAR(64)                        |   No | authoritative final assembled content hash |
| `quarantine_object_key` | VARCHAR(1024)                   |  Yes | private storage reference only             |
| `private_object_key`    | VARCHAR(1024)                   |  Yes | set only after CLEAN promotion             |
| `security_status`       | VARCHAR(16)                     |   No | technical file-security state              |
| `scanned_at`            | DATETIME(6)                     |  Yes |                                            |
| `scanner_engine`        | VARCHAR(100)                    |  Yes | e.g. ClamAV                                |
| `removed_at`            | DATETIME(6)                     |  Yes | logical removal metadata                   |
| `removed_by_user_id`    | BIGINT UNSIGNED FK → `users.id` |  Yes |                                            |
| `created_at`            | DATETIME/TIMESTAMP              |   No |                                            |
| `updated_at`            | DATETIME/TIMESTAMP              |   No |                                            |

`security_status`:

```text
PENDING
CLEAN
INFECTED
FAILED
```

The historical `*_object_key` column names represent **private storage locator/reference strings**, not a requirement for S3/object storage. With the confirmed initial-production Laravel `local` disk, they hold application-relative private storage keys/paths and MUST NOT expose absolute host paths or public URLs to the client.

Only CLEAN is usable/downloadable subject to authorization.

<a id="schema-40"></a>

## 11 §40 — Resumable Upload Tables

Owner: [BE-018](BE-018.md), [BE-096](BE-096.md), [BE-098](BE-098.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 1040.

`11A_Resumable_Attachment_Upload_Synchronization.md` remains authoritative for the already-confirmed physical upload-session/chunk additions, including:

```text
nscmf_attachment_upload_sessions
nscmf_attachment_upload_chunks
```

Locked invariants:

- 5 MiB chunk size;
- 24h inactivity expiry since last newly accepted progress;
- 1-based chunk index;
- idempotent byte-identical replay;
- conflicting replay rejected;
- authoritative server final SHA-256 after assembly;
- full assembled-file ClamAV CLEAN required;
- upload transport `COMPLETED` is not attachment security `CLEAN`;
- acknowledged production chunks reside on persistent/non-ephemeral private Laravel local storage under current MVP.

A future storage backend change must not require schema/business semantic change to these references.

<a id="schema-41"></a>

## 11 §41 — `nscmf_template_versions`

Owner: [BE-019](BE-019.md), [BE-105](BE-105.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 1067.

| Column               | Type               | Null |
| -------------------- | ------------------ | ---: |
| `id`                 | BIGINT UNSIGNED PK |   No |
| `version_label`      | VARCHAR(50)        |   No |
| `private_object_key` | VARCHAR(1024)      |   No |
| `template_sha256`    | CHAR(64)           |   No |
| `mapping_version`    | VARCHAR(100)       |   No |
| `is_active`          | BOOLEAN            |   No |
| `created_at`         | DATETIME/TIMESTAMP |   No |

Constraints:

- unique `version_label`;
- unique template SHA-256 where appropriate;
- template binary immutable after registration;
- old template metadata remains available for historical export/issuance traceability;
- targeted OOXML mapping lives in version-controlled code/config and `mapping_version` identifies its contract;
- replacing the official template means creating/registering a **new version**, not overwriting old binary/metadata;
- configured binary must be hash-verified against `template_sha256` before use/readiness.

`private_object_key` remains a private Laravel Storage key and does not imply an external object-storage provider.

<a id="schema-42"></a>

## 11 §42 — `nscmf_export_batches`

Owner: [BE-019](BE-019.md), [BE-112](BE-112.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 1091.

| Column                 | Type                            | Null |
| ---------------------- | ------------------------------- | ---: |
| `id`                   | BIGINT UNSIGNED PK              |   No |
| `requested_by_user_id` | BIGINT UNSIGNED FK → `users.id` |   No |
| `format`               | VARCHAR(8)                      |   No |
| `created_at`           | DATETIME/TIMESTAMP              |   No |

Format: `XLSX|PDF`.

Exact bulk packaging remains TBD downstream.

<a id="schema-43"></a>

## 11 §43 — `nscmf_export_requests`

Owner: [BE-019](BE-019.md), [BE-108](BE-108.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 1104.

| Column                 | Type                                           | Null |
| ---------------------- | ---------------------------------------------- | ---: |
| `id`                   | BIGINT UNSIGNED PK                             |   No |
| `nscmf_record_id`      | BIGINT UNSIGNED FK                             |   No |
| `requested_by_user_id` | BIGINT UNSIGNED FK → `users.id`                |   No |
| `export_batch_id`      | BIGINT UNSIGNED FK → `nscmf_export_batches.id` |  Yes |
| `format`               | VARCHAR(8)                                     |   No |
| `status`               | VARCHAR(16)                                    |   No |
| `requested_at`         | DATETIME(6)                                    |   No |
| `started_at`           | DATETIME(6)                                    |  Yes |
| `ready_at`             | DATETIME(6)                                    |  Yes |
| `failed_at`            | DATETIME(6)                                    |  Yes |
| `expires_at`           | DATETIME(6)                                    |  Yes |
| `failure_code`         | VARCHAR(100)                                   |  Yes |
| `failure_summary`      | VARCHAR(1000)                                  |  Yes |

Technical statuses:

```text
QUEUED
PROCESSING
READY
FAILED
EXPIRED
```

<a id="schema-44"></a>

## 11 §44 — `nscmf_export_snapshots` — Immutable

Owner: [BE-019](BE-019.md), [BE-108](BE-108.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 1132.

| Column                    | Type               | Null |
| ------------------------- | ------------------ | ---: |
| `id`                      | BIGINT UNSIGNED PK |   No |
| `export_request_id`       | BIGINT UNSIGNED FK |   No |
| `nscmf_record_id`         | BIGINT UNSIGNED FK |   No |
| `record_version`          | BIGINT UNSIGNED    |   No |
| `workflow_iteration_id`   | BIGINT UNSIGNED FK |  Yes |
| `template_version_id`     | BIGINT UNSIGNED FK |   No |
| `snapshot_schema_version` | VARCHAR(50)        |   No |
| `snapshot_json`           | JSON               |   No |
| `snapshot_sha256`         | CHAR(64)           |   No |
| `created_at`              | DATETIME(6)        |   No |

Constraints:

- unique `export_request_id`;
- row and `snapshot_json` immutable after successful creation;
- `snapshot_sha256` computed over canonical serialized snapshot representation;
- worker reads snapshot, not live NSCMF child tables;
- snapshot is DERIVED evidence, not editable business source of truth.

<a id="schema-45"></a>

## 11 §45 — Snapshot Creation Transaction

Owner: [BE-019](BE-019.md), [BE-108](BE-108.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 1155.

```text
authorize
→ BEGIN short transaction
→ read current relational data consistently
→ create export request row with QUEUED
→ bind record_version
→ bind workflow iteration
→ bind active immutable template version
→ create canonical immutable snapshot
→ COMMIT
→ dispatch queue job after commit
```

<a id="schema-46"></a>

## 11 §46 — `nscmf_export_artifacts`

Owner: [BE-019](BE-019.md), [BE-110](BE-110.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 1174.

| Column               | Type               | Null |
| -------------------- | ------------------ | ---: |
| `id`                 | BIGINT UNSIGNED PK |   No |
| `export_request_id`  | BIGINT UNSIGNED FK |   No |
| `private_object_key` | VARCHAR(1024)      |  Yes |
| `mime_type`          | VARCHAR(100)       |   No |
| `size_bytes`         | BIGINT UNSIGNED    |   No |
| `artifact_sha256`    | CHAR(64)           |   No |
| `created_at`         | DATETIME(6)        |   No |
| `expires_at`         | DATETIME(6)        |   No |
| `binary_purged_at`   | DATETIME(6)        |  Yes |

Constraints:

- unique `export_request_id`;
- `expires_at = created/ready time + 168 hours`;
- scheduler removes generated binary after expiry but metadata row MAY remain;
- cleanup sets `binary_purged_at` and must not delete source/audit/issuance metadata;
- `private_object_key` is a Laravel private-storage locator and does not imply S3.

<a id="schema-47"></a>

## 11 §47 — `nscmf_signing_certificates` — Public Verification Material Only

Owner: [BE-019](BE-019.md), [BE-118](BE-118.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 1196.

| Column                        | Type               | Null |
| ----------------------------- | ------------------ | ---: |
| `id`                          | BIGINT UNSIGNED PK |   No |
| `certificate_label`           | VARCHAR(150)       |   No |
| `fingerprint_sha256`          | CHAR(64)           |   No |
| `serial_number`               | VARCHAR(255)       |  Yes |
| `subject_dn`                  | VARCHAR(1000)      |  Yes |
| `valid_from`                  | DATETIME/TIMESTAMP |  Yes |
| `valid_until`                 | DATETIME/TIMESTAMP |  Yes |
| `material_format`             | VARCHAR(32)        |  Yes |
| `public_certificate_material` | MEDIUMTEXT         |  Yes |
| `is_active`                   | BOOLEAN            |   No |
| `created_at`                  | DATETIME/TIMESTAMP |   No |
| `retired_at`                  | DATETIME/TIMESTAMP |  Yes |

Unique `fingerprint_sha256`.

**There is intentionally no private-key column.**

Private signing key/passphrase is provisioned through protected runtime environment/mount/secret reference. This table stores/resolves only public verification material required for historical validation.

<a id="schema-48"></a>

## 11 §48 — `nscmf_pdf_issuances`

Owner: [BE-019](BE-019.md), [BE-119](BE-119.md), [BE-120](BE-120.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 1219.

| Column                   | Type                                                 | Null |
| ------------------------ | ---------------------------------------------------- | ---: |
| `id`                     | BIGINT UNSIGNED PK                                   |   No |
| `export_request_id`      | BIGINT UNSIGNED FK                                   |   No |
| `export_artifact_id`     | BIGINT UNSIGNED FK                                   |   No |
| `nscmf_record_id`        | BIGINT UNSIGNED FK                                   |   No |
| `export_snapshot_id`     | BIGINT UNSIGNED FK                                   |   No |
| `workflow_iteration_id`  | BIGINT UNSIGNED FK                                   |   No |
| `signing_certificate_id` | BIGINT UNSIGNED FK → `nscmf_signing_certificates.id` |   No |
| `final_pdf_sha256`       | CHAR(64)                                             |   No |
| `issued_at`              | DATETIME(6)                                          |   No |

Constraints:

- unique `export_request_id`;
- unique `export_artifact_id`;
- index `final_pdf_sha256`;
- issuance row persists beyond 7-day binary cleanup;
- final hash is over **final signed PDF bytes**.

<a id="schema-49"></a>

## 11 §49 — Public Validator Currentness

Owner: [BE-019](BE-019.md), [BE-119](BE-119.md), [BE-120](BE-120.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 1241.

No second mutable `is_current` truth on issuance rows.

Currentness is resolved from authoritative relational context:

```text
recognized certificate/signature
+ exact final_pdf_sha256 match
+ known issuance/snapshot
+ issuance workflow_iteration_id
+ current NSCMF workflow iteration/status
```

Outcomes remain `VALID_CURRENT|VALID_SUPERSEDED|INVALID_MODIFIED|UNKNOWN`.

<a id="schema-50"></a>

## 11 §50 — `sessions`

Owner: [BE-020](BE-020.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 1261.

Use Laravel database session table as framework-owned runtime storage.

Standard fields include conceptually:

```text
id
user_id
ip_address
user_agent
payload
last_activity
```

Current security policy additionally requires explicit absolute-session anchor such as:

```text
authenticated_at DATETIME/TIMESTAMP NULL
```

This supports the 8-hour absolute lifetime.

Confirmed third-login policy requires deterministic identification/revocation of the oldest active authenticated session. Existing session identity + `authenticated_at` (or an equivalently explicit authoritative field) MUST support that operation.

Indexes: `user_id`, `last_activity`, `authenticated_at` where useful.

Sensitive re-auth proof lifetime is 15 minutes. Exact session-key/storage implementation for that proof belongs to `14`/implementation and does not require a plaintext password/proof table.

<a id="schema-51"></a>

## 11 §51 — Queue / Cache Tables

Owner: [BE-020](BE-020.md). Sumber [11](../project_doc/11_ERD_Database_Schema.md), baris 1290.

Laravel framework-owned runtime tables use standard migrations as appropriate:

```text
jobs
job_batches
failed_jobs
cache
cache_locks
```

Queue/job/cache payloads are technical/runtime state and never business source of truth.

## 11A §23 — Required New Schema Concepts

Owner: [BE-018](BE-018.md), [BE-102](BE-102.md). Sumber [11A](../project_doc/11A_Resumable_Attachment_Upload_Synchronization.md), baris 350.

`11_ERD_Database_Schema.md` must be interpreted as requiring these additional physical schema concepts for resumable attachment transport.

### 23.1 `nscmf_attachment_upload_sessions`

Purpose: authoritative metadata for a resumable attachment upload attempt before a final `nscmf_attachments` row becomes usable.

Recommended physical fields:

```text
id                         BIGINT / primary key
public_id                  UUID/ULID or equivalent non-sequential external identifier
nscmf_record_id            FK -> nscmf_records.id
initiated_by_user_id       FK -> users.id
original_filename          VARCHAR
normalized_extension       VARCHAR
client_declared_mime       VARCHAR nullable
expected_size_bytes        BIGINT
chunk_size_bytes           INT              -- 5 MiB current rule
expected_chunk_count       INT
client_fingerprint_sha256  CHAR(64) nullable -- resume hint only
upload_status              ENUM/string constrained to:
                           UPLOADING | ASSEMBLING | COMPLETED | EXPIRED | CANCELLED | FAILED
last_activity_at           DATETIME
expires_at                 DATETIME
assembly_storage_key       VARCHAR nullable
failure_code               VARCHAR nullable
created_at                 DATETIME
updated_at                 DATETIME
```

Security/authorization rule:

- `public_id`/ID never grants access;
- parent record + actor authorization always rechecked;
- `client_fingerprint_sha256` is never final authoritative hash;
- `last_activity_at`/`expires_at` advances only when a previously missing chunk is newly accepted; idempotent duplicate replay does not count as new progress.

### 23.2 `nscmf_attachment_upload_chunks`

Purpose: authoritative record of successfully accepted chunk indexes.

Recommended physical fields:

```text
id                         BIGINT / primary key
upload_session_id          FK -> nscmf_attachment_upload_sessions.id
chunk_index                INT
size_bytes                 INT
storage_key                VARCHAR
chunk_sha256               CHAR(64) nullable/SHOULD
accepted_at                DATETIME
created_at                 DATETIME
```

Required constraints/index intent:

```text
UNIQUE(upload_session_id, chunk_index)
INDEX(upload_session_id)
INDEX(upload_session_id, accepted_at)
```

A conflicting retransmission MUST NOT overwrite accepted chunk content silently.

### 23.3 Final Attachment Linkage

On successful finalization:

- final `nscmf_attachments` row stores server-computed authoritative SHA-256 and security status;
- upload session SHOULD reference resulting attachment OR final attachment SHOULD reference source upload session, but duplication is unnecessary;
- exact FK direction may follow existing `11` table ownership style;
- final attachment remains the normal business-facing attachment entity;
- chunk/session rows are transport metadata, not a replacement for `nscmf_attachments`.

## 11A §24 — Cleanup and Foreign-Key Intent

Owner: [BE-018](BE-018.md), [BE-102](BE-102.md). Sumber [11A](../project_doc/11A_Resumable_Attachment_Upload_Synchronization.md), baris 426.

Expired/cancelled/failed unfinished upload transport metadata MAY be physically removed as temporary technical data after controlled cleanup.

This temporary-data cleanup rule does **not** apply to:

- final `nscmf_attachments` business/security metadata according to its existing lifecycle;
- Business Audit;
- Access Audit;
- Security Audit;
- PDF issuance metadata.

Schema MUST permit deleting temporary chunk metadata/objects without cascading into the parent NSCMF record or authoritative audits.

## 11A §25 — File-Level Rules Remain Final

Owner: [BE-018](BE-018.md), [BE-102](BE-102.md). Sumber [11A](../project_doc/11A_Resumable_Attachment_Upload_Synchronization.md), baris 444.

Existing final attachment validation remains unchanged:

```text
max active attachments / record = 10
max final file size             = 20 MB
zero byte                       = rejected
allowed extensions              = .pdf .xls .xlsx .doc .docx .png .jpg .jpeg .txt .csv
```
