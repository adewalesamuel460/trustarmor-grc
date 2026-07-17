package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/jackc/pgx/v5"
)

// GetIncidents lists all security incidents for a workspace
func (r *Repository) GetIncidents(ctx context.Context, workspaceID string) ([]models.Incident, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT i.id, i.workspace_id, i.title, i.description, i.severity, i.status, i.is_breach, 
		       i.discovered_at, i.regulatory_deadline, COALESCE(i.root_cause_analysis, ''), i.owner_id, 
		       u.full_name as owner_name, i.created_at, i.updated_at
		FROM incidents i
		LEFT JOIN users u ON i.owner_id = u.id
		WHERE i.workspace_id = $1
		ORDER BY i.discovered_at DESC;
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query incidents: %w", err)
	}
	defer rows.Close()

	var list []models.Incident
	for rows.Next() {
		var i models.Incident
		var ownerName *string
		err := rows.Scan(
			&i.ID, &i.WorkspaceID, &i.Title, &i.Description, &i.Severity, &i.Status, &i.IsBreach,
			&i.DiscoveredAt, &i.RegulatoryDeadline, &i.RootCauseAnalysis, &i.OwnerID, &ownerName,
			&i.CreatedAt, &i.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan incident: %w", err)
		}
		i.OwnerName = ownerName
		list = append(list, i)
	}
	return list, nil
}

// GetIncidentByID fetches a single incident by ID
func (r *Repository) GetIncidentByID(ctx context.Context, id string) (*models.Incident, error) {
	var i models.Incident
	var ownerName *string
	err := r.db.Pool.QueryRow(ctx, `
		SELECT i.id, i.workspace_id, i.title, i.description, i.severity, i.status, i.is_breach, 
		       i.discovered_at, i.regulatory_deadline, COALESCE(i.root_cause_analysis, ''), i.owner_id, 
		       u.full_name as owner_name, i.created_at, i.updated_at
		FROM incidents i
		LEFT JOIN users u ON i.owner_id = u.id
		WHERE i.id = $1;
	`, id).Scan(
		&i.ID, &i.WorkspaceID, &i.Title, &i.Description, &i.Severity, &i.Status, &i.IsBreach,
		&i.DiscoveredAt, &i.RegulatoryDeadline, &i.RootCauseAnalysis, &i.OwnerID, &ownerName,
		&i.CreatedAt, &i.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("incident not found: %w", err)
		}
		return nil, fmt.Errorf("failed to scan incident details: %w", err)
	}
	i.OwnerName = ownerName
	return &i, nil
}

// CreateIncident inserts a new incident record
func (r *Repository) CreateIncident(ctx context.Context, inc *models.Incident) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO incidents (workspace_id, title, description, severity, status, is_breach, 
		                       discovered_at, regulatory_deadline, owner_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at;
	`, inc.WorkspaceID, inc.Title, inc.Description, inc.Severity, inc.Status, inc.IsBreach,
		inc.DiscoveredAt, inc.RegulatoryDeadline, inc.OwnerID).Scan(&inc.ID, &inc.CreatedAt, &inc.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert incident: %w", err)
	}
	return nil
}

// GetIncidentUpdates lists chronological updates for an incident
func (r *Repository) GetIncidentUpdates(ctx context.Context, incidentID string) ([]models.IncidentUpdate, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT iu.id, iu.incident_id, iu.user_id, u.email as user_email, iu.update_text, iu.created_at
		FROM incident_updates iu
		LEFT JOIN users u ON iu.user_id = u.id
		WHERE iu.incident_id = $1
		ORDER BY iu.created_at ASC;
	`, incidentID)
	if err != nil {
		return nil, fmt.Errorf("failed to query incident updates: %w", err)
	}
	defer rows.Close()

	var list []models.IncidentUpdate
	for rows.Next() {
		var iu models.IncidentUpdate
		var userEmail *string
		err := rows.Scan(&iu.ID, &iu.IncidentID, &iu.UserID, &userEmail, &iu.UpdateText, &iu.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan incident update: %w", err)
		}
		iu.UserEmail = userEmail
		list = append(list, iu)
	}
	return list, nil
}

// CreateIncidentUpdate inserts a new update item in the timeline
func (r *Repository) CreateIncidentUpdate(ctx context.Context, update *models.IncidentUpdate) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO incident_updates (incident_id, user_id, update_text)
		VALUES ($1, $2, $3)
		RETURNING id, created_at;
	`, update.IncidentID, update.UserID, update.UpdateText).Scan(&update.ID, &update.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert incident update: %w", err)
	}
	return nil
}

// ResolveIncident records containing/resolving details and the RCA
func (r *Repository) ResolveIncident(ctx context.Context, id string, rca string, status string, resolvedAt time.Time) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE incidents
		SET status = $1, root_cause_analysis = $2, updated_at = $3
		WHERE id = $4;
	`, status, rca, resolvedAt, id)
	if err != nil {
		return fmt.Errorf("failed to update incident resolution: %w", err)
	}
	return nil
}

// GetVulnerabilities lists all vulnerabilities for a workspace
func (r *Repository) GetVulnerabilities(ctx context.Context, workspaceID string) ([]models.Vulnerability, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT v.id, v.workspace_id, v.integration_id, v.cve_id, v.title, v.severity, 
		       v.asset_affected, v.status, v.sla_deadline, v.discovered_at, v.resolved_at,
		       ip.name as integration_name
		FROM vulnerabilities v
		LEFT JOIN workspace_integrations wi ON v.integration_id = wi.id
		LEFT JOIN integration_providers ip ON wi.provider_id = ip.id
		WHERE v.workspace_id = $1
		ORDER BY v.sla_deadline ASC, v.discovered_at DESC;
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query vulnerabilities: %w", err)
	}
	defer rows.Close()

	var list []models.Vulnerability
	for rows.Next() {
		var v models.Vulnerability
		var integrationName *string
		err := rows.Scan(
			&v.ID, &v.WorkspaceID, &v.IntegrationID, &v.CVEID, &v.Title, &v.Severity,
			&v.AssetAffected, &v.Status, &v.SLADeadline, &v.DiscoveredAt, &v.ResolvedAt,
			&integrationName,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan vulnerability: %w", err)
		}
		v.IntegrationName = integrationName
		list = append(list, v)
	}
	return list, nil
}

// CreateVulnerability inserts a new vulnerability
func (r *Repository) CreateVulnerability(ctx context.Context, vuln *models.Vulnerability) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO vulnerabilities (workspace_id, integration_id, cve_id, title, severity, 
		                             asset_affected, status, sla_deadline, discovered_at, resolved_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id;
	`, vuln.WorkspaceID, vuln.IntegrationID, vuln.CVEID, vuln.Title, vuln.Severity,
		vuln.AssetAffected, vuln.Status, vuln.SLADeadline, vuln.DiscoveredAt, vuln.ResolvedAt).Scan(&vuln.ID)
	if err != nil {
		return fmt.Errorf("failed to insert vulnerability: %w", err)
	}
	return nil
}
