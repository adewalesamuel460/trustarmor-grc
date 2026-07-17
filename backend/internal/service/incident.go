package service

import (
	"context"
	"fmt"
	"time"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
)

// GetIncidents returns list of incidents for workspace
func (s *Service) GetIncidents(ctx context.Context, workspaceID string) ([]models.Incident, error) {
	return s.repo.GetIncidents(ctx, workspaceID)
}

// CreateIncident creates a new incident and calculates regulatory SLA if is_breach is true
func (s *Service) CreateIncident(ctx context.Context, inc *models.Incident) error {
	if inc.DiscoveredAt.IsZero() {
		inc.DiscoveredAt = time.Now()
	}
	
	if inc.IsBreach {
		deadline := inc.DiscoveredAt.Add(72 * time.Hour)
		inc.RegulatoryDeadline = &deadline
	} else {
		inc.RegulatoryDeadline = nil
	}

	return s.repo.CreateIncident(ctx, inc)
}

// GetIncidentUpdates lists chronological timeline updates
func (s *Service) GetIncidentUpdates(ctx context.Context, incidentID string) ([]models.IncidentUpdate, error) {
	return s.repo.GetIncidentUpdates(ctx, incidentID)
}

// CreateIncidentUpdate appends a new update item to the incident timeline
func (s *Service) CreateIncidentUpdate(ctx context.Context, update *models.IncidentUpdate) error {
	if update.UpdateText == "" {
		return fmt.Errorf("update text cannot be empty")
	}
	return s.repo.CreateIncidentUpdate(ctx, update)
}

// ResolveIncident marks incident contained/resolved and submits Root Cause Analysis (RCA)
func (s *Service) ResolveIncident(ctx context.Context, id string, rca string, status string) error {
	if status != "contained" && status != "resolved" && status != "closed" {
		status = "resolved" // Fallback
	}
	
	return s.repo.ResolveIncident(ctx, id, rca, status, time.Now())
}

// GetVulnerabilities lists all vulnerabilities for workspace
func (s *Service) GetVulnerabilities(ctx context.Context, workspaceID string) ([]models.Vulnerability, error) {
	return s.repo.GetVulnerabilities(ctx, workspaceID)
}

// CreateVulnerability inserts vulnerability and calculates SLA deadline based on severity
func (s *Service) CreateVulnerability(ctx context.Context, vuln *models.Vulnerability) error {
	if vuln.DiscoveredAt.IsZero() {
		vuln.DiscoveredAt = time.Now()
	}

	var days int
	switch vuln.Severity {
	case "critical":
		days = 14
	case "high":
		days = 30
	case "medium":
		days = 90
	case "low":
		days = 180
	default:
		days = 90 // Default fallback
	}

	deadline := time.Now().AddDate(0, 0, days)
	vuln.SLADeadline = &deadline

	return s.repo.CreateVulnerability(ctx, vuln)
}
