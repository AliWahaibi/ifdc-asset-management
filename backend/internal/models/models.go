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
	Status              string         `gorm:"not null;default:'Available'" json:"status"` // Available, In Use, Maintenance, Reserved
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
	UserID         *string        `gorm:"type:uuid" json:"user_id"`
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
	ProjectID *string        `gorm:"type:uuid" json:"project_id"`
	Project   *Project       `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type Project struct {
	ID           string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name         string         `gorm:"not null" json:"name"`
	StartDate    time.Time      `json:"start_date"`
	EndDate      time.Time      `json:"end_date"`
	Status       string         `gorm:"not null;default:'active'" json:"status"` // active, completed, cancelled
	UserID          string         `gorm:"type:uuid;not null" json:"user_id"`
	User            User           `gorm:"foreignKey:UserID" json:"user"`
	Reservations    []Reservation  `gorm:"foreignKey:ProjectID" json:"requested_assets"`
	RejectionReason string         `json:"rejection_reason"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

type Admission struct {
	ID              string           `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	ProjectName     string           `gorm:"not null" json:"project_name"`
	Purpose         string           `json:"purpose"`
	StartDate       time.Time        `gorm:"not null" json:"start_date"`
	EndDate         time.Time        `gorm:"not null" json:"end_date"`
	Status          string           `gorm:"not null;default:'pending'" json:"status"`
	UserID          string           `gorm:"type:uuid;not null" json:"user_id"`
	User            User             `gorm:"foreignKey:UserID" json:"user"`
	RequestedAssets []AdmissionAsset `gorm:"foreignKey:AdmissionID" json:"requested_assets"`
	RejectionReason string           `json:"rejection_reason"`
	CreatedAt       time.Time        `json:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at"`
	DeletedAt       gorm.DeletedAt   `gorm:"index" json:"-"`
}

type AdmissionAsset struct {
	ID          string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	AdmissionID string         `gorm:"type:uuid;not null" json:"admission_id"`
	AssetID     string         `gorm:"type:uuid;not null" json:"asset_id"`
	AssetType   string         `gorm:"not null" json:"asset_type"` // drone, office, rnd, vehicle
	AssetName   string         `gorm:"-" json:"asset_name"`
	Status      string         `gorm:"not null;default:'pending'" json:"status"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type AssetHistory struct {
	ID              string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	AssetType       string    `gorm:"not null" json:"asset_type"` // drone, office, vehicle, rnd, battery, accessory
	AssetID         string    `gorm:"type:uuid;not null" json:"asset_id"`
	PreviousOwnerID *string   `gorm:"type:uuid" json:"previous_owner_id"`
	NewOwnerID      *string   `gorm:"type:uuid" json:"new_owner_id"`
	ProjectID       *string   `gorm:"type:uuid" json:"project_id"`
	Action          string    `gorm:"not null" json:"action"` // checkout, checkin, maintenance, assignment
	Notes           string    `json:"notes"`
	Timestamp       time.Time `gorm:"autoCreateTime" json:"timestamp"`
}

type Category struct {
	ID        string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name      string         `gorm:"uniqueIndex;not null" json:"name"`
	AssetType string         `gorm:"not null" json:"asset_type"` // office, drone, vehicle, etc.
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type BatteryAsset struct {
	ID           string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name         string         `gorm:"not null" json:"name"`
	Model        string         `gorm:"not null" json:"model"`
	SerialNumber string         `gorm:"uniqueIndex;not null" json:"serial_number"`
	Status       string         `gorm:"not null;default:'Available'" json:"status"`
	DroneID      *string        `gorm:"type:uuid" json:"drone_id"`
	CycleCount   int            `gorm:"default:0" json:"cycle_count"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

type AccessoryAsset struct {
	ID           string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name         string         `gorm:"not null" json:"name"`
	Type         string         `gorm:"not null" json:"type"` // lens, gimbal, remote, etc.
	SerialNumber string         `gorm:"uniqueIndex;not null" json:"serial_number"`
	Status       string         `gorm:"not null;default:'Available'" json:"status"`
	DroneID      *string        `gorm:"type:uuid" json:"drone_id"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

type VehicleAsset struct {
	ID           string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name         string         `gorm:"not null" json:"name"` // e.g. "Toyota Land Cruiser"
	LicensePlate string         `gorm:"uniqueIndex;not null" json:"license_plate"`
	Status       string         `gorm:"not null;default:'available'" json:"status"` // available, in_use, maintenance, reserved
	DepartmentID *string        `gorm:"type:uuid" json:"department_id"`
	Mileage      float64        `gorm:"default:0" json:"mileage"`
	Notes        string         `json:"notes"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
