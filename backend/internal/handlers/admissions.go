package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"ifdc-backend/internal/database"
	"ifdc-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type AssetRequest struct {
	AssetID   string `json:"asset_id" binding:"required"`
	AssetType string `json:"asset_type" binding:"required"`
}

type AdmissionRequest struct {
	ProjectName     string         `json:"project_name" binding:"required"`
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

	// Extract user_id securely from Gin Context
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

	// Start Transaction
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

	// 1. Create Project
	project := models.Project{
		Name:      req.ProjectName,
		StartDate: start,
		EndDate:   end,
		Status:    "pending_approval",
		UserID:    userID,
	}

	if err := tx.Create(&project).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create project"})
		return
	}

	// 2. Create Reservations for each asset
	for _, asset := range req.RequestedAssets {
		// Check for overlaps (within transaction)
		var count int64
		overlapQuery := `
			SELECT count(*) FROM reservations 
			WHERE asset_id = ? AND status IN ('approved', 'pending') 
			AND (start_date <= ? AND end_date >= ?)
		`
		if err := tx.Raw(overlapQuery, asset.AssetID, end, start).Scan(&count).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate reservation availability"})
			return
		}

		if count > 0 {
			tx.Rollback()
			c.JSON(http.StatusConflict, gin.H{"error": "One or more assets are already reserved for these dates."})
			return
		}

		reservation := models.Reservation{
			UserID:    userID,
			AssetType: asset.AssetType,
			AssetID:   asset.AssetID,
			Status:    "pending",
			StartDate: start,
			EndDate:   end,
			Notes:     "Project Admission Request",
			ProjectID: &project.ID,
		}

		if err := tx.Create(&reservation).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create reservation for asset: " + asset.AssetID})
			return
		}
	}

	// Commit Transaction
	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Project admission created successfully",
		"project": project,
	})
}

func GetAdmissions(c *gin.Context) {
	var projects []models.Project
	if err := database.DB.Preload("User").Preload("Reservations").Order("created_at desc").Find(&projects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch admissions"})
		return
	}

	// Populate AssetName for each reservation manually since it's a polymorphic relation not fully handled by GORM preload for the Name field
	for i := range projects {
		for j := range projects[i].Reservations {
			r := &projects[i].Reservations[j]
			var name string
			var err error

			switch r.AssetType {
			case "vehicle":
				var asset models.VehicleAsset
				err = database.DB.Select("name").First(&asset, "id = ?", r.AssetID).Error
				if err == nil {
					name = asset.Name
				}
			case "drone":
				var asset models.DroneAsset
				err = database.DB.Select("name").First(&asset, "id = ?", r.AssetID).Error
				if err == nil {
					name = asset.Name
				}
			case "office":
				var asset models.OfficeAsset
				err = database.DB.Select("name").First(&asset, "id = ?", r.AssetID).Error
				if err == nil {
					name = asset.Name
				}
			case "rnd":
				var asset models.RndAsset
				err = database.DB.Select("name").First(&asset, "id = ?", r.AssetID).Error
				if err == nil {
					name = asset.Name
				}
			}
			
			if name != "" {
				r.AssetName = name
			} else {
				r.AssetName = "Unknown Asset"
			}
		}
	}

	c.JSON(http.StatusOK, projects)
}

func UpdateAdmissionStatus(c *gin.Context) {
	id := c.Param("id")

	var req UpdateAdmissionStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	adminID := c.GetString("userID")
	if adminID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: missing user ID"})
		return
	}

	tx := database.DB.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var project models.Project
	if err := tx.First(&project, "id = ?", id).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	project.Status = req.Status
	if req.Status == "rejected" {
		project.RejectionReason = req.RejectionReason
	}
	if err := tx.Save(&project).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update project status"})
		return
	}

	targetReservationStatus := "rejected"
	if req.Status == "approved" {
		targetReservationStatus = "approved"
	}

	if err := tx.Model(&models.Reservation{}).Where("project_id = ?", project.ID).Update("status", targetReservationStatus).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update project reservations"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	// Log Asset History if approved
	if req.Status == "approved" {
		var reservations []models.Reservation
		database.DB.Where("project_id = ?", project.ID).Find(&reservations)
		for _, r := range reservations {
			history := models.AssetHistory{
				AssetType: r.AssetType,
				AssetID:   r.AssetID,
				ProjectID: &project.ID,
				Action:    "checkout",
				Notes:     fmt.Sprintf("Asset assigned to project: %s", project.Name),
			}
			database.DB.Create(&history)

			// Update Asset Status to in_use (optional, depends on logic elsewhere)
		}
	}

	var admin models.User
	adminName := "Unknown Admin"
	if err := database.DB.First(&admin, "id = ?", adminID).Error; err == nil {
		adminName = admin.FullName
	}

	if strings.ToLower(req.Status) == "approved" {
		details := fmt.Sprintf("Admin %s approved project %s and reserved its assets.", adminName, project.Name)
		database.CreateLog("INFO", "Project Approved", details, &adminID)
	} else {
		details := fmt.Sprintf("Admin %s rejected project %s.", adminName, project.Name)
		database.CreateLog("WARNING", "Project Rejected", details, &adminID)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Project status updated successfully",
		"project": project,
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
