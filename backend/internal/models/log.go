package models

import (
	"time"

	"gorm.io/gorm"
)

type SystemLog struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Timestamp time.Time      `gorm:"autoCreateTime" json:"timestamp"`
	Level     string         `gorm:"not null" json:"level"` // INFO, WARNING, ERROR, CRITICAL
	UserID    *string        `gorm:"type:uuid" json:"user_id"`
	User      User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Action    string         `gorm:"not null" json:"action"`
	Details   string         `json:"details"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type AuditLog struct {
	ID         uint                   `gorm:"primaryKey" json:"id"`
	UserID     *string                `gorm:"type:uuid" json:"user_id"`
	User       User                   `gorm:"foreignKey:UserID" json:"user,omitempty"`
	ActionType string                 `gorm:"not null" json:"action_type"`
	EntityType string                 `gorm:"not null" json:"entity_type"`
	EntityID   string                 `json:"entity_id"`
	Details    map[string]interface{} `gorm:"type:jsonb;serializer:json" json:"details"`
	CreatedAt  time.Time              `gorm:"autoCreateTime" json:"created_at"`
}
