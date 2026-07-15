package service

import (
	"context"
	"log"
	"time"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/repository"
)

type AuditService struct {
	repo *repository.Repository
}

func NewAuditService(repo *repository.Repository) *AuditService {
	return &AuditService{repo: repo}
}

// LogEvent asynchronously captures an audit log event so that API responses are non-blocking.
func (s *AuditService) LogEvent(
	workspaceID string,
	actorID *string,
	actorEmail *string,
	action string,
	resourceType string,
	resourceID string,
	oldValue interface{},
	newValue interface{},
	ipAddress string,
) {
	// Execute database write in a background goroutine
	go func() {
		// Use a detached background context to ensure execution even if the request context is canceled
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		auditLog := models.AuditLog{
			WorkspaceID:  workspaceID,
			ActorID:      actorID,
			ActorEmail:   actorEmail,
			Action:       action,
			ResourceType: resourceType,
			ResourceID:   resourceID,
			OldValue:     oldValue,
			NewValue:     newValue,
			IPAddress:    ipAddress,
		}

		err := s.repo.CreateAuditLog(ctx, auditLog)
		if err != nil {
			log.Printf("ERROR [AuditLogger]: failed to write background audit log for action %s: %v", action, err)
		} else {
			log.Printf("INFO [AuditLogger]: successfully logged action %s on %s:%s", action, resourceType, resourceID)
		}
	}()
}

func (s *AuditService) GetAuditLogs(ctx context.Context, workspaceID string, filters repository.AuditFilter, limit, offset int) ([]models.AuditLog, error) {
	return s.repo.GetAuditLogs(ctx, workspaceID, filters, limit, offset)
}

func (s *AuditService) CountAuditLogs(ctx context.Context, workspaceID string, filters repository.AuditFilter) (int, error) {
	return s.repo.CountAuditLogs(ctx, workspaceID, filters)
}
