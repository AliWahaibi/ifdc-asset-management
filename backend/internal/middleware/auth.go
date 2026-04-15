package middleware

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"ifdc-backend/internal/database"
	"ifdc-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func RequireAuth() gin.HandlerFunc {
	// Retrieve secret on startup to ensure it's available
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		// main.go should catch this, but middleware is the final line of defense
		panic("JWT_SECRET environment variable is not set")
	}
	jwtSecret := []byte(secret)

	return func(c *gin.Context) {
		tokenString, err := c.Cookie("access_token")
		if err != nil {
			// Fallback to Header for non-browser clients
			authHeader := c.GetHeader("Authorization")
			if authHeader == "" {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header or cookie required"})
				return
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token format"})
				return
			}

			tokenString = parts[1]
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			return
		}

		userID, ok := claims["sub"].(string)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID in token"})
			return
		}

		// Security Fix: Check if user exists in DB and is active
		var user models.User
		if err := database.DB.Where("id = ?", userID).First(&user).Error; err != nil {
			// User deleted or not found
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "User no longer exists"})
			return
		}

		if user.Status == "suspended" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Your account has been suspended. Please contact the administrator."})
			return
		}

		// Set context variable
		c.Set("userID", user.ID)
		c.Set("userRole", user.Role)

		c.Next()
	}
}
