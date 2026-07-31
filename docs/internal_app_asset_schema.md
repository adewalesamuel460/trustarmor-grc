# Internal App Asset Reporting Schema & Telemetry Specification

This document specifies the required JSON payload format, asset type definitions, and telemetry field requirements for internal applications, custom microservices, and proprietary SaaS platforms self-reporting compliance state to TrustArmor GRC.

---

## 1. Authentication & Endpoint

Internal applications transmit telemetry to TrustArmor GRC over HTTPS via:

- **Endpoint**: `POST /workspaces/{workspace_id}/integrations/{connection_id}/assets`
- **Header**: `Authorization: Bearer <API_KEY>` (or `X-API-Key: <API_KEY>`)
- **Content-Type**: `application/json`

---

## 2. Request Payload Structure

```json
{
  "product_id": "e1000000-0000-0000-0000-000000000001",
  "assets": [
    {
      "asset_type": "custom_user",
      "external_id": "usr-scm-admin-01",
      "name": "SCM Lead Developer Account",
      "raw_data": {
        "mfa_enabled": true,
        "mfa_active": true,
        "last_login": "2026-07-31T00:00:00Z"
      },
      "compliance_risk": false
    },
    {
      "asset_type": "custom_cloud_database",
      "external_id": "db-scm-pg-01",
      "name": "SCM Primary Postgres Store",
      "raw_data": {
        "encrypted_at_rest": true,
        "encryption_type": "AES256",
        "backup_last_run": "2026-07-30T23:00:00Z",
        "multi_az": true
      },
      "compliance_risk": false
    }
  ]
}
```

---

## 3. Asset Type Specifications & Telemetry Fields

### A. `custom_user` (User & Service Accounts)
Used for reporting user accounts, admin profiles, and service accounts managed internally by the application.

| Field Name | Type | Description | Evaluator Expectation |
| :--- | :--- | :--- | :--- |
| `mfa_enabled` | `boolean` | Indicates if 2FA/MFA is enforced on the account | Checked by `MFAEvaluator`. Must be `true` to pass. |
| `mfa_active` | `boolean` | Alternate boolean flag for MFA status | Checked by `MFAEvaluator`. Must be `true` to pass. |
| `last_login` | `string` (ISO 8601) | Timestamp of user's last authentication event | Evaluated for inactive account retention rules. |
| `role` | `string` | User authorization role (e.g. `admin`, `developer`, `viewer`) | Evaluated for least privilege access reviews. |

---

### B. `custom_cloud_database` (Databases & Persistent Data Stores)
Used for reporting primary databases (Postgres, MySQL, MongoDB, Redis) backing the product.

| Field Name | Type | Description | Evaluator Expectation |
| :--- | :--- | :--- | :--- |
| `encrypted_at_rest` | `boolean` | Indicates if database storage / disk is encrypted | Checked by `EncryptionEvaluator`. Must be `true` to pass. |
| `encryption_type` | `string` | Encryption algorithm used (e.g. `AES256`, `AWS-KMS`) | Checked by `EncryptionEvaluator`. Must be non-empty or `encrypted_at_rest: true`. |
| `backup_last_run` | `string` (ISO 8601) | Timestamp of the most recent automated database backup | Evaluated for Disaster Recovery (DR) compliance. |
| `multi_az` | `boolean` | Indicates High Availability / multi-zone deployment | Checked for Business Continuity SLA requirements. |

---

### C. `custom_cloud_server` (Compute, Web & Application Nodes)
Used for reporting microservice web servers, container pods, and background workers.

| Field Name | Type | Description | Evaluator Expectation |
| :--- | :--- | :--- | :--- |
| `tls_version` | `string` | Active TLS protocol version (e.g. `TLSv1.3`) | Must be `TLSv1.2` or `TLSv1.3` for transit encryption controls. |
| `disk_encrypted` | `boolean` | Storage volume encryption status | Evaluated for node disk security. |
| `publicly_accessible` | `boolean` | Indicates if server is directly exposed to public internet | Must be `false` for private backend services. |

---

## 4. Automatic Evaluation & Sync Logs

Upon receiving a valid telemetry POST request:
1. TrustArmor GRC upserts the assets into the central CMDB (`assets`).
2. Assets are tagged with the product's `product_id`.
3. A `sync_logs` entry is recorded with status `'success'` and `records_fetched: len(assets)`.
4. Automated continuous evaluators (`MFAEvaluator`, `EncryptionEvaluator`, etc.) are triggered asynchronously via `asynq` worker jobs.
5. The product's compliance score on the **Product Compliance** dashboard (`/compliance/products`) updates automatically.
