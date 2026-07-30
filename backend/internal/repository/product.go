package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/jackc/pgx/v5"
)

// GetProducts retrieves all products registered for a workspace
func (r *Repository) GetProducts(ctx context.Context, workspaceID string) ([]models.Product, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, workspace_id, suite, name, COALESCE(description, ''), created_at
		FROM products
		WHERE workspace_id = $1
		ORDER BY suite ASC, name ASC;
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query products: %w", err)
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		err := rows.Scan(&p.ID, &p.WorkspaceID, &p.Suite, &p.Name, &p.Description, &p.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan product: %w", err)
		}
		products = append(products, p)
	}
	if products == nil {
		products = []models.Product{}
	}
	return products, nil
}

// CreateProduct creates a new product in a workspace
func (r *Repository) CreateProduct(ctx context.Context, p *models.Product) error {
	query := `
		INSERT INTO products (workspace_id, suite, name, description)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at;
	`
	err := r.db.Pool.QueryRow(ctx, query, p.WorkspaceID, p.Suite, p.Name, p.Description).Scan(&p.ID, &p.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create product: %w", err)
	}
	return nil
}

// GetProductByID retrieves a single product by ID within a workspace
func (r *Repository) GetProductByID(ctx context.Context, workspaceID string, productID string) (models.Product, error) {
	var p models.Product
	query := `
		SELECT id, workspace_id, suite, name, COALESCE(description, ''), created_at
		FROM products
		WHERE id = $1 AND workspace_id = $2;
	`
	err := r.db.Pool.QueryRow(ctx, query, productID, workspaceID).Scan(&p.ID, &p.WorkspaceID, &p.Suite, &p.Name, &p.Description, &p.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return p, fmt.Errorf("product not found: %w", err)
		}
		return p, fmt.Errorf("failed to get product by id: %w", err)
	}
	return p, nil
}

// GetProductPosture calculates the compliance posture for a product across all activated frameworks
func (r *Repository) GetProductPosture(ctx context.Context, workspaceID string, productID string) (models.ProductPosture, error) {
	product, err := r.GetProductByID(ctx, workspaceID, productID)
	if err != nil {
		return models.ProductPosture{}, err
	}

	posture := models.ProductPosture{
		ProductID:         product.ID,
		ProductName:       product.Name,
		Suite:             product.Suite,
		Description:       product.Description,
		FrameworkPostures: []models.FrameworkPostureSummary{},
	}

	// Fetch activated frameworks for workspace
	rows, err := r.db.Pool.Query(ctx, `
		SELECT f.id, f.name, f.version
		FROM frameworks f
		JOIN workspace_frameworks wf ON f.id = wf.framework_id
		WHERE wf.workspace_id = $1 AND wf.status = 'active'
		ORDER BY f.name ASC;
	`, workspaceID)
	if err != nil {
		return posture, fmt.Errorf("failed to query activated frameworks: %w", err)
	}
	defer rows.Close()

	type fw struct {
		ID      string
		Name    string
		Version string
	}
	var activatedFws []fw
	for rows.Next() {
		var f fw
		if err := rows.Scan(&f.ID, &f.Name, &f.Version); err == nil {
			activatedFws = append(activatedFws, f)
		}
	}

	for _, f := range activatedFws {
		var total int
		err := r.db.Pool.QueryRow(ctx, `
			SELECT COUNT(*) FROM framework_requirements WHERE framework_id = $1;
		`, f.ID).Scan(&total)
		if err != nil || total == 0 {
			posture.FrameworkPostures = append(posture.FrameworkPostures, models.FrameworkPostureSummary{
				FrameworkID:          f.ID,
				FrameworkName:        f.Name,
				FrameworkVersion:     f.Version,
				CompliancePercentage: 0,
				TotalRequirements:    total,
				CoveredRequirements:  0,
			})
			continue
		}

		var covered int
		err = r.db.Pool.QueryRow(ctx, `
			SELECT COUNT(DISTINCT fr.id)
			FROM framework_requirements fr
			JOIN control_mappings cm ON fr.id = cm.requirement_id
			JOIN controls c ON cm.control_id = c.id
			JOIN control_products cp ON c.id = cp.control_id
			WHERE fr.framework_id = $1 AND c.workspace_id = $2 AND cp.product_id = $3;
		`, f.ID, workspaceID, productID).Scan(&covered)
		if err != nil {
			covered = 0
		}

		percentage := (float64(covered) / float64(total)) * 100.0
		posture.FrameworkPostures = append(posture.FrameworkPostures, models.FrameworkPostureSummary{
			FrameworkID:          f.ID,
			FrameworkName:        f.Name,
			FrameworkVersion:     f.Version,
			CompliancePercentage: percentage,
			TotalRequirements:    total,
			CoveredRequirements:  covered,
		})
	}

	return posture, nil
}

// LinkControlProducts maps a control to one or more products
func (r *Repository) LinkControlProducts(ctx context.Context, controlID string, productIDs []string, coverage string) error {
	if coverage == "" {
		coverage = "full"
	}

	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Clear existing product mappings for control
	_, err = tx.Exec(ctx, `DELETE FROM control_products WHERE control_id = $1;`, controlID)
	if err != nil {
		return fmt.Errorf("failed to clear control_products: %w", err)
	}

	for _, pid := range productIDs {
		_, err = tx.Exec(ctx, `
			INSERT INTO control_products (control_id, product_id, coverage)
			VALUES ($1, $2, $3)
			ON CONFLICT (control_id, product_id) DO UPDATE SET coverage = EXCLUDED.coverage;
		`, controlID, pid, coverage)
		if err != nil {
			return fmt.Errorf("failed to link control %s to product %s: %w", controlID, pid, err)
		}
	}

	return tx.Commit(ctx)
}

// GetProductControls lists all controls linked to a specific product with their current status and coverage
func (r *Repository) GetProductControls(ctx context.Context, workspaceID string, productID string) ([]models.ProductControlDetail, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT c.id, c.title, COALESCE(c.description, ''), c.type, c.frequency, c.current_status, cp.coverage, c.last_tested_at
		FROM controls c
		JOIN control_products cp ON c.id = cp.control_id
		WHERE c.workspace_id = $1 AND cp.product_id = $2
		ORDER BY c.title ASC;
	`, workspaceID, productID)
	if err != nil {
		return nil, fmt.Errorf("failed to query product controls: %w", err)
	}
	defer rows.Close()

	var controls []models.ProductControlDetail
	for rows.Next() {
		var cd models.ProductControlDetail
		err := rows.Scan(&cd.ControlID, &cd.Title, &cd.Description, &cd.Type, &cd.Frequency, &cd.CurrentStatus, &cd.Coverage, &cd.LastTestedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan product control detail: %w", err)
		}
		controls = append(controls, cd)
	}
	if controls == nil {
		controls = []models.ProductControlDetail{}
	}
	return controls, nil
}
