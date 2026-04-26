package handlers

import (
	"fmt"
	"net/http"

	"ifdc-backend/internal/database"
	"ifdc-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type SearchResult struct {
	ID          string `json:"id"`
	Type        string `json:"type"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Link        string `json:"link"`
}

// GlobalSearch API
func GlobalSearch(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusOK, []SearchResult{})
		return
	}

	searchPattern := "%" + query + "%"
	var results []SearchResult

	userRole := c.GetString("userRole")
	userID := c.GetString("userID")
	var manager models.User
	if userRole == "manager" {
		database.DB.First(&manager, "id = ?", userID)
	}

	// 1. Search Users (full_name, email)
	var users []models.User
	userQuery := database.DB.Where("(full_name ILIKE ? OR email ILIKE ?) AND deleted_at IS NULL", searchPattern, searchPattern)
	if userRole == "manager" {
		userQuery = userQuery.Where("department = ?", manager.Department)
	}
	userQuery.Limit(5).Find(&users)
	for _, u := range users {
		results = append(results, SearchResult{
			ID:          u.ID,
			Type:        "User",
			Title:       u.FullName,
			Description: u.Email,
			Link:        fmt.Sprintf("/users?search=%s", u.ID),
		})
	}

	// 2. Search Drone Assets
	var drones []models.DroneAsset
	droneQuery := database.DB.Where("(name ILIKE ? OR serial_number ILIKE ?) AND deleted_at IS NULL", searchPattern, searchPattern)
	// For assets, we use DepartmentID if available, but users have 'Department' name.
	// In the models, DroneAsset has DepartmentID *string (uuid).
	// Let's check if the manager has DepartmentID.
	if userRole == "manager" && manager.DepartmentID != nil {
		droneQuery = droneQuery.Where("department_id = ?", *manager.DepartmentID)
	}
	droneQuery.Limit(5).Find(&drones)
	for _, a := range drones {
		results = append(results, SearchResult{
			ID:          a.ID,
			Type:        "Drone Asset",
			Title:       a.Name,
			Description: fmt.Sprintf("SN: %s", a.SerialNumber),
			Link:        "/operations",
		})
	}

	// 3. Search Office Assets
	var office []models.OfficeAsset
	officeQuery := database.DB.Where("(name ILIKE ? OR serial_number ILIKE ?) AND deleted_at IS NULL", searchPattern, searchPattern)
	if userRole == "manager" && manager.DepartmentID != nil {
		officeQuery = officeQuery.Where("department_id = ?", *manager.DepartmentID)
	}
	officeQuery.Limit(5).Find(&office)
	for _, a := range office {
		results = append(results, SearchResult{
			ID:          a.ID,
			Type:        "Office Asset",
			Title:       a.Name,
			Description: fmt.Sprintf("SN: %s - Category: %s", a.SerialNumber, a.Category),
			Link:        "/office",
		})
	}

	// 4. Search R&D Assets
	var rnd []models.RndAsset
	rndQuery := database.DB.Where("(name ILIKE ? OR serial_number ILIKE ?) AND deleted_at IS NULL", searchPattern, searchPattern)
	if userRole == "manager" && manager.DepartmentID != nil {
		rndQuery = rndQuery.Where("department_id = ?", *manager.DepartmentID)
	}
	rndQuery.Limit(5).Find(&rnd)
	for _, a := range rnd {
		results = append(results, SearchResult{
			ID:          a.ID,
			Type:        "R&D Asset",
			Title:       a.Name,
			Description: fmt.Sprintf("SN: %s - Type: %s", a.SerialNumber, a.AssetType),
			Link:        "/rnd",
		})
	}

	// 5. Search Reservations
	var reservations []models.Reservation
	resQuery := database.DB.Preload("User").Where("(CAST(id as text) ILIKE ? OR notes ILIKE ?) AND deleted_at IS NULL", searchPattern, searchPattern)
	if userRole == "manager" {
		resQuery = resQuery.Joins("JOIN users ON users.id = reservations.user_id").Where("users.department = ?", manager.Department)
	}
	resQuery.Limit(5).Find(&reservations)
	for _, r := range reservations {
		description := r.Notes
		if description == "" {
			if r.User != nil {
				description = fmt.Sprintf("Requested by %s", r.User.FullName)
			} else if r.IsExternal {
				description = fmt.Sprintf("Requested by External: %s", r.ExternalOrgName)
			} else {
				description = "Reservation"
			}
		}
		results = append(results, SearchResult{
			ID:          r.ID,
			Type:        "Reservation",
			Title:       fmt.Sprintf("Reservation %s", r.ID[:8]),
			Description: description,
			Link:        "/reservations",
		})
	}

	c.JSON(http.StatusOK, results)
}
