package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"ifdc-backend/internal/database"
	"ifdc-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// GetDrones retrieves paginated drones
func GetDrones(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.Query("search")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	offset := (page - 1) * limit
	var drones []models.DroneAsset
	var total int64

	query := database.DB.Model(&models.DroneAsset{})
	if search != "" {
		query = query.Where("name ILIKE ? OR serial_number ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count drones"})
		return
	}

	if err := query.Offset(offset).Limit(limit).Find(&drones).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch drones"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": drones, "total": total, "page": page, "limit": limit})
}

// GetOfficeAssets retrieves paginated office assets
func GetOfficeAssets(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.Query("search")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	offset := (page - 1) * limit
	var assets []models.OfficeAsset
	var total int64

	query := database.DB.Model(&models.OfficeAsset{})
	if search != "" {
		query = query.Where("name ILIKE ? OR serial_number ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count office assets"})
		return
	}

	if err := query.Offset(offset).Limit(limit).Find(&assets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch office assets"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": assets, "total": total, "page": page, "limit": limit})
}

// GetRndAssets retrieves paginated R&D assets
func GetRndAssets(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.Query("search")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	offset := (page - 1) * limit
	var assets []models.RndAsset
	var total int64

	query := database.DB.Model(&models.RndAsset{})
	if search != "" {
		query = query.Where("name ILIKE ? OR serial_number ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count R&D assets"})
		return
	}

	if err := query.Offset(offset).Limit(limit).Find(&assets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch R&D assets"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": assets, "total": total, "page": page, "limit": limit})
}

// CreateDrone godoc
func CreateDrone(c *gin.Context) {
	var input struct {
		Name             string  `json:"name" binding:"required,min=2,max=255"`
		Model            string  `json:"model" binding:"required,min=2,max=255"`
		SerialNumber     string  `json:"serial_number" binding:"required,min=2,max=100"`
		Status           string  `json:"status" binding:"required,oneof=available in_use maintenance reserved retired"`
		DepartmentID     *string `json:"department_id"`
		TotalFlightHours float64 `json:"total_flight_hours"`
		Notes            string  `json:"notes" binding:"max=2000"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	drone := models.DroneAsset{
		Name:             input.Name,
		Model:            input.Model,
		SerialNumber:     input.SerialNumber,
		Status:           input.Status,
		DepartmentID:     input.DepartmentID,
		TotalFlightHours: input.TotalFlightHours,
		Notes:            input.Notes,
	}

	if err := database.DB.Create(&drone).Error; err != nil {
		if database.IsUniqueConstraintError(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "A drone with this serial number already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create drone asset"})
		return
	}

	c.JSON(http.StatusCreated, drone)
}

// CreateOfficeAsset godoc
func CreateOfficeAsset(c *gin.Context) {
	var input struct {
		Name         string  `json:"name" binding:"required,min=2,max=255"`
		Category     string  `json:"category" binding:"required,oneof=furniture printer laptop desktop monitor phone networking other"`
		SerialNumber string  `json:"serial_number" binding:"required,min=2,max=100"`
		Status       string  `json:"status" binding:"required,oneof=available in_use maintenance reserved retired"`
		DepartmentID *string `json:"department_id"`
		AssignedTo   *string `json:"assigned_to"`
		Notes        string  `json:"notes" binding:"max=2000"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	asset := models.OfficeAsset{
		Name:         input.Name,
		Category:     input.Category,
		SerialNumber: input.SerialNumber,
		Status:       input.Status,
		DepartmentID: input.DepartmentID,
		AssignedTo:   input.AssignedTo,
		Notes:        input.Notes,
	}

	if err := database.DB.Create(&asset).Error; err != nil {
		if database.IsUniqueConstraintError(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "An office asset with this serial number already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create office asset"})
		return
	}

	c.JSON(http.StatusCreated, asset)
}

// CreateRndAsset godoc
func CreateRndAsset(c *gin.Context) {
	var input struct {
		Name           string                 `json:"name" binding:"required,min=2,max=255"`
		AssetType      string                 `json:"asset_type" binding:"required,oneof=vtol experimental prototype component"`
		SerialNumber   string                 `json:"serial_number" binding:"required,min=2,max=100"`
		Status         string                 `json:"status" binding:"required,oneof=available in_use maintenance reserved retired"`
		DepartmentID   *string                `json:"department_id"`
		Specifications map[string]interface{} `json:"specifications"`
		IsClassified   bool                   `json:"is_classified"`
		Notes          string                 `json:"notes" binding:"max=2000"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	asset := models.RndAsset{
		Name:         input.Name,
		AssetType:    input.AssetType,
		SerialNumber: input.SerialNumber,
		Status:       input.Status,
		DepartmentID: input.DepartmentID,
		IsClassified: input.IsClassified,
		Notes:        input.Notes,
	}

	// Handle JSONB storage
	specBytes, _ := json.Marshal(input.Specifications)
	asset.Specifications = string(specBytes)

	if err := database.DB.Create(&asset).Error; err != nil {
		if database.IsUniqueConstraintError(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "An R&D asset with this serial number already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create R&D asset"})
		return
	}

	c.JSON(http.StatusCreated, asset)
}

// UpdateDrone godoc
func UpdateDrone(c *gin.Context) {
	id := c.Param("id")
	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var asset models.DroneAsset
	if err := database.DB.First(&asset, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found"})
		return
	}
	if err := database.DB.Model(&asset).Updates(input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update asset"})
		return
	}
	c.JSON(http.StatusOK, asset)
}

// UpdateOfficeAsset godoc
func UpdateOfficeAsset(c *gin.Context) {
	id := c.Param("id")
	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var asset models.OfficeAsset
	if err := database.DB.First(&asset, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found"})
		return
	}
	if err := database.DB.Model(&asset).Updates(input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update asset"})
		return
	}
	c.JSON(http.StatusOK, asset)
}

// UpdateRndAsset godoc
func UpdateRndAsset(c *gin.Context) {
	id := c.Param("id")
	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var asset models.RndAsset
	if err := database.DB.First(&asset, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found"})
		return
	}
	if err := database.DB.Model(&asset).Updates(input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update asset"})
		return
	}
	c.JSON(http.StatusOK, asset)
}

// DeleteDrone godoc
func DeleteDrone(c *gin.Context) {
	id := c.Param("id")
	var asset models.DroneAsset
	if err := database.DB.First(&asset, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found"})
		return
	}
	if err := database.DB.Delete(&asset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete asset"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Asset deleted successfully"})
}

// DeleteOfficeAsset godoc
func DeleteOfficeAsset(c *gin.Context) {
	id := c.Param("id")
	var asset models.OfficeAsset
	if err := database.DB.First(&asset, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found"})
		return
	}
	if err := database.DB.Delete(&asset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete asset"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Asset deleted successfully"})
}

// DeleteRndAsset godoc
func DeleteRndAsset(c *gin.Context) {
	id := c.Param("id")
	var asset models.RndAsset
	if err := database.DB.First(&asset, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found"})
		return
	}
	if err := database.DB.Delete(&asset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete asset"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Asset deleted successfully"})
}
