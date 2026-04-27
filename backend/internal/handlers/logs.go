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
	userRole := c.GetString("userRole")
	if userRole != "super_admin" && userRole != "ceo" && userRole != "CEO" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized: System logs are restricted to CEO and Super Admin"})
		return
	}

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

// GetAuditLogs returns a paginated list of comprehensive audit logs
func GetAuditLogs(c *gin.Context) {
	userRole := c.GetString("userRole")
	if userRole != "super_admin" && userRole != "ceo" && userRole != "CEO" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized: Audit logs are restricted to CEO and Super Admin"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset := (page - 1) * limit
	actionType := c.Query("action_type")
	userIDFilter := c.Query("user_id")

	var logs []models.AuditLog
	var total int64

	query := database.DB.Model(&models.AuditLog{})

	if actionType != "" {
		query = query.Where("action_type = ?", actionType)
	}
	if userIDFilter != "" {
		query = query.Where("user_id = ?", userIDFilter)
	}

	// Count total records
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count audit logs"})
		return
	}

	// Fetch paginated logs with user preload
	if err := query.Preload("User").Order("created_at desc").Limit(limit).Offset(offset).Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch audit logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  logs,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}
