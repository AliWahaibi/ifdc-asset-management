package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"ifdc-backend/internal/database"
	"ifdc-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// GetReservations retrieves a paginated list of reservations
func GetReservations(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	status := c.Query("status")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	offset := (page - 1) * limit

	var reservations []models.Reservation
	var total int64

	query := database.DB.Model(&models.Reservation{})
	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count reservations"})
		return
	}

	if err := query.Preload("User").Offset(offset).Limit(limit).Find(&reservations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reservations"})
		return
	}

	for i, res := range reservations {
		var name string
		switch res.AssetType {
		case "drone":
			database.DB.Model(&models.DroneAsset{}).Select("name").Where("id = ?", res.AssetID).Scan(&name)
		case "office":
			database.DB.Model(&models.OfficeAsset{}).Select("name").Where("id = ?", res.AssetID).Scan(&name)
		case "rnd":
			database.DB.Model(&models.RndAsset{}).Select("name").Where("id = ?", res.AssetID).Scan(&name)
		case "vehicle":
			database.DB.Model(&models.VehicleAsset{}).Select("name").Where("id = ?", res.AssetID).Scan(&name)
		}
		reservations[i].AssetName = name
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  reservations,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// Reservation struct representation
type Reservation struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	AssetType string    `json:"asset_type"`
	AssetID   string    `json:"asset_id"`
	Status    string    `json:"status"` // pending, approved, rejected, returned
	Requested time.Time `json:"requested_at"`
	StartDate string    `json:"start_date"`
	EndDate   string    `json:"end_date"`
	Notes     string    `json:"notes"`
}

// CreateReservation API (Endpoint for User/Employee)
func CreateReservation(c *gin.Context) {
	var req struct {
		AssetType string `json:"asset_type" binding:"required,max=50"`
		AssetID   string `json:"asset_id" binding:"required,max=255"`
		StartDate string `json:"start_date" binding:"required"`
		EndDate   string `json:"end_date" binding:"required"`
		Notes     string `json:"notes" binding:"required,max=2000"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Extract user_id securely from Gin Context (injected by Auth middleware)
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: missing user ID"})
		return
	}

	// Parse dates
	start, err := time.Parse(time.RFC3339, req.StartDate)
	if err != nil {
		start, _ = time.Parse(time.DateTime, req.StartDate)
	}
	end, err := time.Parse(time.RFC3339, req.EndDate)
	if err != nil {
		end, _ = time.Parse(time.DateTime, req.EndDate)
	}

	res := models.Reservation{
		UserID:    userID,
		AssetType: req.AssetType,
		AssetID:   req.AssetID,
		Status:    "pending",
		StartDate: start,
		EndDate:   end,
		Notes:     req.Notes,
	}

	// Overlap check
	var count int64
	overlapQuery := `
		SELECT count(*) FROM reservations 
		WHERE asset_id = ? AND status IN ('approved', 'pending') 
		AND (start_date <= ? AND end_date >= ?)
	`
	if err := database.DB.Raw(overlapQuery, req.AssetID, end, start).Scan(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate reservation availability"})
		return
	}

	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Asset is already reserved for these dates."})
		return
	}

	if err := database.DB.Create(&res).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to request reservation"})
		return
	}

	// Trigger 1 (Notify Admins)
	var requestor models.User
	database.DB.First(&requestor, "id = ?", res.UserID)

	var assetName string
	switch res.AssetType {
	case "drone":
		database.DB.Model(&models.DroneAsset{}).Select("name").Where("id = ?", res.AssetID).Scan(&assetName)
	case "office":
		database.DB.Model(&models.OfficeAsset{}).Select("name").Where("id = ?", res.AssetID).Scan(&assetName)
	case "rnd":
		database.DB.Model(&models.RndAsset{}).Select("name").Where("id = ?", res.AssetID).Scan(&assetName)
	}

	var admins []models.User
	database.DB.Where("role IN ?", []string{"super_admin", "manager"}).Find(&admins)

	for _, admin := range admins {
		database.DB.Create(&models.Notification{
			UserID:  admin.ID,
			Title:   "New Asset Request",
			Message: fmt.Sprintf("%s requested %s from %s to %s.", requestor.FullName, assetName, res.StartDate.Format("Jan 02"), res.EndDate.Format("Jan 02")),
		})
	}

	// Log the asset request
	logDetails := fmt.Sprintf("User %s (%s) requested asset %s (%s)", requestor.FullName, requestor.Email, assetName, res.AssetID)
	database.CreateLog("INFO", "Asset Requested", logDetails, &userID)

	c.JSON(http.StatusCreated, res)
}

// UpdateReservationStatus API (Endpoint for Manager/Team Leader)
func UpdateReservationStatus(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Status string `json:"status" binding:"required,oneof=approved rejected completed cancelled returned"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Extract admin user_id securely from Gin Context
	adminID := c.GetString("userID")
	if adminID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: missing user ID"})
		return
	}

	var res models.Reservation
	if err := database.DB.First(&res, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Reservation not found"})
		return
	}

	res.Status = req.Status
	if err := database.DB.Save(&res).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update reservation"})
		return
	}

	// Sync Asset Status
	switch req.Status {
	case "approved":
		updateAssetStatus(res.AssetType, res.AssetID, "reserved")
	case "returned", "completed", "cancelled", "rejected":
		updateAssetStatus(res.AssetType, res.AssetID, "available")
	}

	// Trigger 2 (Notify User)
	var assetName string
	switch res.AssetType {
	case "drone":
		database.DB.Model(&models.DroneAsset{}).Select("name").Where("id = ?", res.AssetID).Scan(&assetName)
	case "office":
		database.DB.Model(&models.OfficeAsset{}).Select("name").Where("id = ?", res.AssetID).Scan(&assetName)
	case "rnd":
		database.DB.Model(&models.RndAsset{}).Select("name").Where("id = ?", res.AssetID).Scan(&assetName)
	}

	var statusText string
	switch req.Status {
	case "approved":
		statusText = "Approved"
	case "rejected":
		statusText = "Rejected"
	default:
		statusText = req.Status
	}

	if req.Status == "approved" || req.Status == "rejected" {
		database.DB.Create(&models.Notification{
			UserID:  res.UserID,
			Title:   "Request Update",
			Message: fmt.Sprintf("Your request for %s has been %s.", assetName, statusText),
		})

		// Log the reservation update
		var admin models.User
		if err := database.DB.First(&admin, "id = ?", adminID).Error; err == nil {
			logLevel := "INFO"
			if req.Status == "rejected" {
				logLevel = "WARNING"
			}
			logAction := fmt.Sprintf("Reservation %s", statusText)
			logDetails := fmt.Sprintf("Admin %s (%s) %s the reservation for asset %s (%s)", admin.FullName, admin.Email, req.Status, assetName, res.AssetID)

			database.CreateLog(logLevel, logAction, logDetails, &adminID)
		}
	}

	c.JSON(http.StatusOK, res)
}

func updateAssetStatus(assetType string, assetID string, status string) {
	switch assetType {
	case "drone":
		database.DB.Model(&models.DroneAsset{}).Where("id = ?", assetID).Update("status", status)
	case "office":
		database.DB.Model(&models.OfficeAsset{}).Where("id = ?", assetID).Update("status", status)
	case "rnd":
		database.DB.Model(&models.RndAsset{}).Where("id = ?", assetID).Update("status", status)
	}
}
