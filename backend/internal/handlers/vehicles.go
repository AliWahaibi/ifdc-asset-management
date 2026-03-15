package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"ifdc-backend/internal/database"
	"ifdc-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type createVehicleAssetRequest struct {
	Name         string  `json:"name" binding:"required,min=2,max=255"`
	LicensePlate string  `json:"license_plate" binding:"required,min=2,max=100"`
	Status       string  `json:"status" binding:"required,oneof=available in_use maintenance reserved"`
	DepartmentID *string `json:"department_id"`
	Mileage      float64 `json:"mileage"`
	Notes        string  `json:"notes" binding:"max=2000"`
}

// GetVehicleAssets returns a paginated list of vehicle assets
func GetVehicleAssets(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.Query("search")
	offset := (page - 1) * limit

	var assets []models.VehicleAsset
	var total int64

	query := database.DB.Model(&models.VehicleAsset{})

	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("name ILIKE ? OR license_plate ILIKE ?", searchPattern, searchPattern)
	}

	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count assets"})
		return
	}

	if err := query.Limit(limit).Offset(offset).Order("created_at desc").Find(&assets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch assets"})
		return
	}

	// Check for active reservations
	now := time.Now()
	for i := range assets {
		var count int64
		database.DB.Model(&models.Reservation{}).
			Where("asset_id = ? AND asset_type = 'vehicle' AND status = 'approved' AND start_date <= ? AND end_date >= ?", assets[i].ID, now, now).
			Count(&count)

		if count > 0 {
			assets[i].Status = "in_use"
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  assets,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GetVehicleAsset returns a single vehicle asset
func GetVehicleAsset(c *gin.Context) {
	id := c.Param("id")
	var asset models.VehicleAsset

	if err := database.DB.First(&asset, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found"})
		return
	}

	c.JSON(http.StatusOK, asset)
}

// CreateVehicleAsset creates a new vehicle asset
func CreateVehicleAsset(c *gin.Context) {
	var req createVehicleAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.LicensePlate = strings.TrimSpace(req.LicensePlate)
	req.Notes = strings.TrimSpace(req.Notes)

	if req.Name == "" || req.LicensePlate == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name and license_plate are required"})
		return
	}

	asset := models.VehicleAsset{
		Name:         req.Name,
		LicensePlate: req.LicensePlate,
		Status:       req.Status,
		DepartmentID: req.DepartmentID,
		Mileage:      req.Mileage,
		Notes:        req.Notes,
	}

	if err := database.DB.Create(&asset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create asset"})
		return
	}

	// Log the action
	userID := c.GetString("userID")
	database.CreateLog("INFO", "Asset Created", "Created vehicle asset: "+asset.Name, &userID)

	c.JSON(http.StatusCreated, asset)
}

// UpdateVehicleAsset updates an existing vehicle asset
func UpdateVehicleAsset(c *gin.Context) {
	id := c.Param("id")
	var asset models.VehicleAsset

	if err := database.DB.First(&asset, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found"})
		return
	}

	var updateData models.VehicleAsset
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	asset.Name = updateData.Name
	asset.LicensePlate = updateData.LicensePlate
	asset.Status = updateData.Status
	asset.Mileage = updateData.Mileage
	asset.Notes = updateData.Notes

	if err := database.DB.Save(&asset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update asset"})
		return
	}

	// Log the action
	userID := c.GetString("userID")
	database.CreateLog("INFO", "Asset Updated", "Updated vehicle asset: "+asset.Name, &userID)

	c.JSON(http.StatusOK, asset)
}

// DeleteVehicleAsset deletes a vehicle asset
func DeleteVehicleAsset(c *gin.Context) {
	id := c.Param("id")
	var asset models.VehicleAsset

	if err := database.DB.First(&asset, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found"})
		return
	}

	if err := database.DB.Delete(&asset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete asset"})
		return
	}

	// Log the action
	userID := c.GetString("userID")
	database.CreateLog("WARNING", "Asset Deleted", "Deleted vehicle asset: "+asset.Name, &userID)

	c.JSON(http.StatusOK, gin.H{"message": "Asset deleted successfully"})
}
