package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// RBACMiddleware enforces Role-Based Access Control logic globally
func RBACMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		role := c.GetString("userRole")
		if role == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "User role not found in context"})
			return
		}

		method := c.Request.Method
		path := c.Request.URL.Path

		// Managers & Super Admins: full CRUD access
		if role == "super_admin" || role == "manager" {
			c.Next()
			return
		}

		// Team Leaders: GET, POST, and specific PATCH
		if role == "team_leader" {
			if method == http.MethodGet {
				if strings.HasPrefix(path, "/api/users") || strings.HasPrefix(path, "/api/settings") || strings.HasPrefix(path, "/api/statistics") {
					c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
					return
				}
				c.Next()
				return
			}
			if method == http.MethodPost {
				c.Next()
				return
			}
			if method == http.MethodPatch && strings.HasPrefix(path, "/api/reservations/") && strings.HasSuffix(path, "/status") {
				// Explicitly check that they are ONLY updating status to "approved" or "denied"
				bodyBytes, err := io.ReadAll(c.Request.Body)
				if err == nil {
					// Restore the io.ReadCloser to its original state for the handler
					c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

					var reqBody map[string]interface{}
					if err := json.Unmarshal(bodyBytes, &reqBody); err == nil {
						if status, ok := reqBody["status"].(string); ok {
							if status == "approved" || status == "denied" || status == "rejected" {
								c.Next()
								return
							}
						}
					}
				}
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Team Leaders can only approve or deny reservations"})
				return
			}
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Team Leaders cannot perform this action"})
			return
		}

		// Employees: GET and specific POST
		if role == "employee" {
			if method == http.MethodGet {
				if strings.HasPrefix(path, "/api/users") || strings.HasPrefix(path, "/api/settings") || strings.HasPrefix(path, "/api/statistics") {
					c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
					return
				}
				c.Next()
				return
			}
			if method == http.MethodPost && path == "/api/reservations" {
				c.Next()
				return
			}
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Employees are restricted from this action"})
			return
		}

		// Deny all others
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Unauthorized action"})
	}
}
