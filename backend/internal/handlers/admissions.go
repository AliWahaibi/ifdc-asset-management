package handlers

import (
	"fmt"
	"net/http"
	"time"

	"ifdc-backend/internal/database"
	"ifdc-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/microcosm-cc/bluemonday"
)

type AssetRequest struct {
	AssetID   string `json:"asset_id" binding:"required"`
	AssetType string `json:"asset_type" binding:"required"`
}

type AdmissionRequest struct {
	ProjectName     string         `json:"project_name" binding:"required"`
	Purpose         string         `json:"purpose"`
	StartDate       string         `json:"start_date" binding:"required"`
	EndDate         string         `json:"end_date" binding:"required"`
	RequestedAssets []AssetRequest `json:"requested_assets" binding:"required"`
}

type UpdateAdmissionStatusRequest struct {
	Status          string `json:"status" binding:"required,oneof=approved rejected"`
	RejectionReason string `json:"rejection_reason"`
}

func CreateAdmission(c *gin.Context) {
	var req AdmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: missing user ID"})
		return
	}

	start, err := time.Parse(time.RFC3339, req.StartDate)
	if err != nil {
		start, _ = time.Parse(time.DateTime, req.StartDate)
	}
	end, err := time.Parse(time.RFC3339, req.EndDate)
	if err != nil {
		end, _ = time.Parse(time.DateTime, req.EndDate)
	}

	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}

	// XSS Sanitization
	p := bluemonday.UGCPolicy()
	req.ProjectName = p.Sanitize(req.ProjectName)
	req.Purpose = p.Sanitize(req.Purpose)

	// 1. Create Parent Admission
	admission := models.Admission{
		ProjectName: req.ProjectName,
		Purpose:     req.Purpose,
		StartDate:   start,
		EndDate:     end,
		Status:      "pending",
		UserID:      userID,
	}

	if err := tx.Create(&admission).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create admission parent"})
		return
	}

	// 2. Create Child Admission Assets
	for _, asset := range req.RequestedAssets {
		// Validation logic... (keep existing availability check but adapt to transaction)
		var count int64
		overlapQuery := `
			SELECT count(*) FROM admission_assets aa
			JOIN admissions a ON aa.admission_id = a.id
			WHERE aa.asset_id = ? AND a.status IN ('approved', 'pending') 
			AND (a.start_date <= ? AND a.end_date >= ?)
			AND a.deleted_at IS NULL AND aa.deleted_at IS NULL
		`
		if err := tx.Raw(overlapQuery, asset.AssetID, end, start).Scan(&count).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate availability"})
			return
		}

		if count > 0 {
			tx.Rollback()
			c.JSON(http.StatusConflict, gin.H{"error": "One or more assets are already requested or reserved for these dates."})
			return
		}

		admAsset := models.AdmissionAsset{
			AdmissionID: admission.ID,
			AssetID:     asset.AssetID,
			AssetType:   asset.AssetType,
			Status:      "pending",
		}

		if err := tx.Create(&admAsset).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to link asset: " + asset.AssetID})
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit admission"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":   "Admission request created successfully",
		"admission": admission,
	})
}

func GetAdmissions(c *gin.Context) {
	status := c.Query("status")
	search := c.Query("search")
	var admissions []models.Admission
	
	query := database.DB.Preload("User").Preload("RequestedAssets").Order("created_at desc")
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if search != "" {
		query = query.Where("project_name ILIKE ? OR purpose ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Find(&admissions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch admissions"})
		return
	}

	for i := range admissions {
		for j := range admissions[i].RequestedAssets {
			r := &admissions[i].RequestedAssets[j]
			var name string
			switch r.AssetType {
			case "vehicle":
				var asset models.VehicleAsset
				database.DB.Select("name").First(&asset, "id = ?", r.AssetID)
				name = asset.Name
			case "drone":
				var asset models.DroneAsset
				database.DB.Select("name").First(&asset, "id = ?", r.AssetID)
				name = asset.Name
			case "office":
				var asset models.OfficeAsset
				database.DB.Select("name").First(&asset, "id = ?", r.AssetID)
				name = asset.Name
			case "rnd":
				var asset models.RndAsset
				database.DB.Select("name").First(&asset, "id = ?", r.AssetID)
				name = asset.Name
			}
			r.AssetName = name
		}
	}

	c.JSON(http.StatusOK, admissions)
}

func UpdateAdmissionStatus(c *gin.Context) {
	id := c.Param("id")

	var req UpdateAdmissionStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := database.DB.Begin()

	var admission models.Admission
	if err := tx.Preload("RequestedAssets").First(&admission, "id = ?", id).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Admission not found"})
		return
	}

	admission.Status = req.Status
	if req.Status == "rejected" {
		admission.RejectionReason = req.RejectionReason
	}
	tx.Save(&admission)

	// Update child assets
	tx.Model(&models.AdmissionAsset{}).Where("admission_id = ?", admission.ID).Update("status", req.Status)

	// If approved, create entries in AssetHistory and Reservation (optional)
	if req.Status == "approved" {
		for _, ra := range admission.RequestedAssets {
			history := models.AssetHistory{
				AssetType: ra.AssetType,
				AssetID:   ra.AssetID,
				Action:    "checkout",
				Notes:     fmt.Sprintf("Approved via admission: %s", admission.ProjectName),
			}
			tx.Create(&history)

			// Also create a reservation entry to block the timeline
			res := models.Reservation{
				UserID:    admission.UserID,
				AssetType: ra.AssetType,
				AssetID:   ra.AssetID,
				StartDate: admission.StartDate,
				EndDate:   admission.EndDate,
				Status:    "approved",
				Notes:     fmt.Sprintf("Admission: %s", admission.ProjectName),
			}
			tx.Create(&res)
		}
	}

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{
		"message":   "Admission updated",
		"admission": admission,
	})
}

// AssignAssets handles assigning multiple assets to a user/project in one transaction
func AssignAssets(c *gin.Context) {
	var req struct {
		UserID    string   `json:"user_id" binding:"required"`
		AssetIDs  []string `json:"asset_ids" binding:"required"`
		AssetType string   `json:"asset_type" binding:"required"`
		ProjectID *string  `json:"project_id"`
		Notes     string   `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := database.DB.Begin()
	for _, id := range req.AssetIDs {
		var err error
		switch req.AssetType {
		case "drone":
			err = tx.Model(&models.DroneAsset{}).Where("id = ?", id).Update("status", "in_use").Error
		case "battery":
			err = tx.Model(&models.BatteryAsset{}).Where("id = ?", id).Update("status", "in_use").Error
		case "accessory":
			err = tx.Model(&models.AccessoryAsset{}).Where("id = ?", id).Update("status", "in_use").Error
		default:
			err = fmt.Errorf("invalid asset type")
		}

		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update asset: " + id})
			return
		}

		history := models.AssetHistory{
			AssetType:  req.AssetType,
			AssetID:    id,
			NewOwnerID: &req.UserID,
			ProjectID:  req.ProjectID,
			Action:     "assignment",
			Notes:      req.Notes,
		}
		if err := tx.Create(&history).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to log history for: " + id})
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit assignment transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Assets assigned successfully"})
}
