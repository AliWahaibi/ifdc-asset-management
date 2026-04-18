package handlers

import (
	"fmt"
	"net/http"
	"time"

	"ifdc-backend/internal/database"
	"ifdc-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type CreateLeaveRequestInput struct {
	StartDate string `json:"start_date" binding:"required"`
	EndDate   string `json:"end_date" binding:"required"`
	Reason    string `json:"reason"`
}

// CalculateWorkingDays calculates working days between start and end date,
// excluding Fridays and Saturdays (Omani weekend).
func CalculateWorkingDays(start, end time.Time) int {
	days := 0
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		weekday := d.Weekday()
		if weekday != time.Friday && weekday != time.Saturday {
			days++
		}
	}
	return days
}

// CreateLeaveRequest handles the submission of a new leave request
func CreateLeaveRequest(c *gin.Context) {
	userID := c.GetString("userID")
	userRole := c.GetString("userRole")

	var input CreateLeaveRequestInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Manual Parsing for Omani/Standard format YYYY-MM-DD
	startDate, err := time.Parse("2006-01-02", input.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start date format. Expected YYYY-MM-DD"})
		return
	}
	endDate, err := time.Parse("2006-01-02", input.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end date format. Expected YYYY-MM-DD"})
		return
	}

	if endDate.Before(startDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "End date cannot be before start date"})
		return
	}

	totalDays := CalculateWorkingDays(startDate, endDate)
	if totalDays == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Selected range only contains weekends"})
		return
	}

	// Initial Status Logic
	status := "pending_manager"
	if userRole == "manager" || userRole == "super_admin" {
		status = "pending_ceo"
	}

	leave := models.LeaveRequest{
		UserID:    userID,
		StartDate: startDate,
		EndDate:   endDate,
		Status:    status,
		TotalDays: totalDays,
		Reason:    input.Reason,
	}

	if err := database.DB.Create(&leave).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create leave request"})
		return
	}

	database.CreateLog("INFO", "Leave Request Created", fmt.Sprintf("User %s requested %d days", userID, totalDays), &userID)

	c.JSON(http.StatusCreated, leave)
}

// GetLeaveRequests retrieves leave requests based on user roles and visibility rules
func GetLeaveRequests(c *gin.Context) {
	userID := c.GetString("userID")
	userRole := c.GetString("userRole")

	var requests []models.LeaveRequest
	query := database.DB.Preload("User")

	// Visibility Rules
	switch userRole {
	case "super_admin":
		// CEO/HR sees everyone
	case "manager":
		// Manager sees own + department reports
		query = query.Where("user_id = ? OR user_id IN (SELECT id FROM users WHERE manager_id = ?)", userID, userID)
	default:
		// Employees see only their own
		query = query.Where("user_id = ?", userID)
	}

	if err := query.Order("created_at desc").Find(&requests).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch leave requests"})
		return
	}

	c.JSON(http.StatusOK, requests)
}

// UpdateLeaveStatus handles the approval workflow
func UpdateLeaveStatus(c *gin.Context) {
	id := c.Param("id")
	userRole := c.GetString("userRole")
	userID := c.GetString("userID")

	var input struct {
		Status  string `json:"status" binding:"required,oneof=approved rejected cancelled"`
		Comment string `json:"comment"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var leave models.LeaveRequest
	if err := database.DB.Preload("User").First(&leave, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Leave request not found"})
		return
	}

	// Workflow Authorization
	canApprove := false
	newStatus := input.Status

	if input.Status == "cancelled" {
		// Users can cancel their own pending requests
		if leave.UserID == userID && (leave.Status == "pending_manager" || leave.Status == "pending_ceo") {
			canApprove = true
		}
	} else {
		// Rule 1: No user can approve/reject their own leave request
		if leave.UserID == userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "You cannot approve or reject your own leave request"})
			return
		}

		if userRole == "super_admin" {
			// CEO/Super Admin can approve anything pending
			canApprove = true
			leave.CEOComment = input.Comment
		} else if (userRole == "manager" || userRole == "team_leader") && leave.Status == "pending_manager" {
			// Team Leader or Manager Approval (first stage)
			if leave.User.ManagerID != nil && *leave.User.ManagerID == userID {
				canApprove = true
				if input.Status == "approved" {
					newStatus = "pending_ceo" // Move to CEO approval
				}
				leave.ManagerComment = input.Comment
			}
		}
	}

	if !canApprove {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to perform this update"})
		return
	}

	leave.Status = newStatus
	if err := database.DB.Save(&leave).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update leave status"})
		return
	}

	database.CreateLog("INFO", "Leave Status Updated", fmt.Sprintf("Leave %s status updated to %s", id, newStatus), &userID)

	c.JSON(http.StatusOK, leave)
}

// GetLeaveBalance calculates the remaining working days for a user
func GetLeaveBalance(c *gin.Context) {
	userID := c.Query("user_id")
	if userID == "" {
		userID = c.GetString("userID")
	}

	var totalApproved int64
	database.DB.Model(&models.LeaveRequest{}).
		Where("user_id = ? AND status = 'approved'", userID).
		Select("SUM(total_days)").
		Row().Scan(&totalApproved)

	balance := 23 - totalApproved
	if balance < 0 {
		balance = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"user_id":          userID,
		"annual_balance":   23,
		"used_days":        totalApproved,
		"remaining_days":   balance,
	})
}
