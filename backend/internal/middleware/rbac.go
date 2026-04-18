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

		// Team Leaders: GET, specific POST, and specific PATCH
		if role == "team_leader" {
			if method == http.MethodGet {
				if strings.HasPrefix(path, "/api/users") {
					// Exception: Allow seeing own profile or own user ID
					currentUserID := c.GetString("userID")
					if path == "/api/users/profile" || path == "/api/users/"+currentUserID {
						c.Next()
						return
					}
					c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
					return
				}
				if strings.HasPrefix(path, "/api/settings") || strings.HasPrefix(path, "/api/statistics") {
					c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
					return
				}
				c.Next()
				return
			}
			if method == http.MethodPost {
				// Security Patch: Tighten Team Leader POST access to explicit allow-list
				allowedPosts := []string{
					"/api/admissions",
					"/api/reservations",
					"/api/operations/assignments",
					"/api/notifications/read",
					"/api/leaves",
				}
				
				isAllowed := false
				for _, p := range allowedPosts {
					if path == p || strings.HasPrefix(path, p+"/") {
						isAllowed = true
						break
					}
				}

				if isAllowed {
					c.Next()
					return
				}
				
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Team Leaders are restricted from creating these resources"})
				return
			}
			if method == http.MethodPatch && (strings.HasPrefix(path, "/api/reservations/") || strings.HasPrefix(path, "/api/admissions/") || strings.HasPrefix(path, "/api/leaves/")) && strings.HasSuffix(path, "/status") {
				// Explicitly check that they are ONLY updating status to "approved" or "denied"/"rejected"
				bodyBytes, err := io.ReadAll(c.Request.Body)
				if err == nil {
					// Restore the io.ReadCloser to its original state for the handler
					c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

					var reqBody map[string]interface{}
					if err := json.Unmarshal(bodyBytes, &reqBody); err == nil {
						if status, ok := reqBody["status"].(string); ok {
							allowedStatuses := []string{"approved", "denied", "rejected", "cancelled"}
							for _, s := range allowedStatuses {
								if status == s {
									c.Next()
									return
								}
							}
						}
					}
				}
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Unauthorized status update"})
				return
			}
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Team Leaders cannot perform this action"})
			return
		}

		// Employees: GET and specific POST
		if role == "employee" {
			if method == http.MethodGet {
				if strings.HasPrefix(path, "/api/users") {
					// Exception: Allow seeing own profile or own user ID
					currentUserID := c.GetString("userID")
					if path == "/api/users/profile" || path == "/api/users/"+currentUserID {
						c.Next()
						return
					}
					c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
					return
				}
				if strings.HasPrefix(path, "/api/settings") || strings.HasPrefix(path, "/api/statistics") {
					c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
					return
				}
				c.Next()
				return
			}
			if method == http.MethodPost && (path == "/api/reservations" || path == "/api/admissions" || path == "/api/leaves" || strings.HasSuffix(path, "/accept")) {
				c.Next()
				return
			}
			if method == http.MethodPatch && strings.HasPrefix(path, "/api/leaves/") && strings.HasSuffix(path, "/status") {
				// Employees can only CANCEL their own requests
				c.Next() // Deeper check inside handler (userID check)
				return
			}
			if method == http.MethodPatch && strings.HasPrefix(path, "/api/admissions/") && strings.HasSuffix(path, "/status") {
				// Employees can reject assignments assigned to them
				c.Next() // Deeper check inside handler
				return
			}
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Employees are restricted from this action"})
			return
		}

		// Deny all others
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Unauthorized action"})
	}
}

// BodyLimiter prevents DoS attacks by limiting the size of the request body
func BodyLimiter(limit int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, limit)
		c.Next()
	}
}
