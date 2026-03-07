package handlers

import (
	"log"
	"net/http"

	"ifdc-backend/internal/database"

	"github.com/gin-gonic/gin"
)

type TopUser struct {
	UserID            string `json:"user_id"`
	FullName          string `json:"full_name"`
	TotalReservations int    `json:"total_reservations"`
}

type PopularAsset struct {
	AssetID           string `json:"asset_id"`
	AssetType         string `json:"asset_type"`
	Name              string `json:"name"`
	TotalReservations int    `json:"total_reservations"`
}

type StatusBreakdown struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type StatisticsResponse struct {
	TopUsers           []TopUser         `json:"top_users"`
	MostReservedAssets []PopularAsset    `json:"most_reserved_assets"`
	StatusBreakdown    []StatusBreakdown `json:"status_breakdown"`
	TotalFlightHours   float64           `json:"total_flight_hours"`
}

// GetStatistics aggregates data across tables for the analytics dashboard
func GetStatistics(c *gin.Context) {
	var resp StatisticsResponse

	// 1. Top Users
	if err := database.DB.Raw(`
		SELECT r.user_id, u.full_name, COUNT(r.id) as total_reservations 
		FROM reservations r
		JOIN users u ON r.user_id = u.id
		WHERE r.deleted_at IS NULL AND u.deleted_at IS NULL
		GROUP BY r.user_id, u.full_name
		ORDER BY total_reservations DESC
		LIMIT 5
	`).Scan(&resp.TopUsers).Error; err != nil {
		log.Printf("Error fetching top users stats: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch top users statistics"})
		return
	}

	// 2. Most Reserved Assets (resolving names conditionally based on type)
	if err := database.DB.Raw(`
		SELECT r.asset_id, r.asset_type, COUNT(r.id) as total_reservations,
		CASE 
			WHEN r.asset_type = 'drone' THEN (SELECT name FROM drone_assets WHERE id = r.asset_id AND deleted_at IS NULL)
			WHEN r.asset_type = 'office' THEN (SELECT name FROM office_assets WHERE id = r.asset_id AND deleted_at IS NULL)
			WHEN r.asset_type = 'rnd' THEN (SELECT name FROM rnd_assets WHERE id = r.asset_id AND deleted_at IS NULL)
		END as name
		FROM reservations r
		WHERE r.deleted_at IS NULL
		GROUP BY r.asset_id, r.asset_type
		ORDER BY total_reservations DESC
		LIMIT 5
	`).Scan(&resp.MostReservedAssets).Error; err != nil {
		log.Printf("Error fetching popular assets stats: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch popular assets statistics"})
		return
	}

	// 3. Status Breakdown (Aggregate across all 3 asset tables)
	if err := database.DB.Raw(`
		SELECT status, SUM(c) as count FROM (
			SELECT status, COUNT(*) as c FROM drone_assets WHERE deleted_at IS NULL GROUP BY status
			UNION ALL
			SELECT status, COUNT(*) as c FROM office_assets WHERE deleted_at IS NULL GROUP BY status
			UNION ALL
			SELECT status, COUNT(*) as c FROM rnd_assets WHERE deleted_at IS NULL GROUP BY status
		) as combined
		GROUP BY status
	`).Scan(&resp.StatusBreakdown).Error; err != nil {
		log.Printf("Error fetching status breakdown: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch status breakdown"})
		return
	}

	// 4. Total Flight Hours (sum from drone_assets)
	if err := database.DB.Raw(`
		SELECT COALESCE(SUM(total_flight_hours), 0) FROM drone_assets WHERE deleted_at IS NULL
	`).Scan(&resp.TotalFlightHours).Error; err != nil {
		log.Printf("Error fetching total flight hours: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch total flight hours"})
		return
	}

	c.JSON(http.StatusOK, resp)
}
