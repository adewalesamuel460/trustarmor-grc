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

	// Normalize common acronyms & typos
	cleanQuery := strings.ToLower(query)
	if strings.Contains(cleanQuery, "hippa") {
		cleanQuery = strings.ReplaceAll(cleanQuery, "hippa", "hipaa")
	}

	searchPattern := "%" + cleanQuery + "%"

	// 1. Frameworks Catalog (e.g. NDPR, SOC 2, HIPAA, ISO 27001, NIST CSF, PCI DSS)
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

	// 2. Framework Requirements / Clauses (e.g. NDPR Art 2.1, CC6.1, A.5.1, 164.312)
	reqRows, err := r.db.Pool.Query(ctx, `
		SELECT fr.id, fr.identifier, fr.title, f.name as framework_name
		FROM framework_requirements fr
		JOIN frameworks f ON fr.framework_id = f.id
		WHERE fr.identifier ILIKE $1 OR fr.title ILIKE $1 OR fr.description ILIKE $1 OR f.name ILIKE $1
		ORDER BY fr.identifier ASC LIMIT 8;
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

	// 3. Security Controls Catalog (Columns: id, title, description, type, frequency)
	ctrlRows, err := r.db.Pool.Query(ctx, `
		SELECT id, title, COALESCE(description, ''), type
		FROM controls
		WHERE workspace_id = $1 AND (title ILIKE $2 OR description ILIKE $2 OR type ILIKE $2)
		ORDER BY title ASC LIMIT 8;
	`, workspaceID, searchPattern)
	if err != nil {
		log.Printf("[GlobalSearch Error] Controls search failed: %v", err)
	} else {
		defer ctrlRows.Close()
		for ctrlRows.Next() {
			var id, title, desc, ctrlType string
			if err := ctrlRows.Scan(&id, &title, &desc, &ctrlType); err == nil {
				results = append(results, SearchResultItem{
					ID:       id,
					Type:     "control",
					Title:    title,
					Subtitle: fmt.Sprintf("Control • %s", ctrlType),
					URL:      "/compliance/controls",
				})
			}
		}
		ctrlRows.Close()
	}

	// 4. Vendors (TPRM) (Columns: id, name, domain, description, risk_tier, status)
	vRows, err := r.db.Pool.Query(ctx, `
		SELECT id, name, COALESCE(domain, ''), COALESCE(risk_tier, 'medium'), COALESCE(status, 'active')
		FROM vendors
		WHERE workspace_id = $1 AND (name ILIKE $2 OR domain ILIKE $2 OR description ILIKE $2)
		ORDER BY name ASC LIMIT 5;
	`, workspaceID, searchPattern)
	if err != nil {
		log.Printf("[GlobalSearch Error] Vendors search failed: %v", err)
	} else {
		defer vRows.Close()
		for vRows.Next() {
			var id, name, domain, riskTier, status string
			if err := vRows.Scan(&id, &name, &domain, &riskTier, &status); err == nil {
				results = append(results, SearchResultItem{
					ID:       id,
					Type:     "vendor",
					Title:    name,
					Subtitle: fmt.Sprintf("Vendor • %s Risk • %s", riskTier, status),
					URL:      "/compliance/vendors",
				})
			}
		}
		vRows.Close()
	}

	// 5. Policies (Columns: id, title, description, status, current_version)
	pRows, err := r.db.Pool.Query(ctx, `
		SELECT id, title, COALESCE(status, 'draft'), current_version
		FROM policies
		WHERE workspace_id = $1 AND (title ILIKE $2 OR description ILIKE $2 OR content ILIKE $2)
		ORDER BY title ASC LIMIT 5;
	`, workspaceID, searchPattern)
	if err != nil {
		log.Printf("[GlobalSearch Error] Policies search failed: %v", err)
	} else {
		defer pRows.Close()
		for pRows.Next() {
			var id, title, status string
			var version int
			if err := pRows.Scan(&id, &title, &status, &version); err == nil {
				results = append(results, SearchResultItem{
					ID:       id,
					Type:     "policy",
					Title:    title,
					Subtitle: fmt.Sprintf("Policy • v%d • %s", version, status),
					URL:      "/compliance/policies",
				})
			}
		}
		pRows.Close()
	}

	// 6. Products (Columns: id, suite, name, description)
	prodRows, err := r.db.Pool.Query(ctx, `
		SELECT id, name, suite
		FROM products
		WHERE workspace_id = $1 AND (name ILIKE $2 OR suite ILIKE $2 OR description ILIKE $2)
		ORDER BY name ASC LIMIT 5;
	`, workspaceID, searchPattern)
	if err != nil {
		log.Printf("[GlobalSearch Error] Products search failed: %v", err)
	} else {
		defer prodRows.Close()
		for prodRows.Next() {
			var id, name, suite string
			if err := prodRows.Scan(&id, &name, &suite); err == nil {
				results = append(results, SearchResultItem{
					ID:       id,
					Type:     "product",
					Title:    name,
					Subtitle: fmt.Sprintf("Product • Suite %s", suite),
					URL:      fmt.Sprintf("/compliance/products/%s", id),
				})
			}
		}
		prodRows.Close()
	}

	// 7. Incidents (Columns: id, title, severity, status)
	incRows, err := r.db.Pool.Query(ctx, `
		SELECT id, title, severity, status
		FROM incidents
		WHERE workspace_id = $1 AND (title ILIKE $2 OR severity ILIKE $2 OR description ILIKE $2)
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
