package database

import (
	"log"

	"ifdc-backend/internal/models"
	"gorm.io/gorm"
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
			log.Printf("Failed to create system log: %v", err)
		}
	}()
}

// LogEvent records a comprehensive audit trail entry with flexible metadata.
// It uses a background goroutine so it does not block the main request handler.
func LogEvent(db *gorm.DB, userID *string, actionType, entityType, entityID string, detailsMap map[string]interface{}) {
	entry := models.AuditLog{
		UserID:     userID,
		ActionType: actionType,
		EntityType: entityType,
		EntityID:   entityID,
		Details:    detailsMap,
	}

	go func() {
		if err := db.Create(&entry).Error; err != nil {
			log.Printf("Failed to create audit log event: %v", err)
		}
	}()
}
