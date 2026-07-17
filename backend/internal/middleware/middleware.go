package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/repository"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/service"
)

type contextKey string

const (
	UserIDKey         contextKey = "user_id"
	WorkspaceIDKey    contextKey = "workspace_id"
	OrganizationIDKey contextKey = "organization_id"
	PermissionsKey    contextKey = "role_permissions"
	RoleNameKey       contextKey = "role_name"
)

func Auth(svc *service.Service) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "Unauthorized: Authorization header missing", http.StatusUnauthorized)
				return
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				http.Error(w, "Unauthorized: Invalid authorization format", http.StatusUnauthorized)
				return
			}

			userID, err := svc.ValidateToken(parts[1])
			if err != nil {
				http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func Tenant(repo *repository.Repository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := r.Context().Value(UserIDKey).(string)
			if !ok {
				http.Error(w, "Unauthorized: User ID context missing", http.StatusUnauthorized)
				return
			}

			workspaceID := r.Header.Get("X-Workspace-ID")
			if workspaceID == "" {
				// Allow requests that don't need a workspace context (e.g. lists workspaces)
				next.ServeHTTP(w, r)
				return
			}

			// Validate workspace membership
			member, err := repo.GetWorkspaceMember(r.Context(), workspaceID, userID)
			if err != nil {
				http.Error(w, "Forbidden: Workspace access denied", http.StatusForbidden)
				return
			}

			// Get workspace detail to fetch organization_id
			workspaces, err := repo.GetUserWorkspaces(r.Context(), userID)
			var orgID string
			for _, ws := range workspaces {
				if ws.ID == workspaceID {
					orgID = ws.OrganizationID
					break
				}
			}

			if orgID == "" {
				http.Error(w, "Forbidden: Workspace not found", http.StatusForbidden)
				return
			}

			// Get role details to fetch permissions
			role, err := repo.GetRoleByID(r.Context(), member.RoleID)
			if err != nil {
				http.Error(w, "Internal Server Error: Failed to fetch permissions", http.StatusInternalServerError)
				return
			}

			// Inject contexts
			ctx := context.WithValue(r.Context(), WorkspaceIDKey, workspaceID)
			ctx = context.WithValue(ctx, OrganizationIDKey, orgID)
			ctx = context.WithValue(ctx, PermissionsKey, role.Permissions)
			ctx = context.WithValue(ctx, RoleNameKey, role.Name)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequirePermission(permission string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			permissions, ok := r.Context().Value(PermissionsKey).([]string)
			if !ok {
				http.Error(w, "Forbidden: No permissions associated with context", http.StatusForbidden)
				return
			}

			hasPermission := false
			for _, p := range permissions {
				if p == permission {
					hasPermission = true
					break
				}
			}

			if !hasPermission {
				http.Error(w, "Forbidden: Insufficient permissions", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Workspace-ID")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Helpers to extract variables from request contexts
func GetUserID(ctx context.Context) string {
	val, _ := ctx.Value(UserIDKey).(string)
	return val
}

func GetWorkspaceID(ctx context.Context) string {
	val, _ := ctx.Value(WorkspaceIDKey).(string)
	return val
}

func GetOrganizationID(ctx context.Context) string {
	val, _ := ctx.Value(OrganizationIDKey).(string)
	return val
}

func GetRoleName(ctx context.Context) string {
	val, _ := ctx.Value(RoleNameKey).(string)
	return val
}

// RequireAuditorScoping blocks auditors from global resource URLs,
// and ensures they are assigned to any requested audit run.
func RequireAuditorScoping(repo *repository.Repository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			roleName := GetRoleName(r.Context())
			if roleName != "Auditor" {
				next.ServeHTTP(w, r)
				return
			}

			path := r.URL.Path
			// 1. Block global catalogs
			if strings.Contains(path, "/controls") || strings.Contains(path, "/integrations") {
				http.Error(w, "Forbidden: External Auditors are restricted from global catalogs", http.StatusForbidden)
				return
			}

			// 2. Restrict to assigned audit runs
			parts := strings.Split(path, "/")
			for i, p := range parts {
				if p == "audits" && i+1 < len(parts) {
					auditID := parts[i+1]
					// Skip sub-actions like /audits/requests/...
					if auditID != "" && auditID != "requests" {
						userID := GetUserID(r.Context())
						assigned, err := repo.IsAuditorAssignedToRun(r.Context(), auditID, userID)
						if err != nil || !assigned {
							http.Error(w, "Forbidden: Auditor is not assigned to this audit run", http.StatusForbidden)
							return
						}
					}
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequireGlobalAdmin restricts routes to platform support and administrators
func RequireGlobalAdmin(repo *repository.Repository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := r.Context().Value(UserIDKey).(string)
			if !ok || userID == "" {
				http.Error(w, "Unauthorized: User ID context missing", http.StatusUnauthorized)
				return
			}

			isAdmin, err := repo.IsGlobalAdmin(r.Context(), userID)
			if err != nil || !isAdmin {
				http.Error(w, "Forbidden: Global Admin privileges required", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

