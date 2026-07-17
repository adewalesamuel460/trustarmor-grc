# TrustArmor GRC Platform - Product Documentation

Welcome to the official product documentation for **TrustArmor**, a modern, state-of-the-art Governance, Risk, and Compliance (GRC) platform. This document provides a comprehensive overview of the platform modules, features, database models, technical architecture, and operator guides.

---

## 1. Product Overview

TrustArmor is an enterprise-ready GRC platform designed to automate cybersecurity audits, centralize risk management, track vulnerabilities, and streamline incident response. The platform is structured to ensure absolute compliance with global cybersecurity standards (ISO 27001, PCI DSS v4.0, NIST CSF 2.0) and data protection privacy mandates (GDPR, HIPAA).

---

## 2. Core Modules & Key Features

### 2.1. Multi-Framework Compliance Management
* **Global Frameworks Library**: Standard compliance databases loaded with ISO 27001 (2022), PCI DSS v4.0, NIST CSF 2.0, GDPR, and HIPAA.
* **Workspace Activations**: Workspaces can dynamically activate/deactivate specific compliance frameworks.
* **Internal Control Mapping**: Map a single internal security control to multiple requirements across different frameworks, enabling write-once-comply-everywhere functionality.

### 2.2. Incident Response & Regulatory Breach Monitoring
* **Incident Logger**: Track security events classified by severity (Critical, High, Medium, Low).
* **72-Hour Breach Breach SLA Timer**: Automates regulatory breach notifications. If an incident is marked as a "data breach", the system initializes a strict 72-hour countdown window, critical for GDPR and NDPR compliance.
* **Timeline Activity Log**: Chronological audit logs recording containments, resolutions, and notes on security incidents.
* **Root Cause Analysis (RCA)**: Structured fields to document incident causes and corrective preventive actions.

### 2.3. Vulnerability Register
* **CVE Ingestion**: Aggregates vulnerabilities and affected assets from scanning tools.
* **Enforced SLAs**: Automatic SLA resolution deadlines calculated based on CVSS severity:
  * **Critical**: 14 Days
  * **High**: 30 Days
  * **Medium**: 90 Days
* **Patch Tracker**: Tracks discovery dates, resolution timelines, and patch validation states.

### 2.4. Remote Auditor Portal
* **Scoped Reviews**: Create dedicated "Audit Runs" restricting external auditor access.
* **Auditor Role Assignment**: Grant third-party auditors read-only access to control mappings, evidence, and policies without disclosing other workspace data.

### 2.5. Tasks & Notifications
* **Task Management**: Assign compliance tasks (remediation, patch approvals) to team owners with due dates.
* **Notification Rules**: Configurable notifications notifying users of upcoming SLAs or past-due reviews.

### 2.6. Access Reviews & Identity Governance
* **User Inventory**: Track workspace memberships, user roles (Admin, Compliance Manager, Auditor, Employee), and permissions.
* **Supervisor Approvals**: Periodic review logs validating user access rights.

### 2.7. Public Trust Center
* **NDA-Gated Trust Portal**: Publish compliance achievements publicly (SOC 2, ISO certifications) with self-service NDA signing forms.

### 2.8. Global Super Admin Portal
* **Internal Operator Panel**: Operational console for support and compliance employees.
* **Tenant Lifecycle Control**: Suspend or reactivate organizations with name safety confirmation checks.
* **Audit Trails**: Security logs documenting support employee actions, IP addresses, and payload details.
* **User Impersonation**: Temporarily swap credentials to a tenant user session for troubleshooting. A persistent, bright red impersonation banner alert protects this session boundary.

---

## 3. Platform Architecture

### Frontend (Next.js & React)
* **Framework**: Next.js App Router.
* **Styling**: Tailwind CSS with rich dark theme aesthetics.
* **State & Auth**: Client-side JSON Web Token (JWT) credentials cached in local storage.
* **Layouts**: Modular dashboard routing (`(dashboard)`) and admin guards (`(super-admin)`).

### Backend (Go)
* **API Router**: Chi Router supplying structured, high-performance REST endpoints.
* **Database Driver**: pgx pool supporting safe PostgreSQL connections.
* **Migrations**: Sequential schema migrations triggered automatically on backend starts.

---

## 4. Database Schema Reference

### 4.1. Core Tables
* **`users`**: User registration records, password hashes, and MFA secrets.
* **`organizations`**: Tenants with `subscription_tier` ('free', 'pro', 'enterprise') and `status` ('active', 'suspended').
* **`workspaces`**: Workspace buckets partitioned under organizations.
* **`frameworks`**: Global read-only compliance standards.
* **`framework_requirements`**: Regulatory requirements mapping to frameworks.
* **`workspace_frameworks`**: Association mappings linking active frameworks to workspaces.

### 4.2. Incident & Vulnerability Schema
* **`incidents`**: Security incidents, root cause analyses, and breach flags.
* **`global_admins`**: Registered employees designated as platform support/admins.
* **`global_audit_logs`**: Internal operator activities (suspensions, impersonations).

---

## 5. System Administration & Guides

### 5.1. Initial Installation
1. Start the PostgreSQL instance and verify connection URI parameters.
2. Build and launch the Go API backend:
   ```bash
   cd backend
   go run cmd/api/main.go
   ```
3. Boot the Next.js development server:
   ```bash
   cd frontend
   npm run dev
   ```

### 5.2. Impersonating a User
1. Enter the **Super Admin Portal** (accessible in the sidebar footer if logged in as an administrator).
2. Select the target organization from the Directory.
3. Click **Impersonate** next to the user's email.
4. The system will swap access credentials and redirect you to the main dashboard. A red alert banner will indicate that you are impersonating a user.
5. Click **[End Impersonation]** in the header to return to your administrator session.
