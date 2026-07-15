package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/jackc/pgx/v5"
)

// GetRisks returns all risks with nested treatments and control mappings
func (r *Repository) GetRisks(ctx context.Context, workspaceID string) ([]models.Risk, error) {
	// 1. Fetch risk headers
	rows, err := r.db.Pool.Query(ctx, `
		SELECT r.id, r.workspace_id, r.title, r.description, r.category,
		       r.likelihood, r.impact, r.inherent_score, r.residual_score, r.status,
		       r.owner_id, u.email as owner_email, r.created_at, r.updated_at
		FROM risks r
		LEFT JOIN users u ON r.owner_id = u.id
		WHERE r.workspace_id = $1
		ORDER BY r.created_at DESC;
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query risks: %w", err)
	}
	defer rows.Close()

	var risks []models.Risk
	riskMap := make(map[string]int)

	for rows.Next() {
		var r models.Risk
		err := rows.Scan(
			&r.ID, &r.WorkspaceID, &r.Title, &r.Description, &r.Category,
			&r.Likelihood, &r.Impact, &r.InherentScore, &r.ResidualScore, &r.Status,
			&r.OwnerID, &r.OwnerEmail, &r.CreatedAt, &r.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan risk header: %w", err)
		}
		r.Treatments = []models.RiskTreatment{}
		r.ControlIDs = []string{}
		
		riskMap[r.ID] = len(risks)
		risks = append(risks, r)
	}
	rows.Close()

	if len(risks) == 0 {
		return risks, nil
	}

	// 2. Fetch all treatments in bulk
	tRows, err := r.db.Pool.Query(ctx, `
		SELECT id, risk_id, strategy, description, TO_CHAR(target_date, 'YYYY-MM-DD') as target_date, completed_at, created_at
		FROM risk_treatments
		WHERE risk_id IN (
			SELECT id FROM risks WHERE workspace_id = $1
		)
		ORDER BY created_at ASC;
	`, workspaceID)
	if err == nil {
		defer tRows.Close()
		for tRows.Next() {
			var t models.RiskTreatment
			err := tRows.Scan(&t.ID, &t.RiskID, &t.Strategy, &t.Description, &t.TargetDate, &t.CompletedAt, &t.CreatedAt)
			if err == nil {
				if idx, ok := riskMap[t.RiskID]; ok {
					risks[idx].Treatments = append(risks[idx].Treatments, t)
				}
			}
		}
		tRows.Close()
	}

	// 3. Fetch all control mappings in bulk
	mRows, err := r.db.Pool.Query(ctx, `
		SELECT risk_id, control_id FROM risk_control_mappings
		WHERE risk_id IN (
			SELECT id FROM risks WHERE workspace_id = $1
		);
	`, workspaceID)
	if err == nil {
		defer mRows.Close()
		for mRows.Next() {
			var riskID, controlID string
			if err := mRows.Scan(&riskID, &controlID); err == nil {
				if idx, ok := riskMap[riskID]; ok {
					risks[idx].ControlIDs = append(risks[idx].ControlIDs, controlID)
				}
			}
		}
		mRows.Close()
	}

	return risks, nil
}

// CreateRisk inserts a new risk, calculating score first
func (r *Repository) CreateRisk(ctx context.Context, risk *models.Risk) error {
	risk.InherentScore = risk.Likelihood * risk.Impact

	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO risks (workspace_id, title, description, category, likelihood, impact, inherent_score, status, owner_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8)
		RETURNING id, created_at, updated_at;
	`, risk.WorkspaceID, risk.Title, risk.Description, risk.Category, risk.Likelihood, risk.Impact, risk.InherentScore, risk.OwnerID).Scan(&risk.ID, &risk.CreatedAt, &risk.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create risk: %w", err)
	}

	risk.Status = "open"
	risk.Treatments = []models.RiskTreatment{}
	risk.ControlIDs = []string{}
	return nil
}

// UpdateRisk updates risk headers, updating score dynamically
func (r *Repository) UpdateRisk(ctx context.Context, risk *models.Risk) error {
	risk.InherentScore = risk.Likelihood * risk.Impact

	_, err := r.db.Pool.Exec(ctx, `
		UPDATE risks
		SET title = $1, description = $2, category = $3, likelihood = $4, impact = $5, inherent_score = $6, status = $7, owner_id = $8, updated_at = CURRENT_TIMESTAMP
		WHERE id = $9;
	`, risk.Title, risk.Description, risk.Category, risk.Likelihood, risk.Impact, risk.InherentScore, risk.Status, risk.OwnerID, risk.ID)
	if err != nil {
		return fmt.Errorf("failed to update risk: %w", err)
	}
	return nil
}

