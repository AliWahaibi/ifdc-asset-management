package database

import (
	"log"

	"ifdc-backend/internal/models"

	"crypto/sha256"
	"encoding/hex"

	"github.com/google/uuid"
)

func SeedUsers() {
	// Loop through all users and migrate plaintext passwords to SHA-256
	var existingUsers []models.User
	if err := DB.Find(&existingUsers).Error; err == nil {
		for _, u := range existingUsers {
			if len(u.PasswordHash) != 64 {
				// Not a 64-character hex string, assumed to be plaintext
				log.Printf("Migrating plaintext password for user %s", u.Email)
				hasher := sha256.New()
				hasher.Write([]byte(u.PasswordHash))
				newHash := hex.EncodeToString(hasher.Sum(nil))
				DB.Model(&u).Update("password_hash", newHash)
			}
		}
	} else {
		log.Printf("Error fetching users for password migration: %v\n", err)
	}

	// Retroactive fix: ensure all approved reservations have their parent asset marked as reserved
	var approvedReservations []models.Reservation
	if err := DB.Where("status = ?", "approved").Find(&approvedReservations).Error; err == nil {
		for _, res := range approvedReservations {
			switch res.AssetType {
			case "drone":
				DB.Model(&models.DroneAsset{}).Where("id = ?", res.AssetID).Update("status", "reserved")
			case "office":
				DB.Model(&models.OfficeAsset{}).Where("id = ?", res.AssetID).Update("status", "reserved")
			case "rnd":
				DB.Model(&models.RndAsset{}).Where("id = ?", res.AssetID).Update("status", "reserved")
			}
		}
		log.Println("Synced approved reservation asset statuses.")
	} else {
		log.Printf("Error fetching approved reservations for sync: %v\n", err)
	}

	// Setup default system settings if non-existent
	var settingsCount int64
	if err := DB.Model(&models.SystemSetting{}).Count(&settingsCount).Error; err == nil && settingsCount == 0 {
		defaultSettings := models.SystemSetting{
			ID:                        1,
			CompanyName:               "Ibn Firnas Drone Center",
			SupportEmail:              "admin@ifdc.ae",
			MaintenanceThresholdHours: 50,
			DefaultCurrency:           "OMR",
		}
		if err := DB.Create(&defaultSettings).Error; err != nil {
			log.Printf("Failed to seed default system settings: %v\n", err)
		} else {
			log.Println("Default system settings seeded successfully.")
		}
	}

	// Hash a default password: "password123"
	hasher := sha256.New()
	hasher.Write([]byte("password123"))
	hashedPassword := hex.EncodeToString(hasher.Sum(nil))

	demoUsers := []models.User{
		{
			ID:           uuid.New().String(),
			Email:        "superadmin@ifdc.ae",
			FullName:     "Khalid Al Maktoum",
			Role:         "super_admin",
			PasswordHash: hashedPassword,
			Status:       "active",
			IsApproved:   true,
		},
		{
			ID:           uuid.New().String(),
			Email:        "manager@ifdc.ae",
			FullName:     "Sara Al Nahyan",
			Role:         "manager",
			PasswordHash: hashedPassword,
			Status:       "active",
			IsApproved:   true,
		},
		{
			ID:           uuid.New().String(),
			Email:        "team_leader@ifdc.ae",
			FullName:     "Ahmed Hassan",
			Role:         "team_leader",
			PasswordHash: hashedPassword,
			Status:       "active",
			IsApproved:   true,
		},
		{
			ID:           uuid.New().String(),
			Email:        "employee@ifdc.ae",
			FullName:     "Fatima Al Zahra",
			Role:         "employee",
			PasswordHash: hashedPassword,
			Status:       "active",
			IsApproved:   true,
		},
	}

	for _, user := range demoUsers {
		var existing models.User
		if err := DB.Where("email = ?", user.Email).First(&existing).Error; err == nil {
			DB.Model(&existing).Update("password_hash", user.PasswordHash)
			DB.Model(&existing).Update("role", user.Role)
		} else {
			if err := DB.Create(&user).Error; err != nil {
				log.Printf("Failed to seed user %s: %v\n", user.Email, err)
			}
		}
	}

	log.Println("Demo users seeded successfully.")
}
