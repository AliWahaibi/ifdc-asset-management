package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"ifdc-backend/internal/database"
	"ifdc-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/microcosm-cc/bluemonday"
)
 
// GetUniqueAssetTypes retrieves unique classification strings for frontend suggestions
func GetUniqueAssetTypes(c *gin.Context) {
	var droneModels []string
	var accessoryTypes []string
	var rndTypes []string

	database.DB.Model(&models.DroneAsset{}).Distinct("model").Pluck("model", &droneModels)
	database.DB.Model(&models.AccessoryAsset{}).Distinct("type").Pluck("type", &accessoryTypes)
	database.DB.Model(&models.RndAsset{}).Distinct("asset_type").Pluck("asset_type", &rndTypes)

	c.JSON(http.StatusOK, gin.H{
		"drone_models":    droneModels,
		"accessory_types": accessoryTypes,
		"rnd_asset_types": rndTypes,
	})
}

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

	// Check for active reservations
	now := time.Now()
	for i := range drones {
		var count int64
		database.DB.Model(&models.Reservation{}).
			Where("asset_id = ? AND asset_type = 'drone' AND status = 'approved' AND start_date <= ? AND end_date >= ?", drones[i].ID, now, now).
			Count(&count)

		if count > 0 {
			drones[i].Status = "in_use"
		}
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

	// Check for active reservations
	now := time.Now()
	for i := range assets {
		var count int64
		database.DB.Model(&models.Reservation{}).
			Where("asset_id = ? AND asset_type = 'office' AND status = 'approved' AND start_date <= ? AND end_date >= ?", assets[i].ID, now, now).
			Count(&count)

		if count > 0 {
			assets[i].Status = "in_use"
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": assets, "total": total, "page": page, "limit": limit})
}

// GetOfficeCategories retrieves all unique categories for office assets
func GetOfficeCategories(c *gin.Context) {
	var categories []models.Category
	if err := database.DB.Where("asset_type = ?", "office").Order("name ASC").Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch categories"})
		return
	}
	c.JSON(http.StatusOK, categories)
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

	// Check for active reservations
	now := time.Now()
	for i := range assets {
		var count int64
		database.DB.Model(&models.Reservation{}).
			Where("asset_id = ? AND asset_type = 'rnd' AND status = 'approved' AND start_date <= ? AND end_date >= ?", assets[i].ID, now, now).
			Count(&count)

		if count > 0 {
			assets[i].Status = "in_use"
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": assets, "total": total, "page": page, "limit": limit})
}

// CreateDrone godoc
func CreateDrone(c *gin.Context) {
	var input struct {
		Name             string  `json:"name" binding:"required,min=2,max=255"`
		Model            string  `json:"model" binding:"required,min=2,max=255"`
		SerialNumber     string  `json:"serial_number" binding:"required,min=2,max=100"`
		Status           string  `json:"status"`
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
		Status:           "Available",
		DepartmentID:     input.DepartmentID,
		TotalFlightHours: input.TotalFlightHours,
		Notes:            input.Notes,
	}

	if input.Status != "" {
		drone.Status = input.Status
	}

	// XSS Sanitization
	p := bluemonday.UGCPolicy()
	drone.Name = p.Sanitize(drone.Name)
	drone.Model = p.Sanitize(drone.Model)
	drone.SerialNumber = p.Sanitize(drone.SerialNumber)

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
		Category     string  `json:"category" binding:"required"`
		SerialNumber string  `json:"serial_number" binding:"required,min=2,max=100"`
		Status       string  `json:"status"`
		DepartmentID *string `json:"department_id"`
		AssignedTo   *string `json:"assigned_to"`
		Notes        string  `json:"notes" binding:"max=2000"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Handle Dynamic Category
	var category models.Category
	if err := database.DB.Where("LOWER(name) = LOWER(?) AND asset_type = ?", input.Category, "office").First(&category).Error; err != nil {
		category = models.Category{
			Name:      input.Category,
			AssetType: "office",
		}
		if err := database.DB.Create(&category).Error; err != nil {
			// Ignore if already exists (race condition)
			if !database.IsUniqueConstraintError(err) {
				// We don't want to fail the whole asset creation if category insertion fails
				// But we should log it
			}
		}
	}

	asset := models.OfficeAsset{
		Name:         input.Name,
		Category:     input.Category,
		SerialNumber: input.SerialNumber,
		Status:       "Available",
		DepartmentID: input.DepartmentID,
		AssignedTo:   input.AssignedTo,
		Notes:        input.Notes,
	}

	if input.Status != "" {
		asset.Status = input.Status
	}

	// XSS Sanitization
	p := bluemonday.UGCPolicy()
	asset.Name = p.Sanitize(asset.Name)
	asset.Category = p.Sanitize(asset.Category)
	asset.SerialNumber = p.Sanitize(asset.SerialNumber)
	asset.Notes = p.Sanitize(asset.Notes)

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
		AssetType      string                 `json:"asset_type" binding:"required"`
		SerialNumber   string                 `json:"serial_number" binding:"required,min=2,max=100"`
		Status         string                 `json:"status" binding:"required"`
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

	// XSS Sanitization
	p := bluemonday.UGCPolicy()
	asset.Name = p.Sanitize(asset.Name)
	asset.AssetType = p.Sanitize(asset.AssetType)
	asset.SerialNumber = p.Sanitize(asset.SerialNumber)
	asset.Notes = p.Sanitize(asset.Notes)

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

	// Maintenance Threshold Check
	if hours, ok := input["total_flight_hours"].(float64); ok {
		var settings models.SystemSetting
		if err := database.DB.First(&settings).Error; err == nil {
			if int(hours) >= settings.MaintenanceThresholdHours {
				database.DB.Model(&asset).Update("status", "Maintenance")
			}
		}
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

// ResolveMaintenance clears the maintenance state of a drone
func ResolveMaintenance(c *gin.Context) {
	id := c.Param("id")
	var drone models.DroneAsset
	if err := database.DB.First(&drone, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Drone not found"})
		return
	}

	drone.Status = "Available"
	now := time.Now()
	drone.LastMaintenanceDate = &now
	
	if err := database.DB.Save(&drone).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to resolve maintenance"})
		return
	}

	// Log the action (AssetHistory)
	userID := c.GetString("userID")
	history := models.AssetHistory{
		AssetType: "drone",
		AssetID:   drone.ID,
		Action:    "maintenance_resolution",
		Notes:     "Maintenance completed by technician",
	}
	if userID != "" {
		history.NewOwnerID = &userID
	}
	database.DB.Create(&history)

	c.JSON(http.StatusOK, gin.H{"message": "Maintenance resolved successfully", "drone": drone})
}

// GetBatteries retrieves all batteries with pagination and search
func GetBatteries(c *gin.Context) {
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
	var batteries []models.BatteryAsset
	var total int64

	query := database.DB.Model(&models.BatteryAsset{})
	if search != "" {
		query = query.Where("name ILIKE ? OR serial_number ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count batteries"})
		return
	}

	if err := query.Offset(offset).Limit(limit).Find(&batteries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch batteries"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": batteries, "total": total, "page": page, "limit": limit})
}

// GetAccessories retrieves all accessories with pagination and search
func GetAccessories(c *gin.Context) {
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
	var accessories []models.AccessoryAsset
	var total int64

	query := database.DB.Model(&models.AccessoryAsset{})
	if search != "" {
		query = query.Where("name ILIKE ? OR serial_number ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count accessories"})
		return
	}

	if err := query.Offset(offset).Limit(limit).Find(&accessories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch accessories"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": accessories, "total": total, "page": page, "limit": limit})
}

// CreateBattery godoc
func CreateBattery(c *gin.Context) {
	var input struct {
		Name         string  `json:"name" binding:"required"`
		Model        string  `json:"model" binding:"required"`
		SerialNumber string  `json:"serial_number" binding:"required"`
		CycleCount   int     `json:"cycle_count"`
		DepartmentID *string `json:"department_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	battery := models.BatteryAsset{
		Name:         input.Name,
		Model:        input.Model,
		SerialNumber: input.SerialNumber,
		CycleCount:   input.CycleCount,
		Status:       "Available",
	}

	// XSS Sanitization
	p := bluemonday.UGCPolicy()
	battery.Name = p.Sanitize(battery.Name)
	battery.Model = p.Sanitize(battery.Model)
	battery.SerialNumber = p.Sanitize(battery.SerialNumber)

	if err := database.DB.Create(&battery).Error; err != nil {
		if database.IsUniqueConstraintError(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "A battery with this serial number already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create battery asset"})
		return
	}

	c.JSON(http.StatusCreated, battery)
}

// CreateAccessory godoc
func CreateAccessory(c *gin.Context) {
	var input struct {
		Name         string `json:"name" binding:"required"`
		Type         string `json:"type" binding:"required"`
		SerialNumber string `json:"serial_number" binding:"required"`
		Status       string `json:"status"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	accessory := models.AccessoryAsset{
		Name:         input.Name,
		Type:         input.Type,
		SerialNumber: input.SerialNumber,
		Status:       "Available",
	}

	// XSS Sanitization
	p := bluemonday.UGCPolicy()
	accessory.Name = p.Sanitize(accessory.Name)
	accessory.Type = p.Sanitize(accessory.Type)
	accessory.SerialNumber = p.Sanitize(accessory.SerialNumber)

	if err := database.DB.Create(&accessory).Error; err != nil {
		if database.IsUniqueConstraintError(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "An accessory with this serial number already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create accessory asset"})
		return
	}

	c.JSON(http.StatusCreated, accessory)
}

// GetOperationsAssetsUnified aggregates all operation-related assets into one list
func GetOperationsAssetsUnified(c *gin.Context) {
	search := c.Query("search")

	// We'll perform a simplified fetch here since we're merging multiple tables
	// For production, a view or a more complex query might be better, but for this refactor, 
	// we'll fetch then merge.

	var drones []models.DroneAsset
	var batteries []models.BatteryAsset
	var accessories []models.AccessoryAsset

	// Search logic for all
	droneQuery := database.DB.Model(&models.DroneAsset{})
	batteryQuery := database.DB.Model(&models.BatteryAsset{})
	accessoryQuery := database.DB.Model(&models.AccessoryAsset{})

	if search != "" {
		s := "%" + search + "%"
		droneQuery = droneQuery.Where("name ILIKE ? OR serial_number ILIKE ?", s, s)
		batteryQuery = batteryQuery.Where("name ILIKE ? OR serial_number ILIKE ?", s, s)
		accessoryQuery = accessoryQuery.Where("name ILIKE ? OR serial_number ILIKE ?", s, s)
	}

	droneQuery.Find(&drones)
	batteryQuery.Find(&batteries)
	accessoryQuery.Find(&accessories)

	type UnifiedAsset struct {
		ID               string  `json:"id"`
		Name             string  `json:"name"`
		Model            string  `json:"model,omitempty"`
		Type             string  `json:"type"` 
		SerialNumber     string  `json:"serial_number"`
		Status           string  `json:"status"`
		TotalFlightHours float64 `json:"total_flight_hours,omitempty"`
		CycleCount       int     `json:"cycle_count,omitempty"`
		AccessoryType    string  `json:"accessory_type,omitempty"`
		UpdatedAt        string  `json:"updated_at"`
	}

	var results []UnifiedAsset

	for _, d := range drones {
		results = append(results, UnifiedAsset{
			ID:               d.ID,
			Name:             d.Name,
			Model:            d.Model,
			Type:             "drone",
			SerialNumber:     d.SerialNumber,
			Status:           d.Status,
			TotalFlightHours: d.TotalFlightHours,
			UpdatedAt:        d.UpdatedAt.Format(time.RFC3339),
		})
	}

	for _, b := range batteries {
		results = append(results, UnifiedAsset{
			ID:           b.ID,
			Name:         b.Name,
			Model:        b.Model,
			Type:         "battery",
			SerialNumber: b.SerialNumber,
			Status:       b.Status,
			CycleCount:   b.CycleCount,
			UpdatedAt:    b.UpdatedAt.Format(time.RFC3339),
		})
	}

	for _, a := range accessories {
		results = append(results, UnifiedAsset{
			ID:            a.ID,
			Name:          a.Name,
			AccessoryType: a.Type,
			Type:          "accessory",
			SerialNumber:  a.SerialNumber,
			Status:        a.Status,
			UpdatedAt:     a.UpdatedAt.Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": results, "total": len(results)})
}
