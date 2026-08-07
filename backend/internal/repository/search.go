package repository

import (
	"context"
	"fmt"
	"log"
	"strings"
)

type SearchResultItem struct {
	ID       string `json:"id"`
	Type     string `json:"type"`     // "control", "framework", "requirement", "vendor", "policy", "product", "incident"
	Title    string `json:"title"`
	Subtitle string `json:"subtitle"`
	URL      string `json:"url"`
}

func (r *Repository) GlobalSearch(ctx context.Context, workspaceID string, query string) ([]SearchResultItem, error) {
	results := []SearchResultItem{}
	query = strings.TrimSpace(query)
	if query == "" {
		return results, nil
	}

	// Normalize common typos (e.g. "hippa" -> "hipaa")
	cleanQuery := strings.ToLower(query)
	if strings.Contains(cleanQuery, "hippa") {
		cleanQuery = strings.ReplaceAll(cleanQuery, "hippa", "hipaa")
	}

	searchPattern := "%" + cleanQuery + "%"

	// 1. Frameworks Catalog (Global catalog + active status in workspace)
	fwRows, err := r.db.Pool.Query(ctx, `
		SELECT f.id, f.name, f.version, COALESCE(f.description, ''),
		       EXISTS(SELECT 1 FROM workspace_frameworks wf WHERE wf.framework_id = f.id AND wf.workspace_id = $1) as is_active
		FROM frameworks f
		WHERE f.name ILIKE $2 OR f.description ILIKE $2
		ORDER BY is_active DESC, f.name ASC LIMIT 8;
	`, workspaceID, searchPattern)
	if err != nil {
		log.Printf("[GlobalSearch Error] Frameworks search failed: %v", err)
	} else {
		defer fwRows.Close()
		for fwRows.Next() {
			var id, name, version, desc string
			var isActive bool
			if err := fwRows.Scan(&id, &name, &version, &desc, &isActive); err == nil {
				statusStr := "Inactive Standard"
				if isActive {
					statusStr = "Active Framework"
				}
				results = append(results, SearchResultItem{
					ID:       id,
					Type:     "framework",
					Title:    name,
					Subtitle: fmt.Sprintf("Framework • %s • %s", version, statusStr),
					URL:      "/compliance/frameworks",
				})
			}
		}
		fwRows.Close()
	}

	// 2. Framework Requirements / Clauses (e.g. CC6.1, CC7.1, A.5.1, Art 2.2)
	reqRows, err := r.db.Pool.Query(ctx, `
		SELECT fr.id, fr.identifier, fr.title, f.name as framework_name
		FROM framework_requirements fr
		JOIN frameworks f ON fr.framework_id = f.id
		WHERE fr.identifier ILIKE $1 OR fr.title ILIKE $1 OR fr.description ILIKE $1
		ORDER BY fr.identifier ASC LIMIT 6;
	`, searchPattern)
	if err != nil {
		log.Printf("[GlobalSearch Error] Requirements search failed: %v", err)
	} else {
		defer reqRows.Close()
		for reqRows.Next() {
			var id, identifier, title, frameworkName string
			if err := reqRows.Scan(&id, &identifier, &title, &frameworkName); err == nil {
				results = append(results, SearchResultItem{
					ID:       id,
					Type:     "requirement",
					Title:    fmt.Sprintf("[%s] %s", identifier, title),
					Subtitle: fmt.Sprintf("Requirement • %s Clause", frameworkName),
					URL:      "/compliance/frameworks",
				})
			}
		}
		reqRows.Close()
	}

	// 3. Security Controls Catalog
	ctrlRows, err := r.db.Pool.Query(ctx, `
		SELECT id, ref_code, title, category, status
		FROM controls
		WHERE workspace_id = $1 AND (title ILIKE $2 OR ref_code ILIKE $2 OR category ILIKE $2 OR description ILIKE $2)
		ORDER BY title ASC LIMIT 8;
	`, workspaceID, searchPattern)
	if err != nil {
		log.Printf("[GlobalSearch Error] Controls search failed: %v", err)
	} else {
		defer ctrlRows.Close()
		for ctrlRows.Next() {
			var id, refCode, title, category, status string
			if err := ctrlRows.Scan(&id, &refCode, &title, &category, &status); err == nil {
				results = append(results, SearchResultItem{
					ID:       id,
					Type:     "control",
					Title:    fmt.Sprintf("[%s] %s", refCode, title),
					Subtitle: fmt.Sprintf("Control • %s • %s", category, status),
					URL:      "/compliance/controls",
				})
			}
		}
		ctrlRows.Close()
	}

	// 4. Vendors (TPRM)
	vRows, err := r.db.Pool.Query(ctx, `
		SELECT id, name, category, risk_tier
		FROM vendors
		WHERE workspace_id = $1 AND (name ILIKE $2 OR category ILIKE $2)
		ORDER BY name ASC LIMIT 5;
	`, workspaceID, searchPattern)
	if err != nil {
		log.Printf("[GlobalSearch Error] Vendors search failed: %v", err)
	} else {
		defer vRows.Close()
		for vRows.Next() {
			var id, name, category, riskTier string
			if err := vRows.Scan(&id, &name, &category, &riskTier); err == nil {
				results = append(results, SearchResultItem{
					ID:       id,
					Type:     "vendor",
					Title:    name,
					Subtitle: fmt.Sprintf("Vendor • %s • %s Risk", category, riskTier),
					URL:      "/compliance/vendors",
				})
			}
		}
		vRows.Close()
	}

	// 5. Policies
	pRows, err := r.db.Pool.Query(ctx, `
		SELECT id, title, category, status
		FROM policies
		WHERE workspace_id = $1 AND (title ILIKE $2 OR category ILIKE $2)
		ORDER BY title ASC LIMIT 5;
	`, workspaceID, searchPattern)
	if err != nil {
		log.Printf("[GlobalSearch Error] Policies search failed: %v", err)
	} else {
		defer pRows.Close()
		for pRows.Next() {
			var id, title, category, status string
			if err := pRows.Scan(&id, &title, &category, &status); err == nil {
				results = append(results, SearchResultItem{
					ID:       id,
					Type:     "policy",
					Title:    title,
					Subtitle: fmt.Sprintf("Policy • %s • %s", category, status),
					URL:      "/compliance/policies",
				})
			}
		}
		pRows.Close()
	}

	// 6. Products
	prodRows, err := r.db.Pool.Query(ctx, `
		SELECT id, name, code
		FROM products
		WHERE workspace_id = $1 AND (name ILIKE $2 OR code ILIKE $2)
		ORDER BY name ASC LIMIT 5;
	`, workspaceID, searchPattern)
	if err != nil {
		log.Printf("[GlobalSearch Error] Products search failed: %v", err)
	} else {
		defer prodRows.Close()
		for prodRows.Next() {
			var id, name, code string
			if err := prodRows.Scan(&id, &name, &code); err == nil {
				results = append(results, SearchResultItem{
					ID:       id,
					Type:     "product",
					Title:    name,
					Subtitle: fmt.Sprintf("Product • %s", code),
					URL:      fmt.Sprintf("/compliance/products/%s", id),
				})
			}
		}
		prodRows.Close()
	}

	// 7. Incidents
	incRows, err := r.db.Pool.Query(ctx, `
		SELECT id, title, severity, status
		FROM incidents
		WHERE workspace_id = $1 AND (title ILIKE $2 OR severity ILIKE $2)
		ORDER BY created_at DESC LIMIT 5;
	`, workspaceID, searchPattern)
	if err != nil {
		log.Printf("[GlobalSearch Error] Incidents search failed: %v", err)
	} else {
		defer incRows.Close()
		for incRows.Next() {
			var id, title, severity, status string
			if err := incRows.Scan(&id, &title, &severity, &status); err == nil {
				results = append(results, SearchResultItem{
					ID:       id,
					Type:     "incident",
					Title:    title,
					Subtitle: fmt.Sprintf("Incident • %s • %s", severity, status),
					URL:      "/compliance/incidents",
				})
			}
		}
		incRows.Close()
	}

	return results, nil
}
