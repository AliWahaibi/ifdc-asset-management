package handlers

import (
	"fmt"
	"net/http"
	"os"
	"time"

	"ifdc-backend/internal/database"
	"ifdc-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email,max=255"`
	Password string `json:"password" binding:"required,min=6,max=255"`
}

func generateToken(userID string, role string, expiry time.Duration) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return "", fmt.Errorf("JWT_SECRET not set")
	}

	claims := jwt.MapClaims{
		"sub":  userID,
		"role": role,
		"exp":  time.Now().Add(expiry).Unix(),
		"iat":  time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if user.Status == "suspended" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Your account has been suspended. Please contact the administrator."})
		return
	}

	// Strictly use bcrypt (no SHA-256 fallback)
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Generate real JWT tokens
	accessToken, err := generateToken(user.ID, user.Role, 24*time.Hour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate access token"})
		return
	}

	refreshToken, err := generateToken(user.ID, user.Role, 7*24*time.Hour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate refresh token"})
		return
	}

	// Set HttpOnly Cookies for tokens
	isRelease := gin.Mode() == gin.ReleaseMode
	
	c.SetCookie("access_token", accessToken, 24*3600, "/", "", isRelease, true)
	c.SetCookie("refresh_token", refreshToken, 7*24*3600, "/", "", isRelease, true)

	c.JSON(http.StatusOK, gin.H{
		"user": user,
	})

	// Log successful login
	database.CreateLog("INFO", "User Login", "User logged in successfully via email", &user.ID)
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

func RefreshToken(c *gin.Context) {
	// Try to get refresh token from cookie first
	refreshToken, err := c.Cookie("refresh_token")
	if err != nil {
		// Fallback to body if not in cookie (for certain API clients)
		var req RefreshRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Refresh token missing"})
			return
		}
		refreshToken = req.RefreshToken
	}

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Server configuration error"})
		return
	}

	// Validate real JWT refresh token
	token, err := jwt.Parse(refreshToken, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(secret), nil
	})

	if err != nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired refresh token"})
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
		return
	}

	userID := claims["sub"].(string)
	role := claims["role"].(string)

	newAccessToken, err := generateToken(userID, role, 24*time.Hour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate new access token"})
		return
	}

	// Update access token cookie
	isRelease := gin.Mode() == gin.ReleaseMode
	c.SetCookie("access_token", newAccessToken, 24*3600, "/", "", isRelease, true)

	c.JSON(http.StatusOK, gin.H{
		"message": "Token refreshed successfully",
	})
}
