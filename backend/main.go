package main

import (
	"log"
	"os"

	"ifdc-backend/cmd/server"
	"ifdc-backend/internal/database"
	"ifdc-backend/internal/models"

	"github.com/joho/godotenv"
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

	// Auto Migrate the schema
	err := database.DB.AutoMigrate(
		&models.User{},
		&models.DroneAsset{},
		&models.OfficeAsset{},
		&models.RndAsset{},
		&models.Reservation{},
		&models.Notification{},
	)
	if err != nil {
		log.Fatalf("Failed to auto migrate: %v", err)
	}

	// Seed the database
	database.SeedUsers()

	server.Start()
}
