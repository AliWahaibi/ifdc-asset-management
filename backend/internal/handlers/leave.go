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
	StartDate          string `json:"start_date" binding:"required"`
	EndDate            string `json:"end_date" binding:"required"`
	Reason             string `json:"reason"`
	LeaveType          string `json:"leave_type" binding:"required"` // annual, sick, emergency, special, sick_companion
	SpecialLeaveReason string `json:"special_leave_reason"`
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

	// Strict overlap check for existing leaves (pending or approved)
	var overlapCount int64
	database.DB.Model(&models.LeaveRequest{}).
		Where("user_id = ? AND status IN ('pending_manager', 'pending_ceo', 'pending_hr', 'approved') AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?) OR (start_date >= ? AND end_date <= ?))",
			userID, endDate, startDate, endDate, startDate, startDate, endDate).
		Count(&overlapCount)

	if overlapCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You already have a leave request during this period."})
		return
	}

	// Prevent overlaps with blackout dates for annual leaves
	if input.LeaveType == "annual" {
		var blackoutConflicts int64
		database.DB.Model(&models.BlackoutDate{}).
			Where("(start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?) OR (start_date >= ? AND end_date <= ?)",
				endDate, startDate, endDate, startDate, startDate, endDate).
			Count(&blackoutConflicts)
		if blackoutConflicts > 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Annual leave cannot be requested during a blackout period."})
			return
		}
	}

	totalDays := CalculateWorkingDays(startDate, endDate)

	// Sick leave includes weekends
	if input.LeaveType == "sick" {
		totalDays = int(endDate.Sub(startDate).Hours()/24) + 1
	}

	if totalDays == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Selected range only contains weekends"})
		return
	}

	// Validation Rules
	now := time.Now()
	daysAhead := int(startDate.Sub(now).Hours() / 24)

	switch input.LeaveType {
	case "sick":
		if totalDays > 6 {
			// Task 7: Sick Leave Overflow Logic
			// Deduct from Annual Leave balance instead
			input.LeaveType = "annual"
		}
	case "annual":
		if totalDays > 15 && daysAhead < 30 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Annual leaves longer than 15 days require a 30-day advance notice."})
			return
		}
		if totalDays < 3 && daysAhead < 7 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Annual leaves shorter than 3 days require a 7-day advance notice."})
			return
		}

		// Probation period check
		var requestUser models.User
		database.DB.First(&requestUser, "id = ?", userID)
		if now.Sub(requestUser.CreatedAt).Hours()/24 < 180 { // 6 months approximation
			c.JSON(http.StatusBadRequest, gin.H{"error": "Annual leave is restricted during the first 6 months of employment."})
			return
		}

	case "emergency":
		now := time.Now()
		startOfYear := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())
		var usedEmergency int64
		database.DB.Model(&models.LeaveRequest{}).
			Where("user_id = ? AND leave_type = ? AND status = ? AND created_at >= ?", userID, "emergency", "approved", startOfYear).
			Count(&usedEmergency)

		if usedEmergency+int64(totalDays) > 6 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Emergency leave is capped at 6 days per year."})
			return
		}
	case "sick_companion":
		if totalDays > 14 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Sick companion leave is capped at 14 days."})
			return
		}
	}

	// Initial Status Logic
	status := "pending_manager"
	pendingApprovalBy := "manager"
	if userRole == "manager" || userRole == "ceo" || userRole == "super_admin" {
		status = "pending_ceo"
		pendingApprovalBy = "ceo"
	}

	// Task 7: Approval Routing
	switch input.LeaveType {
	case "sick", "emergency":
		pendingApprovalBy = "hr"
		status = "pending_hr"
	case "annual", "sick_companion":
		pendingApprovalBy = "ceo"
		status = "pending_ceo"
	}

	leave := models.LeaveRequest{
		UserID:             userID,
		LeaveType:          input.LeaveType,
		SpecialLeaveReason: input.SpecialLeaveReason,
		StartDate:          startDate,
		EndDate:            endDate,
		Status:             status,
		PendingApprovalBy:  pendingApprovalBy,
		TotalDays:          totalDays,
		Reason:             input.Reason,
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
	case "super_admin", "ceo", "CEO":
		// CEO/HR sees everyone
	case "manager":
		// Manager sees only their department
		var manager models.User
		database.DB.First(&manager, "id = ?", userID)
		query = query.Joins("JOIN users ON users.id = leave_requests.user_id").Where("users.department = ?", manager.Department)
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

// GetAllLeaves retrieves all leaves with filters for admins (Task 10a)
func GetAllLeaves(c *gin.Context) {
	userID := c.Query("user_id")
	department := c.Query("department")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	var requests []models.LeaveRequest
	query := database.DB.Preload("User")

	// Strict Scoping for Managers: They can only see their own department
	userRole := c.GetString("userRole")
	if userRole == "manager" {
		currentUserID := c.GetString("userID")
		var manager models.User
		database.DB.First(&manager, "id = ?", currentUserID)
		department = manager.Department // Force the department filter to their own
	}

	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}
	if department != "" {
		query = query.Joins("JOIN users ON users.id = leave_requests.user_id").Where("users.department = ?", department)
	}
	if startDate != "" {
		query = query.Where("start_date >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("end_date <= ?", endDate)
	}

	if err := query.Order("start_date desc").Find(&requests).Error; err != nil {
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
		if leave.UserID == userID && (leave.Status == "pending_manager" || leave.Status == "pending_ceo" || leave.Status == "pending_hr") {
			canApprove = true
		}
	} else {
		// Rule 1: No user can approve/reject their own leave request
		if leave.UserID == userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "You cannot approve or reject your own leave request"})
			return
		}

		// Exclusive Logic: Only CEO can approve or reject Annual Leaves and Sick Companion Leaves
		if (leave.LeaveType == "annual" || leave.LeaveType == "sick_companion") && userRole != "ceo" && userRole != "CEO" && userRole != "super_admin" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Only CEO can approve or reject annual and sick companion leaves"})
			return
		}

		switch {
		case userRole == "super_admin" || userRole == "ceo" || userRole == "CEO":
			// CEO/Super Admin can approve anything pending
			canApprove = true
			leave.CEOComment = input.Comment
		case userRole == "hr" && leave.Status == "pending_hr":
			canApprove = true
		case (userRole == "manager" || userRole == "team_leader") && leave.Status == "pending_manager":
			// Team Leader or Manager Approval (first stage) restricted to their department
			var approver models.User
			database.DB.First(&approver, "id = ?", userID)
			
			if approver.Department == leave.User.Department {
				canApprove = true
				if input.Status == "approved" {
					switch leave.PendingApprovalBy {
					case "ceo":
						newStatus = "pending_ceo" // Move to CEO approval
					case "hr":
						newStatus = "pending_hr" // Move to HR approval
					}
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

	now := time.Now()
	var totalAnnual int64
	database.DB.Model(&models.LeaveRequest{}).
		Where("user_id = ? AND leave_type = 'annual' AND status = 'approved' AND extract(year from start_date) = ?", userID, now.Year()).
		Select("COALESCE(SUM(total_days), 0)").
		Row().Scan(&totalAnnual)

	var totalSick int64
	database.DB.Model(&models.LeaveRequest{}).
		Where("user_id = ? AND leave_type = 'sick' AND status = 'approved' AND extract(year from start_date) = ?", userID, now.Year()).
		Select("COALESCE(SUM(total_days), 0)").
		Row().Scan(&totalSick)

	annualBalance := int64(30) - totalAnnual
	if annualBalance < 0 {
		annualBalance = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"user_id":          userID,
		"annual_balance":   30, // 30 Calendar Days
		"used_annual":      totalAnnual,
		"remaining_annual": annualBalance,
		"used_sick":        totalSick,
		"max_sick":         182,
	})
}

// GetBlackoutDates retrieves all active blackout dates
func GetBlackoutDates(c *gin.Context) {
	var dates []models.BlackoutDate
	if err := database.DB.Order("start_date asc").Find(&dates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch blackout dates"})
		return
	}
	c.JSON(http.StatusOK, dates)
}

// CreateBlackoutDate adds a new blackout period
func CreateBlackoutDate(c *gin.Context) {
	role := c.GetString("userRole")
	if role != "ceo" && role != "CEO" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Only CEO can block annual leave"})
		return
	}

	var input struct {
		StartDate string `json:"start_date" binding:"required"`
		EndDate   string `json:"end_date" binding:"required"`
		Reason    string `json:"reason" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	startDate, _ := time.Parse("2006-01-02", input.StartDate)
	endDate, _ := time.Parse("2006-01-02", input.EndDate)

	if endDate.Before(startDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "End date cannot be before start date"})
		return
	}

	blackout := models.BlackoutDate{
		StartDate: startDate,
		EndDate:   endDate,
		Reason:    input.Reason,
	}

	if err := database.DB.Create(&blackout).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create blackout date"})
		return
	}

	c.JSON(http.StatusCreated, blackout)
}

// DeleteBlackoutDate removes a blackout period
func DeleteBlackoutDate(c *gin.Context) {
	role := c.GetString("userRole")
	if role != "ceo" && role != "CEO" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Only CEO can unblock annual leave"})
		return
	}

	id := c.Param("id")
	if err := database.DB.Delete(&models.BlackoutDate{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete blackout date"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Blackout date deleted successfully"})
}
