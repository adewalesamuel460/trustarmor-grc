package repository

import (
	"context"
	"fmt"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
)

// CreateFramework inserts a new compliance framework
func (r *Repository) CreateFramework(ctx context.Context, f *models.Framework) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO frameworks (name, version, description)
		VALUES ($1, $2, $3)
		RETURNING id, created_at;
	`, f.Name, f.Version, f.Description).Scan(&f.ID, &f.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert framework: %w", err)
	}
	return nil
}

// GetFrameworks retrieves all globally available compliance frameworks
func (r *Repository) GetFrameworks(ctx context.Context) ([]models.Framework, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, name, version, description, created_at 
		FROM frameworks 
		ORDER BY name ASC;
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query frameworks: %w", err)
	}
	defer rows.Close()

	var frameworks []models.Framework
	for rows.Next() {
		var f models.Framework
		err := rows.Scan(&f.ID, &f.Name, &f.Version, &f.Description, &f.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan framework: %w", err)
		}
		frameworks = append(frameworks, f)
	}

	return frameworks, nil
}

// GetActivatedFrameworks retrieves frameworks that have been activated by the workspace
func (r *Repository) GetActivatedFrameworks(ctx context.Context, workspaceID string) ([]models.Framework, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT f.id, f.name, f.version, f.description, wf.created_at 
		FROM frameworks f
		JOIN workspace_frameworks wf ON f.id = wf.framework_id
		WHERE wf.workspace_id = $1 AND wf.status = 'active'
		ORDER BY f.name ASC;
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query activated frameworks: %w", err)
	}
	defer rows.Close()

	var frameworks []models.Framework
	for rows.Next() {
		var f models.Framework
		err := rows.Scan(&f.ID, &f.Name, &f.Version, &f.Description, &f.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan activated framework: %w", err)
		}
		frameworks = append(frameworks, f)
	}

	return frameworks, nil
}

// ActivateFramework registers a framework as active for a workspace
func (r *Repository) ActivateFramework(ctx context.Context, workspaceID string, frameworkID string) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO workspace_frameworks (workspace_id, framework_id, status)
		VALUES ($1, $2, 'active')
		ON CONFLICT (workspace_id, framework_id) 
		DO UPDATE SET status = 'active';
	`, workspaceID, frameworkID)
	if err != nil {
		return fmt.Errorf("failed to activate framework: %w", err)
	}
	return nil
}

// CreateControl inserts a new internal compliance control
func (r *Repository) CreateControl(ctx context.Context, c *models.Control) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO controls (workspace_id, title, description, type, frequency, owner_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at;
	`, c.WorkspaceID, c.Title, c.Description, c.Type, c.Frequency, c.OwnerID).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert control: %w", err)
	}
	return nil
}

// GetControls retrieves controls for a workspace, including mapped requirement identifiers
func (r *Repository) GetControls(ctx context.Context, workspaceID string) ([]models.Control, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT c.id, c.workspace_id, c.title, c.description, c.type, c.frequency, c.owner_id, c.current_status, c.last_tested_at, c.created_at, c.updated_at,
		       COALESCE(array_agg(fr.identifier) FILTER (WHERE fr.identifier IS NOT NULL), '{}') as mapped_requirements
		FROM controls c
		LEFT JOIN control_mappings cm ON c.id = cm.control_id
		LEFT JOIN framework_requirements fr ON cm.requirement_id = fr.id
		WHERE c.workspace_id = $1
		GROUP BY c.id, c.workspace_id, c.title, c.description, c.type, c.frequency, c.owner_id, c.current_status, c.last_tested_at, c.created_at, c.updated_at
		ORDER BY c.created_at DESC;
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query controls: %w", err)
	}
	defer rows.Close()

	var controls []models.Control
	for rows.Next() {
		var c models.Control
		err := rows.Scan(
			&c.ID, &c.WorkspaceID, &c.Title, &c.Description, &c.Type, &c.Frequency, &c.OwnerID, 
			&c.CurrentStatus, &c.LastTestedAt, &c.CreatedAt, &c.UpdatedAt, &c.MappedRequirements,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan control: %w", err)
		}
		controls = append(controls, c)
	}

	return controls, nil
}

// GetControlByID retrieves a single control by ID
func (r *Repository) GetControlByID(ctx context.Context, controlID string) (*models.Control, error) {
	var c models.Control
	err := r.db.Pool.QueryRow(ctx, `
		SELECT id, workspace_id, title, description, type, frequency, owner_id, current_status, last_tested_at, created_at, updated_at
		FROM controls
		WHERE id = $1;
	`, controlID).Scan(
		&c.ID, &c.WorkspaceID, &c.Title, &c.Description, &c.Type, &c.Frequency, &c.OwnerID, 
		&c.CurrentStatus, &c.LastTestedAt, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get control by id: %w", err)
	}
	return &c, nil
}

// MapControl replaces existing requirement mappings for a control
func (r *Repository) MapControl(ctx context.Context, controlID string, requirementIDs []string) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Wipe existing mappings
	_, err = tx.Exec(ctx, `DELETE FROM control_mappings WHERE control_id = $1;`, controlID)
	if err != nil {
		return fmt.Errorf("failed to clear existing mappings: %w", err)
	}

	// Insert new mappings
	for _, reqID := range requirementIDs {
		_, err = tx.Exec(ctx, `
			INSERT INTO control_mappings (control_id, requirement_id)
			VALUES ($1, $2)
			ON CONFLICT (control_id, requirement_id) DO NOTHING;
		`, controlID, reqID)
		if err != nil {
			return fmt.Errorf("failed to insert mapping for req %s: %w", reqID, err)
		}
	}

	if err = tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// GetPosture calculates the compliance posture (covered requirements / total requirements)
func (r *Repository) GetPosture(ctx context.Context, workspaceID string, frameworkID string) (float64, error) {
	var total int
	err := r.db.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM framework_requirements WHERE framework_id = $1;
	`, frameworkID).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("failed to count total requirements: %w", err)
	}

	if total == 0 {
		return 0.0, nil
	}

	var covered int
	err = r.db.Pool.QueryRow(ctx, `
		SELECT COUNT(DISTINCT fr.id)
		FROM framework_requirements fr
		JOIN control_mappings cm ON fr.id = cm.requirement_id
		JOIN controls c ON cm.control_id = c.id
		WHERE fr.framework_id = $1 AND c.workspace_id = $2;
	`, frameworkID, workspaceID).Scan(&covered)
	if err != nil {
		return 0, fmt.Errorf("failed to count covered requirements: %w", err)
	}

	percentage := (float64(covered) / float64(total)) * 100.0
	return percentage, nil
}

// GetRequirements retrieves all requirements mapped with their framework name
func (r *Repository) GetRequirements(ctx context.Context) ([]models.Requirement, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, framework_id, identifier, title, description, created_at
		FROM framework_requirements
		ORDER BY identifier ASC;
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query requirements: %w", err)
	}
	defer rows.Close()

	var requirements []models.Requirement
	for rows.Next() {
		var req models.Requirement
		err := rows.Scan(&req.ID, &req.FrameworkID, &req.Identifier, &req.Title, &req.Description, &req.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan requirement: %w", err)
		}
		requirements = append(requirements, req)
	}

	return requirements, nil
}
