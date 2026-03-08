package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"

	"ifdc-backend/internal/database"
	"ifdc-backend/internal/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email,max=255"`
	Password string `json:"password" binding:"required,min=6,max=255"`
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

	// Check if the stored hash is a bcrypt hash
	_, err := bcrypt.Cost([]byte(user.PasswordHash))
	if err == nil {
		// It is a bcrypt hash, verify using bcrypt
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
			return
		}
	} else {
		// Not a bcrypt hash, assume SHA-256 (legacy)
		hasher := sha256.New()
		hasher.Write([]byte(req.Password))
		hashedPassword := hex.EncodeToString(hasher.Sum(nil))

		if user.PasswordHash != hashedPassword {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token":  "demo-token-" + user.Role,
		"refresh_token": "refresh-token-" + user.Role,
		"user":          user,
	})
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

func RefreshToken(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate refresh token
	if !strings.HasPrefix(req.RefreshToken, "refresh-token-") {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
		return
	}

	role := strings.TrimPrefix(req.RefreshToken, "refresh-token-")

	c.JSON(http.StatusOK, gin.H{
		"access_token": "demo-token-" + role,
	})
}
