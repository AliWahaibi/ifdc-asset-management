package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID           string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Email        string         `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash string         `gorm:"not null" json:"-"`
	FullName     string         `gorm:"not null" json:"full_name"`
	Role         string         `gorm:"not null;default:'user'" json:"role"`
	Position     string         `json:"position"`
	Phone        string         `json:"phone"`
	DepartmentID *string        `gorm:"type:uuid" json:"department_id"`
	Status       string         `gorm:"default:'active'" json:"status"`
	CVUrl        string         `json:"cv_url"`
	IDCardUrl    string         `json:"id_card_url"`
	IsApproved   bool           `gorm:"default:false" json:"is_approved"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

type DroneAsset struct {
	ID                  string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name                string         `gorm:"not null" json:"name"`
	Model               string         `gorm:"not null" json:"model"`
	SerialNumber        string         `gorm:"uniqueIndex;not null" json:"serial_number"`
	Status              string         `gorm:"not null;default:'available'" json:"status"` // available, in_use, maintenance, reserved
	DepartmentID        *string        `gorm:"type:uuid" json:"department_id"`
	TotalFlightHours    float64        `gorm:"default:0" json:"total_flight_hours"`
	LastMaintenanceDate *time.Time     `json:"last_maintenance_date"`
	NextMaintenanceDate *time.Time     `json:"next_maintenance_date"`
	Notes               string         `json:"notes"`
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`
	DeletedAt           gorm.DeletedAt `gorm:"index" json:"-"`
}

type OfficeAsset struct {
	ID             string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name           string         `gorm:"not null" json:"name"`
	Category       string         `gorm:"not null" json:"category"` // laptop, desktop, monitor, printer, phone, furniture, other
	SerialNumber   string         `gorm:"uniqueIndex;not null" json:"serial_number"`
	Status         string         `gorm:"not null;default:'available'" json:"status"` // available, in_use, maintenance, reserved
	DepartmentID   *string        `gorm:"type:uuid" json:"department_id"`
	AssignedTo     *string        `gorm:"type:uuid" json:"assigned_to"`
	PurchaseDate   *time.Time     `json:"purchase_date"`
	WarrantyExpiry *time.Time     `json:"warranty_expiry"`
	Notes          string         `json:"notes"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

type RndAsset struct {
	ID             string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name           string         `gorm:"not null" json:"name"`
	AssetType      string         `gorm:"not null" json:"asset_type"` // vtol, experimental, prototype, component
	SerialNumber   string         `gorm:"uniqueIndex;not null" json:"serial_number"`
	Status         string         `gorm:"not null;default:'available'" json:"status"` // available, in_use, maintenance, reserved
	DepartmentID   *string        `gorm:"type:uuid" json:"department_id"`
	Specifications string         `gorm:"type:jsonb" json:"specifications"` // Stored as JSONB in PG
	IsClassified   bool           `gorm:"default:false" json:"is_classified"`
	Notes          string         `json:"notes"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

type Reservation struct {
	ID        string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	UserID    string         `gorm:"type:uuid;not null" json:"user_id"`
	User      User           `gorm:"foreignKey:UserID" json:"user"`
	AssetType string         `gorm:"not null" json:"asset_type"` // drone, office, rnd
	AssetID   string         `gorm:"type:uuid;not null" json:"asset_id"`
	AssetName string         `gorm:"-" json:"asset_name"`
	StartDate time.Time      `gorm:"not null" json:"start_date"`
	EndDate   time.Time      `gorm:"not null" json:"end_date"`
	Status    string         `gorm:"not null;default:'pending'" json:"status"` // pending, approved, rejected, completed, cancelled
	Notes     string         `json:"notes"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
