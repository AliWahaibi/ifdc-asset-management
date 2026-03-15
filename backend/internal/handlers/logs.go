package handlers

import (
	"net/http"
	"strconv"

	"ifdc-backend/internal/database"
	"ifdc-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// GetLogs returns a paginated list of system logs
func GetLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset := (page - 1) * limit

	var logs []models.SystemLog
	var total int64

	// Count total records
	if err := database.DB.Model(&models.SystemLog{}).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count logs"})
		return
	}

	// Fetch paginated logs with user preload
	if err := database.DB.Preload("User").Order("timestamp desc").Limit(limit).Offset(offset).Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  logs,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}
