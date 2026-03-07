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

	// 1. Search Users (full_name, email)
	var users []models.User
	database.DB.Where("(full_name ILIKE ? OR email ILIKE ?) AND deleted_at IS NULL", searchPattern, searchPattern).Limit(5).Find(&users)
	for _, u := range users {
		results = append(results, SearchResult{
			ID:          u.ID,
			Type:        "User",
			Title:       u.FullName,
			Description: u.Email,
			Link:        fmt.Sprintf("/users?search=%s", u.ID), // Or just /users, handled on frontend
		})
	}

	// 2. Search Drone Assets
	var drones []models.DroneAsset
	database.DB.Where("(name ILIKE ? OR serial_number ILIKE ?) AND deleted_at IS NULL", searchPattern, searchPattern).Limit(5).Find(&drones)
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
	database.DB.Where("(name ILIKE ? OR serial_number ILIKE ?) AND deleted_at IS NULL", searchPattern, searchPattern).Limit(5).Find(&office)
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
	database.DB.Where("(name ILIKE ? OR serial_number ILIKE ?) AND deleted_at IS NULL", searchPattern, searchPattern).Limit(5).Find(&rnd)
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
	// Using CAST(id AS TEXT) for postgres UUID LIKE comparison if supported, or just filtering by notes
	// If id is uuid, ILIKE directly on uuid might fail in Postgres. It's safer to cast id to text: CAST(id as text) ILIKE ?
	database.DB.Preload("User").Where("(CAST(id as text) ILIKE ? OR notes ILIKE ?) AND deleted_at IS NULL", searchPattern, searchPattern).Limit(5).Find(&reservations)
	for _, r := range reservations {
		description := r.Notes
		if description == "" {
			description = fmt.Sprintf("Requested by %s", r.User.FullName)
		}
		results = append(results, SearchResult{
			ID:          r.ID,
			Type:        "Reservation",
			Title:       fmt.Sprintf("Reservation %s", r.ID[:8]), // Use first 8 chars of UUID
			Description: description,
			Link:        "/reservations",
		})
	}

	c.JSON(http.StatusOK, results)
}
