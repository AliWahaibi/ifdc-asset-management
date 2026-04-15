package main

import (
	"log"
	"os"

	"ifdc-backend/cmd/server"
	"ifdc-backend/internal/database"
	"ifdc-backend/internal/models"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found or error loading, relying on environment variables")
	}

	// SECURITY: Ensure critical secrets are loaded before booting
	requiredVars := []string{"DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "DB_PORT", "JWT_SECRET"}
	for _, v := range requiredVars {
		if os.Getenv(v) == "" {
			log.Fatalf("CRITICAL: Required environment variable '%s' is not set! Server cannot boot securely.", v)
		}
	}

	database.ConnectDB()
	ForceSeedAdmin(database.DB)

	// Auto Migrate the schema
	err := database.DB.AutoMigrate(
		&models.User{},
		&models.DroneAsset{},
		&models.OfficeAsset{},
		&models.RndAsset{},
		&models.Reservation{},
		&models.Notification{},
		&models.SystemSetting{},
		&models.SystemLog{},
		&models.Project{},
		&models.VehicleAsset{},
		&models.AssetHistory{},
		&models.Category{},
		&models.BatteryAsset{},
		&models.AccessoryAsset{},
	)
	if err != nil {
		log.Fatalf("Failed to auto migrate: %v", err)
	}

	// Seed the database
	database.SeedAdminUser()
	// database.SeedUsers()

	server.Start()
}

func ForceSeedAdmin(db *gorm.DB) {
	password := "Admin@123"
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("CRITICAL: Failed to hash recovery password: %v", err)
	}

	user := models.User{
		Email:        "ali123@gmail.com",
		FullName:     "Super Admin",
		PasswordHash: string(hashedPassword),
		Role:         "super_admin",
		IsApproved:   true,
		Status:       "active",
	}

	// Force update existing or create new
	result := db.Where("email = ?", user.Email).Assign(models.User{
		PasswordHash: user.PasswordHash,
		FullName:     user.FullName,
		Role:         user.Role,
		IsApproved:   user.IsApproved,
		Status:       user.Status,
	}).FirstOrCreate(&user)

	if result.Error != nil {
		log.Printf("ERROR: Failed to force seed admin: %v", result.Error)
	} else {
		log.Println("SUCCESS: Force seeded admin user ali123@gmail.com with password Admin@123")
	}
}
