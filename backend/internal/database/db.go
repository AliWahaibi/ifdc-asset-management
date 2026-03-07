package database

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDB() {
	host := os.Getenv("DB_HOST")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")
	port := os.Getenv("DB_PORT")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
		host, user, password, dbname, port)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v\n", err)
	}

	DB = db
	log.Println("Database connection established")
}

// IsUniqueConstraintError checks if a GORM error is a Postgres unique constraint violation
func IsUniqueConstraintError(err error) bool {
	if err == nil {
		return false
	}
	// Postgres unique constraint error code is 23505
	return err.Error() == "ERROR: duplicate key value violates unique constraint" ||
		// A simplistic string match for standard pq/pgx errors
		// In a real prod environment we would type assert to *pgconn.PgError and check Code == "23505"
		// For now, this string check helps avoid importing pgx/pq directly if not already done.
		// Let's rely on standard strings.
		// A common GORM error text contains "23505"
		contains(err.Error(), "23505") || contains(err.Error(), "duplicate key")
}

func contains(s, substr string) bool {
	// Simple string contains
	return len(s) >= len(substr) && (s == substr || matchesContains(s, substr))
}

func matchesContains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