// GetRiskByID returns a single risk details
func (r *Repository) GetRiskByID(ctx context.Context, id string) (*models.Risk, error) {
	var risk models.Risk
	err := r.db.Pool.QueryRow(ctx, `
		SELECT r.id, r.workspace_id, r.title, r.description, r.category,
		       r.likelihood, r.impact, r.inherent_score, r.residual_score, r.status,
		       r.owner_id, u.email as owner_email, r.created_at, r.updated_at
		FROM risks r
		LEFT JOIN users u ON r.owner_id = u.id
		WHERE r.id = $1;
	`, id).Scan(
		&risk.ID, &risk.WorkspaceID, &risk.Title, &risk.Description, &risk.Category,
		&risk.Likelihood, &risk.Impact, &risk.InherentScore, &risk.ResidualScore, &risk.Status,
		&risk.OwnerID, &risk.OwnerEmail, &risk.CreatedAt, &risk.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("risk not found: %w", err)
		}
		return nil, fmt.Errorf("failed to query risk: %w", err)
	}

	risk.Treatments = []models.RiskTreatment{}
	risk.ControlIDs = []string{}

	// Query treatments
	tRows, err := r.db.Pool.Query(ctx, `
		SELECT id, risk_id, strategy, description, TO_CHAR(target_date, 'YYYY-MM-DD') as target_date, completed_at, created_at
		FROM risk_treatments
		WHERE risk_id = $1
		ORDER BY created_at ASC;
	`, id)
	if err == nil {
		defer tRows.Close()
		for tRows.Next() {
			var t models.RiskTreatment
			if err := tRows.Scan(&t.ID, &t.RiskID, &t.Strategy, &t.Description, &t.TargetDate, &t.CompletedAt, &t.CreatedAt); err == nil {
				risk.Treatments = append(risk.Treatments, t)
			}
		}
		tRows.Close()
	}

	// Query control mappings
	mRows, err := r.db.Pool.Query(ctx, `
		SELECT control_id FROM risk_control_mappings
		WHERE risk_id = $1;
	`, id)
	if err == nil {
		defer mRows.Close()
		for mRows.Next() {
			var cID string
			if err := mRows.Scan(&cID); err == nil {
				risk.ControlIDs = append(risk.ControlIDs, cID)
			}
		}
		mRows.Close()
	}

	return &risk, nil
}

// AddTreatment inserts a treatment plan
func (r *Repository) AddTreatment(ctx context.Context, t *models.RiskTreatment) error {
	// Parse target date if any
	var targetDate interface{}
	if t.TargetDate != nil && *t.TargetDate != "" {
		targetDate = *t.TargetDate
	}

	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO risk_treatments (risk_id, strategy, description, target_date, completed_at)
		VALUES ($1, $2, $3, $4, NULL)
		RETURNING id, created_at;
	`, t.RiskID, t.Strategy, t.Description, targetDate).Scan(&t.ID, &t.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create treatment plan: %w", err)
	}
	return nil
}

// MapRiskControls updates mapped controls inside transaction
func (r *Repository) MapRiskControls(ctx context.Context, riskID string, controlIDs []string) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin map-controls transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Delete old mappings
	_, err = tx.Exec(ctx, `DELETE FROM risk_control_mappings WHERE risk_id = $1;`, riskID)
	if err != nil {
		return fmt.Errorf("failed to delete old control mappings: %w", err)
	}

	// Insert new mappings
	for _, cid := range controlIDs {
		_, err = tx.Exec(ctx, `
			INSERT INTO risk_control_mappings (risk_id, control_id)
			VALUES ($1, $2)
			ON CONFLICT (risk_id, control_id) DO NOTHING;
		`, riskID, cid)
		if err != nil {
			return fmt.Errorf("failed to insert mapping for control %s: %w", cid, err)
		}
	}

	return tx.Commit(ctx)
}

// GetRiskHeatmap outputs risk intersections count
func (r *Repository) GetRiskHeatmap(ctx context.Context, workspaceID string) ([]models.HeatmapCell, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT likelihood, impact, COUNT(*)::integer as count
		FROM risks
		WHERE workspace_id = $1
		GROUP BY likelihood, impact;
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate heatmap: %w", err)
	}
	defer rows.Close()

	var cells []models.HeatmapCell
	for rows.Next() {
		var c models.HeatmapCell
		if err := rows.Scan(&c.Likelihood, &c.Impact, &c.Count); err == nil {
			cells = append(cells, c)
		}
	}
	return cells, nil
}
