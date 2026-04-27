package handlers

import (
	"fmt"
	"log"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"
	"time"

	"ifdc-backend/internal/database"
	"ifdc-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"path/filepath"
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

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
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
	name := c.PostForm("name")
	licensePlate := c.PostForm("license_plate")
	status := c.PostForm("status")
	departmentID := c.PostForm("department_id")
	mileageStr := c.PostForm("mileage")
	notes := c.PostForm("notes")
	referenceNumber := c.PostForm("reference_number")
	rentStartStr := c.PostForm("rent_start_date")
	rentEndStr := c.PostForm("rent_end_date")
	mulkiyaExpiryStr := c.PostForm("mulkiya_expiry_date")

	if name == "" || licensePlate == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name and license_plate are required"})
		return
	}

	mileage, _ := strconv.ParseFloat(mileageStr, 64)

	asset := models.VehicleAsset{
		Name:            strings.TrimSpace(name),
		LicensePlate:    strings.TrimSpace(licensePlate),
		ReferenceNumber: strings.TrimSpace(referenceNumber),
		Status:          "available",
		Mileage:         mileage,
		Notes:           strings.TrimSpace(notes),
	}

	if status != "" {
		asset.Status = status
	}
	if departmentID != "" {
		asset.DepartmentID = &departmentID
	}

	// Parse Dates
	if rentStartStr != "" {
		if t, err := time.Parse("2006-01-02", rentStartStr); err == nil {
			asset.RentStartDate = &t
		}
	}
	if rentEndStr != "" {
		if t, err := time.Parse("2006-01-02", rentEndStr); err == nil {
			asset.RentEndDate = &t
		}
	}
	if mulkiyaExpiryStr != "" {
		if t, err := time.Parse("2006-01-02", mulkiyaExpiryStr); err == nil {
			// Blocker: Do NOT allow a vehicle to be added if its Mulkiya is currently expired
			if t.Before(time.Now()) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot add a vehicle with an expired Mulkiya registration"})
				return
			}
			asset.MulkiyaExpiryDate = &t
		}
	}

	// Handle Mulkiya Image
	mulkiyaURL, err := saveUploadedFile(c, "mulkiya_image", "uploads/vehicles", []string{"image/jpeg", "image/png", "image/pdf", "application/pdf"})
	if err == nil {
		asset.MulkiyaImageURL = mulkiyaURL
	}

	// Debug: Log the full payload before DB insert
	log.Printf("[VEHICLE CREATE] Payload: Name=%q LicensePlate=%q Ref=%q Status=%q Mileage=%f",
		asset.Name, asset.LicensePlate, asset.ReferenceNumber, asset.Status, asset.Mileage)

	tx := database.DB.Begin()

	if err := tx.Create(&asset).Error; err != nil {
		tx.Rollback()
		log.Printf("[VEHICLE CREATE ERROR] DB insert failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to create vehicle asset: %v", err)})
		return
	}

	// Handle Inspection Images (up to 10) — guard against nil form
	form, _ := c.MultipartForm()
	var files []*multipart.FileHeader
	if form != nil && form.File != nil {
		files = form.File["inspection_images"]
	}
	count := 0
	for _, fileHeader := range files {
		if count >= 10 {
			break
		}
		
		// Manual save logic for multiple files (since saveUploadedFile is for single field)
		uploadDir := "uploads/vehicles"
		filename := fmt.Sprintf("%s_%d_ins_%s", uuid.New().String(), time.Now().Unix(), filepath.Base(fileHeader.Filename))
		savePath := filepath.Join(uploadDir, filename)
		
		if f, err := fileHeader.Open(); err == nil {
			defer f.Close()
			if err := CompressAndSaveImage(f, fileHeader, savePath); err == nil {
				vImg := models.VehicleImage{
					VehicleAssetID: asset.ID,
					ImageURL:       fmt.Sprintf("/%s/%s", uploadDir, filename),
				}
				tx.Create(&vImg)
				count++
			}
		}
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit vehicle creation"})
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

	// Support both JSON and Form (Frontend sends FormData)
	if strings.Contains(c.GetHeader("Content-Type"), "multipart/form-data") {
		if name := c.PostForm("name"); name != "" {
			asset.Name = name
		}
		if plate := c.PostForm("license_plate"); plate != "" {
			asset.LicensePlate = plate
		}
		if ref := c.PostForm("reference_number"); ref != "" {
			asset.ReferenceNumber = ref
		}
		if status := c.PostForm("status"); status != "" {
			asset.Status = status
		}
		if mileageStr := c.PostForm("mileage"); mileageStr != "" {
			if m, err := strconv.ParseFloat(mileageStr, 64); err == nil {
				asset.Mileage = m
			}
		}
		if notes := c.PostForm("notes"); notes != "" {
			asset.Notes = notes
		}
	} else {
		var updateData models.VehicleAsset
		if err := c.ShouldBindJSON(&updateData); err == nil {
			asset.Name = updateData.Name
			asset.LicensePlate = updateData.LicensePlate
			asset.ReferenceNumber = updateData.ReferenceNumber
			asset.Status = updateData.Status
			asset.Mileage = updateData.Mileage
			asset.Notes = updateData.Notes
		}
	}

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

// DispatchVehicle handles the dispatching of a vehicle asset and logs the event using the audit system
func DispatchVehicle(c *gin.Context) {
	id := c.Param("id")
	
	var req struct {
		Destination string `json:"destination" binding:"required"`
		Reason      string `json:"reason" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var asset models.VehicleAsset
	if err := database.DB.First(&asset, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Vehicle not found"})
		return
	}

	if asset.Status != "available" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Vehicle is not available for dispatch"})
		return
	}

	// Update asset status
	asset.Status = "in_use"
	if err := database.DB.Save(&asset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to dispatch vehicle"})
		return
	}

	// Record the event in the Audit Log
	userID := c.GetString("userID")
	detailsMap := map[string]interface{}{
		"destination":   req.Destination,
		"reason":        req.Reason,
		"vehicle_name":  asset.Name,
		"license_plate": asset.LicensePlate,
		"previous_state": "available",
		"new_state":     "in_use",
	}

	database.LogEvent(database.DB, &userID, "vehicle_dispatch", "vehicle", id, detailsMap)

	c.JSON(http.StatusOK, gin.H{
		"message": "Vehicle dispatched successfully",
		"asset":   asset,
	})
}
