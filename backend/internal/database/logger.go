package database

import (
	"log"

	"ifdc-backend/internal/models"
)

// CreateLog records a new system log entry
func CreateLog(level, action, details string, userID *string) {
	entry := models.SystemLog{
		Level:   level,
		Action:  action,
		Details: details,
		UserID:  userID,
	}

	// Use a background goroutine so logging doesn't block the main request flow
	go func() {
		if err := DB.Create(&entry).Error; err != nil {
			log.Printf("Failed to create audit log: %v", err)
		}
	}()
}
