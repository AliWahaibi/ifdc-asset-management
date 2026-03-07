package models

type SystemSetting struct {
	ID                        uint   `gorm:"primaryKey" json:"id"`
	CompanyName               string `json:"company_name"`
	SupportEmail              string `json:"support_email"`
	MaintenanceThresholdHours int    `json:"maintenance_threshold_hours"`
	DefaultCurrency           string `json:"default_currency"`
}
