package middleware

import (
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware handles Cross-Origin Resource Sharing based on environment variables
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		allowedOriginsEnv := os.Getenv("ALLOWED_ORIGINS")
		var allowedOrigins []string

		if allowedOriginsEnv == "" {
			// Fallback to localhost for local development
			allowedOrigins = []string{"http://localhost:5173", "http://localhost:3000", "http://localhost:8080"}
		} else {
			// Parse comma-separated list
			origins := strings.Split(allowedOriginsEnv, ",")
			for _, origin := range origins {
				allowedOrigins = append(allowedOrigins, strings.TrimSpace(origin))
			}
		}

		origin := c.Request.Header.Get("Origin")
		allowOrigin := ""

		// Check if origin is allowed
		for _, o := range allowedOrigins {
			if o == origin {
				allowOrigin = o
				break
			}
		}

		// If allowed, set the header
		if allowOrigin != "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", allowOrigin)
		}

		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
