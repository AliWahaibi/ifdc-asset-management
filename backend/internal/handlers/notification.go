package handlers

import (
	"fmt"
	"net/http"
	"time"

	"ifdc-backend/internal/database"
	"ifdc-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// GetNotifications returns all notifications for the current user, ordered newest first
func GetNotifications(c *gin.Context) {
	CheckVehicleExpirations()

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var notifications []models.Notification
	if err := database.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}

	c.JSON(http.StatusOK, notifications)
}

// CheckVehicleExpirations scans all vehicles for upcoming Mulkiya expirations (15 days)
func CheckVehicleExpirations() {
	var vehicles []models.VehicleAsset
	fifteenDaysFromNow := time.Now().AddDate(0, 0, 15)

	// Fetch vehicles expiring soon
	database.DB.Where("mulkiya_expiry_date IS NOT NULL AND mulkiya_expiry_date <= ?", fifteenDaysFromNow).Find(&vehicles)

	var admins []models.User
	database.DB.Where("role IN ?", []string{"super_admin", "manager"}).Find(&admins)

	for _, v := range vehicles {
		expiryStr := v.MulkiyaExpiryDate.Format("2006-01-02")
		title := "Vehicle Registration Expiring"
		msg := fmt.Sprintf("Mulkiya for vehicle '%s' (%s) expires on %s.", v.Name, v.LicensePlate, expiryStr)

		for _, admin := range admins {
			// Check if notification already exists to avoid duplicates
			var count int64
			database.DB.Model(&models.Notification{}).
				Where("user_id = ? AND title = ? AND message = ? AND is_read = false", admin.ID, title, msg).
				Count(&count)

			if count == 0 {
				database.DB.Create(&models.Notification{
					UserID: admin.ID,
					Title:  title,
					Message: msg,
				})
			}
		}
	}
}

// MarkNotificationRead marks a specific notification as read
func MarkNotificationRead(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	id := c.Param("id")

	var notification models.Notification
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&notification).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	notification.IsRead = true
	if err := database.DB.Save(&notification).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification marked as read"})
}
