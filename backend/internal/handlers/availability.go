package handlers

import (
	"net/http"
	"time"

	"ifdc-backend/internal/database"
	"ifdc-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type AvailabilityRequest struct {
	StartDate string `form:"start_date" binding:"required"`
	EndDate   string `form:"end_date" binding:"required"`
}

type AssetAvailability struct {
	ID                  string     `json:"id"`
	Name                string     `json:"name"`
	Type                string     `json:"type"` // drone, office, rnd, vehicle
	IsReserved          bool       `json:"is_reserved"`
	ReservedByUserName  string     `json:"reserved_by_user_name,omitempty"`
	ReservedStart       *time.Time `json:"reserved_start,omitempty"`
	ReservedEnd         *time.Time `json:"reserved_end,omitempty"`
	ProjectName         string     `json:"project_name,omitempty"`
}

func CheckAssetAvailability(c *gin.Context) {
	var req AvailabilityRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Start date and end date are required"})
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

	var allAssets []AssetAvailability

	// Helper function to check overlaps
	checkOverlaps := func(assetID string, assetType string, assetName string) AssetAvailability {
		var overlappingRes models.Reservation
		// Overlap logic: (StartA <= EndB) and (EndA >= StartB)
		err := database.DB.Preload("User").Preload("Project").Where("asset_id = ? AND status IN ('approved', 'pending') AND (start_date <= ? AND end_date >= ?)", assetID, end, start).First(&overlappingRes).Error
		
		availability := AssetAvailability{
			ID:   assetID,
			Name: assetName,
			Type: assetType,
		}

		if err == nil {
			availability.IsReserved = true
			availability.ReservedByUserName = overlappingRes.User.FullName
			availability.ReservedStart = &overlappingRes.StartDate
			availability.ReservedEnd = &overlappingRes.EndDate
			if overlappingRes.Project != nil {
				availability.ProjectName = overlappingRes.Project.Name
			}
		}

		return availability
	}

	// 1. Drones
	var drones []models.DroneAsset
	database.DB.Find(&drones)
	for _, d := range drones {
		allAssets = append(allAssets, checkOverlaps(d.ID, "drone", d.Name))
	}

	// 2. Office Assets
	var office []models.OfficeAsset
	database.DB.Find(&office)
	for _, o := range office {
		allAssets = append(allAssets, checkOverlaps(o.ID, "office", o.Name))
	}

	// 3. R&D Assets
	var rnd []models.RndAsset
	database.DB.Find(&rnd)
	for _, r := range rnd {
		allAssets = append(allAssets, checkOverlaps(r.ID, "rnd", r.Name))
	}

	// 4. Vehicles
	var vehicles []models.VehicleAsset
	database.DB.Find(&vehicles)
	for _, v := range vehicles {
		allAssets = append(allAssets, checkOverlaps(v.ID, "vehicle", v.Name))
	}

	c.JSON(http.StatusOK, allAssets)
}
