package database

import (
	"fmt"
	"time"
	"ifdc-backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// GetNextSequence generates a sequential reference number in the format PREFIX-YY-00000X
func GetNextSequence(prefix string) (string, error) {
	year := time.Now().Year() % 100 // Get last two digits of year, e.g., 26
	
	var seq models.ReferenceSequence
	
	err := DB.Transaction(func(tx *gorm.DB) error {
		// Use SELECT FOR UPDATE to handle concurrency
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("prefix = ? AND year = ?", prefix, year).
			First(&seq).Error; err != nil {
			
			if err == gorm.ErrRecordNotFound {
				// Initialize new sequence for this prefix/year
				seq = models.ReferenceSequence{
					Prefix:       prefix,
					Year:         year,
					CurrentValue: 1,
				}
				return tx.Create(&seq).Error
			}
			return err
		}

		// Increment
		seq.CurrentValue++
		return tx.Save(&seq).Error
	})

	if err != nil {
		return "", err
	}

	// Format: PREFIX-YY-00000X (6 digits padding)
	return fmt.Sprintf("%s-%02d-%06d", prefix, year, seq.CurrentValue), nil
}
