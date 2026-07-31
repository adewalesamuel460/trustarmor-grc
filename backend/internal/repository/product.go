package repository

import (
	"context"
	"errors"
	"fmt"
	"log"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/jackc/pgx/v5"
)

// GetProducts retrieves all products registered for a workspace
func (r *Repository) GetProducts(ctx context.Context, workspaceID string) ([]models.Product, error) {
	// Auto-seed default suite products if workspace has no products yet
	var count int
	_ = r.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM products WHERE workspace_id = $1`, workspaceID).Scan(&count)
	if count == 0 {
		_, _ = r.db.Pool.Exec(ctx, `
			INSERT INTO products (workspace_id, suite, name, description) VALUES
			($1, 'Nvuto ERP', 'SCM', 'Supply Chain Management module for tracking logistics, inventory, and procurement.'),
			($1, 'Nvuto ERP', 'CRM', 'Customer Relationship Management for client onboarding and account management.'),
			($1, 'Nvuto ERP', 'Webhosting', 'Cloud infrastructure hosting and domain provisioning engine.'),
			($1, 'Nvuto ERP', 'Finance', 'Financial accounting, general ledger, and payment processing suite.'),
			($1, 'Nvuto ERP', 'Mail', 'Enterprise email messaging and secure attachment exchange service.'),
			($1, 'Nvuto ERP', 'HR', 'Human resources management, payroll, and employee records portal.'),
			($1, 'HustleX', 'HustleX', 'Freelance & gig workforce operations and billing manager.')
			ON CONFLICT (workspace_id, name) DO NOTHING;

		`, workspaceID)

		// Link existing controls in this workspace to newly seeded products
		_, _ = r.db.Pool.Exec(ctx, `
			INSERT INTO control_products (control_id, product_id, coverage)
			SELECT c.id, p.id, 'full'
			FROM controls c, products p
			WHERE c.workspace_id = $1 AND p.workspace_id = $1
			ON CONFLICT DO NOTHING;
		`, workspaceID)
	}

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

	// Check if product has any linked controls
	var linkedCount int
	err = r.db.Pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM control_products cp
		JOIN controls c ON cp.control_id = c.id
		WHERE cp.product_id = $1 AND c.workspace_id = $2;
	`, productID, workspaceID).Scan(&linkedCount)
	if err != nil {
		linkedCount = 0
	}

	posture.LinkedControlsCount = linkedCount
	posture.HasLinkedControls = linkedCount > 0

	if !posture.HasLinkedControls {
		posture.OverallPercentage = 0
		return posture, nil
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

	var sumPercentages float64
	var countedFws int

	for _, f := range activatedFws {
		reqRows, err := r.db.Pool.Query(ctx, `
			SELECT 
				fr.id,
				fr.identifier,
				fr.title,
				COALESCE(fr.description, ''),
				COALESCE(cov.control_id::text, ''),
				COALESCE(cov.control_title, '')
			FROM framework_requirements fr
			LEFT JOIN LATERAL (
				SELECT c.id AS control_id, c.title AS control_title
				FROM control_mappings cm
				JOIN controls c ON cm.control_id = c.id
				JOIN control_products cp ON c.id = cp.control_id
				WHERE cm.requirement_id = fr.id
				  AND c.workspace_id = $2
				  AND cp.product_id = $3
				  AND c.current_status = 'passing'
				LIMIT 1
			) cov ON true
			WHERE fr.framework_id = $1
			ORDER BY fr.identifier ASC;
		`, f.ID, workspaceID, productID)

		var reqDetails []models.RequirementCoverageDetail
		var covered int
		if err == nil {
			for reqRows.Next() {
				var rd models.RequirementCoverageDetail
				var cID, cTitle string
				if scanErr := reqRows.Scan(&rd.ID, &rd.RequirementCode, &rd.Title, &rd.Description, &cID, &cTitle); scanErr == nil {
					if cID != "" {
						rd.IsCovered = true
						rd.CoveringControlID = cID
						rd.CoveringControlTitle = cTitle
						covered++
					} else {
						rd.IsCovered = false
					}
					reqDetails = append(reqDetails, rd)
				}
			}
			reqRows.Close()
		}
		if reqDetails == nil {
			reqDetails = []models.RequirementCoverageDetail{}
		}

		total := len(reqDetails)
		var percentage float64
		if total > 0 {
			percentage = (float64(covered) / float64(total)) * 100.0
		}

		sumPercentages += percentage
		countedFws++

		posture.FrameworkPostures = append(posture.FrameworkPostures, models.FrameworkPostureSummary{
			FrameworkID:          f.ID,
			FrameworkName:        f.Name,
			FrameworkVersion:     f.Version,
			CompliancePercentage: percentage,
			TotalRequirements:    total,
			CoveredRequirements:  covered,
			Requirements:         reqDetails,
		})
	}

	if countedFws > 0 {
		posture.OverallPercentage = sumPercentages / float64(countedFws)
	}

	return posture, nil
}

// GetAllProductsPosture retrieves the compliance posture for all products in a workspace
func (r *Repository) GetAllProductsPosture(ctx context.Context, workspaceID string) ([]models.ProductPosture, error) {
	products, err := r.GetProducts(ctx, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get products for posture calculation: %w", err)
	}

	postures := make([]models.ProductPosture, 0, len(products))
	for _, p := range products {
		posture, err := r.GetProductPosture(ctx, workspaceID, p.ID)
		if err != nil {
			log.Printf("Warning: failed to calculate posture for product %s (%s): %v", p.Name, p.ID, err)
			posture = models.ProductPosture{
				ProductID:           p.ID,
				ProductName:         p.Name,
				Suite:               p.Suite,
				Description:         p.Description,
				HasLinkedControls:   false,
				LinkedControlsCount: 0,
				OverallPercentage:   0,
				FrameworkPostures:   []models.FrameworkPostureSummary{},
			}
		}
		postures = append(postures, posture)
	}
	return postures, nil
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

		// Query mapped requirement codes for control
		reqCodeRows, _ := r.db.Pool.Query(ctx, `
			SELECT DISTINCT fr.identifier
			FROM control_mappings cm
			JOIN framework_requirements fr ON cm.requirement_id = fr.id
			WHERE cm.control_id = $1
			ORDER BY fr.identifier ASC;
		`, cd.ControlID)
		var codes []string
		if reqCodeRows != nil {
			for reqCodeRows.Next() {
				var code string
				if reqCodeRows.Scan(&code) == nil {
					codes = append(codes, code)
				}
			}
			reqCodeRows.Close()
		}
		if codes == nil {
			codes = []string{}
		}
		cd.MappedRequirementCodes = codes

		controls = append(controls, cd)
	}
	if controls == nil {
		controls = []models.ProductControlDetail{}
	}
	return controls, nil
}

