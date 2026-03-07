package handlers

import (
	"log"
	"net/http"
	"time"

	"ifdc-backend/internal/database"

	"github.com/gin-gonic/gin"
)

type Activity struct {
	Type      string    `json:"type"`  // drone, office, rnd, reservation, user
	Title     string    `json:"title"` // e.g. "Maintenance completed for Phantom 4 Pro"
	CreatedAt time.Time `json:"created_at"`
}

func GetActivities(c *gin.Context) {
	var activities []Activity
	db := database.DB

	// Raw SQL to UNION the recent 5 records across 5 tables
	// drone_assets, office_assets, rnd_assets, reservations, users
	// We'll format the title directly in SQL or format it slightly if needed

	query := `
		SELECT 'drone' as type, 'New drone added: ' || name as title, created_at FROM drone_assets
		UNION ALL
		SELECT 'office' as type, 'New office asset: ' || name as title, created_at FROM office_assets
		UNION ALL
		SELECT 'rnd' as type, 'New R&D project: ' || name as title, created_at FROM rnd_assets
		UNION ALL
		SELECT 'reservation' as type, 'Reservation requested for ' || asset_type, created_at FROM reservations
		UNION ALL
		SELECT 'user' as type, 'New user registered: ' || full_name, created_at FROM users
		ORDER BY created_at DESC
		LIMIT 10
	`

	if err := db.Raw(query).Scan(&activities).Error; err != nil {
		log.Printf("Failed to fetch activities: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch activities"})
		return
	}

	c.JSON(http.StatusOK, activities)
}
