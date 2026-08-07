package repository

import (
	"context"
	"fmt"
	"strings"
)

type SearchResultItem struct {
	ID       string `json:"id"`
	Type     string `json:"type"`     // "control", "framework", "vendor", "policy", "product", "incident"
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

	searchPattern := "%" + query + "%"

	// 1. Controls
	ctrlRows, err := r.db.Pool.Query(ctx, `
		SELECT id, ref_code, title, category, status
		FROM controls
		WHERE workspace_id = $1 AND (title ILIKE $2 OR ref_code ILIKE $2 OR category ILIKE $2)
		ORDER BY title ASC LIMIT 8;
	`, workspaceID, searchPattern)
	if err == nil {
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

	// 2. Frameworks
	fwRows, err := r.db.Pool.Query(ctx, `
		SELECT f.id, f.name, f.code, f.version
		FROM frameworks f
		JOIN workspace_frameworks wf ON f.id = wf.framework_id
		WHERE wf.workspace_id = $1 AND (f.name ILIKE $2 OR f.code ILIKE $2)
		ORDER BY f.name ASC LIMIT 5;
	`, workspaceID, searchPattern)
	if err == nil {
		defer fwRows.Close()
		for fwRows.Next() {
			var id, name, code, version string
			if err := fwRows.Scan(&id, &name, &code, &version); err == nil {
				results = append(results, SearchResultItem{
					ID:       id,
					Type:     "framework",
					Title:    name,
					Subtitle: fmt.Sprintf("Framework • %s %s", code, version),
					URL:      "/compliance/frameworks",
				})
			}
		}
		fwRows.Close()
	}

	// 3. Vendors
	vRows, err := r.db.Pool.Query(ctx, `
		SELECT id, name, category, risk_tier
		FROM vendors
		WHERE workspace_id = $1 AND (name ILIKE $2 OR category ILIKE $2)
		ORDER BY name ASC LIMIT 5;
	`, workspaceID, searchPattern)
	if err == nil {
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

	// 4. Policies
	pRows, err := r.db.Pool.Query(ctx, `
		SELECT id, title, category, status
		FROM policies
		WHERE workspace_id = $1 AND (title ILIKE $2 OR category ILIKE $2)
		ORDER BY title ASC LIMIT 5;
	`, workspaceID, searchPattern)
	if err == nil {
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

	// 5. Products
	prodRows, err := r.db.Pool.Query(ctx, `
		SELECT id, name, code
		FROM products
		WHERE workspace_id = $1 AND (name ILIKE $2 OR code ILIKE $2)
		ORDER BY name ASC LIMIT 5;
	`, workspaceID, searchPattern)
	if err == nil {
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

	// 6. Incidents
	incRows, err := r.db.Pool.Query(ctx, `
		SELECT id, title, severity, status
		FROM incidents
		WHERE workspace_id = $1 AND (title ILIKE $2 OR severity ILIKE $2)
		ORDER BY created_at DESC LIMIT 5;
	`, workspaceID, searchPattern)
	if err == nil {
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
