package handlers

import (
	"net/http"

	"ifdc-backend/internal/database"
	"ifdc-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// GetSettings fetches the global system settings (ID: 1)
func GetSettings(c *gin.Context) {
	var settings models.SystemSetting
	if err := database.DB.First(&settings, 1).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch settings"})
		return
	}
	c.JSON(http.StatusOK, settings)
}

// UpdateSettings updates the global system settings (ID: 1)
func UpdateSettings(c *gin.Context) {
	var req models.SystemSetting
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existing models.SystemSetting
	if err := database.DB.First(&existing, 1).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Settings not found"})
		return
	}

	// Update fields
	existing.CompanyName = req.CompanyName
	existing.SupportEmail = req.SupportEmail
	existing.MaintenanceThresholdHours = req.MaintenanceThresholdHours
	existing.DefaultCurrency = req.DefaultCurrency

	if err := database.DB.Save(&existing).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update settings"})
		return
	}

	c.JSON(http.StatusOK, existing)
}
