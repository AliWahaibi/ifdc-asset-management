package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"ifdc-backend/internal/database"
	"ifdc-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/microcosm-cc/bluemonday"
	"golang.org/x/crypto/bcrypt"
)

// GetUsers retrieves a paginated list of users
func GetUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.Query("search")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	offset := (page - 1) * limit

	var users []models.User
	var total int64

	query := database.DB.Model(&models.User{})
	if search != "" {
		query = query.Where("full_name ILIKE ? OR email ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count users"})
		return
	}

	if err := query.Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  users,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// UploadUserFiles handles multipart/form-data for creating or updating a user
func UploadUserFiles(c *gin.Context) {
	// 1. Parse the multipart form
	// 10 MB limit for parsing the form
	if err := c.Request.ParseMultipartForm(10 << 20); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse multipart form"})
		return
	}

	// 2. Extract standard text fields (e.g. email, full_name, role)
	email := c.PostForm("email")
	fullName := c.PostForm("full_name")

	if email == "" || fullName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email and full_name are required"})
		return
	}

	// Check if this is an update (PUT) or creation (POST)
	userID := c.Param("id")
	isUpdate := userID != ""

	var user models.User
	if isUpdate {
		if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		user.Email = email
		user.FullName = fullName
	} else {
		user = models.User{
			ID:       uuid.New().String(),
			Email:    email,
			FullName: fullName,
		}
	}

	// 3. Setup upload directory
	uploadDir := "./uploads/users"
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	// 4. Handle CV File
	cvFile, cvHeader, err := c.Request.FormFile("cv_file")
	if err == nil {
		defer cvFile.Close()

		// Validate type
		if !isValidMimeType(cvHeader.Header.Get("Content-Type")) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type for CV"})
			return
		}

		filename := fmt.Sprintf("%s_%d%s", uuid.New().String(), time.Now().Unix(), filepath.Ext(cvHeader.Filename))
		savePath := filepath.Join(uploadDir, filename)

		out, err := os.Create(savePath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save CV file"})
			return
		}
		defer out.Close()
		io.Copy(out, cvFile)

		// Save the relative URL path
		user.CVUrl = fmt.Sprintf("/uploads/users/%s", filename)
	}

	// 5. Handle ID Card File
	idFile, idHeader, err := c.Request.FormFile("id_card_file")
	if err == nil {
		defer idFile.Close()

		// Validate type
		if !isValidMimeType(idHeader.Header.Get("Content-Type")) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type for ID card"})
			return
		}

		filename := fmt.Sprintf("%s_%d%s", uuid.New().String(), time.Now().Unix(), filepath.Ext(idHeader.Filename))
		savePath := filepath.Join(uploadDir, filename)

		out, err := os.Create(savePath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save ID card file"})
			return
		}
		defer out.Close()
		io.Copy(out, idFile)

		// Save the relative URL path
		user.IDCardUrl = fmt.Sprintf("/uploads/users/%s", filename)
	}

	position := c.PostForm("position")
	if position != "" {
		user.Position = position
	}

	phone := c.PostForm("phone")
	if phone != "" {
		user.Phone = phone
	}

	// New Phase 1 HR Fields
	if dept := c.PostForm("department"); dept != "" {
		user.Department = dept
	}
	if addr := c.PostForm("address"); addr != "" {
		user.Address = addr
	}
	if marital := c.PostForm("marital_status"); marital != "" {
		user.MaritalStatus = marital
	}
	if wa := c.PostForm("whatsapp_number"); wa != "" {
		user.WhatsappNumber = wa
	}

	// XSS Sanitization
	p := bluemonday.UGCPolicy()
	user.FullName = p.Sanitize(user.FullName)
	user.Position = p.Sanitize(user.Position)
	user.Address = p.Sanitize(user.Address)

	rawPassword := c.PostForm("password")
	if rawPassword != "" {
		hashed, _ := bcrypt.GenerateFromPassword([]byte(rawPassword), 12)
		user.PasswordHash = string(hashed)
	} else if !isUpdate {
		hashed, _ := bcrypt.GenerateFromPassword([]byte("password"), 12)
		user.PasswordHash = string(hashed)
	}

	role := c.PostForm("role")
	if role != "" {
		validRoles := map[string]bool{"super_admin": true, "manager": true, "team_leader": true, "employee": true}
		if validRoles[role] {
			user.Role = role
		} else {
			user.Role = "employee"
		}
	} else if !isUpdate {
		user.Role = "employee"
	}

	if isUpdate {
		if err := database.DB.Save(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user in database"})
			return
		}
	} else {
		if err := database.DB.Create(&user).Error; err != nil {
			if database.IsUniqueConstraintError(err) {
				c.JSON(http.StatusConflict, gin.H{"error": "A user with this email already exists"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user in database"})
			return
		}
	}

	// 6. Handle Multi-Document Uploads (UserDocument Table)
	docTypes := []string{"vehicle_license", "assurance_card", "drone_pilot_certificate", "other_certificate"}
	docDir := "./uploads/user_documents"
	os.MkdirAll(docDir, os.ModePerm)

	for _, dt := range docTypes {
		file, header, err := c.Request.FormFile(dt)
		if err == nil {
			defer file.Close()
			if !isValidMimeType(header.Header.Get("Content-Type")) {
				continue // Skip invalid types
			}

			filename := fmt.Sprintf("%s_%s_%d%s", user.ID, dt, time.Now().Unix(), filepath.Ext(header.Filename))
			savePath := filepath.Join(docDir, filename)

			out, err := os.Create(savePath)
			if err == nil {
				io.Copy(out, file)
				out.Close()

				// Create or Update Document Record
				var doc models.UserDocument
				database.DB.Where("user_id = ? AND type = ?", user.ID, dt).First(&doc)
				doc.UserID = user.ID
				doc.Type = dt
				doc.FileURL = fmt.Sprintf("/uploads/user_documents/%s", filename)
				doc.FileName = header.Filename
				database.DB.Save(&doc)
			}
		}
	}

	c.JSON(http.StatusOK, user)
}

// DeleteUser deletes a user by ID
func DeleteUser(c *gin.Context) {
	id := c.Param("id")

	// Ensure the user exists
	var user models.User
	if err := database.DB.First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Delete from database (Soft delete because models.User has gorm.DeletedAt)
	if err := database.DB.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

// UpdateUserStatus toggles user status between 'active' and 'suspended'
func UpdateUserStatus(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Status string `json:"status" binding:"required,oneof=active suspended"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	user.Status = input.Status
	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user status"})
		return
	}

	database.CreateLog("WARNING", "User Status Change", fmt.Sprintf("User %s status changed to %s", user.Email, input.Status), &user.ID)

	c.JSON(http.StatusOK, user)
}

// GetProfile returns the current user's profile and assigned office assets
func GetProfile(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: missing user ID"})
		return
	}

	var user models.User
	if err := database.DB.Preload("Documents").First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var assets []models.OfficeAsset
	database.DB.Where("assigned_to = ? OR user_id = ?", userID, userID).Find(&assets)

	c.JSON(http.StatusOK, gin.H{
		"user":          user,
		"office_assets": assets,
	})
}

// GetUser returns a specific user's detailed info, assets, and admissions
func GetUser(c *gin.Context) {
	id := c.Param("id")

	var user models.User
	if err := database.DB.Preload("Documents").First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Fetch assigned office assets
	var assets []models.OfficeAsset
	database.DB.Where("assigned_to = ? OR user_id = ?", id, id).Find(&assets)

	// Fetch recent admissions (projects)
	var admissions []models.Project
	database.DB.Where("user_id = ?", id).Order("created_at desc").Find(&admissions)

	c.JSON(http.StatusOK, gin.H{
		"user":          user,
		"office_assets": assets,
		"admissions":    admissions,
	})
}

// Helper to validate MIME types
func isValidMimeType(mime string) bool {
	allowed := map[string]bool{
		"application/pdf": true,
		"image/jpeg":      true,
		"image/png":       true,
	}
	return allowed[mime]
}
