package server

import (
	"fmt"
	"log"

	// Assuming handlers is properly gomod initialized
	"ifdc-backend/internal/handlers"
	"ifdc-backend/internal/middleware"
	"time"

	"golang.org/x/time/rate"

	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	r := gin.Default()

	// 1. Serve static files from the uploads directory securely
	// This allows the frontend to load the uploaded CVs and ID cards via URL
	r.Static("/uploads", "./uploads")

	// Global default rate limiting (e.g. 100 req per minute)
	r.Use(middleware.RateLimiter(rate.Every(time.Minute/100), 100))

	api := r.Group("/api")
	{
		// Global Search
		api.GET("/search", middleware.RequireAuth(), handlers.GlobalSearch)

		// Auth routes
		auth := api.Group("/auth")
		// Stricter rate limit for login to prevent brute force (30 req per min)
		auth.Use(middleware.RateLimiter(rate.Every(time.Minute/30), 30))
		{
			auth.POST("/login", handlers.Login)
			auth.POST("/refresh", handlers.RefreshToken)
		}

		// Users group
		users := api.Group("/users")
		users.Use(middleware.RequireAuth())
		{
			// GET /api/users to return mock users list
			users.GET("", handlers.GetUsers)
			// POST /api/users to handle multipart form data
			users.POST("", handlers.UploadUserFiles)
			users.PUT("/:id", handlers.UploadUserFiles)
			users.DELETE("/:id", handlers.DeleteUser)
		}

		// Reservations workflow
		reservations := api.Group("/reservations")
		reservations.Use(middleware.RequireAuth())
		{
			// GET /api/reservations to return mock reservations list
			reservations.GET("", handlers.GetReservations)
			// User requesting reservation
			reservations.POST("", handlers.CreateReservation)
			// Admin updating status (approve/reject)
			reservations.PATCH("/:id/status", handlers.UpdateReservationStatus)
		}

		// Operations group
		operations := api.Group("/operations")
		operations.Use(middleware.RequireAuth())
		{
			operations.GET("/drones", handlers.GetDrones)
			operations.POST("/drones", handlers.CreateDrone)
			operations.PUT("/drones/:id", handlers.UpdateDrone)
			operations.DELETE("/drones/:id", handlers.DeleteDrone)
		}

		// Office group
		office := api.Group("/office")
		office.Use(middleware.RequireAuth())
		{
			office.GET("/assets", handlers.GetOfficeAssets)
			office.POST("/assets", handlers.CreateOfficeAsset)
			office.PUT("/assets/:id", handlers.UpdateOfficeAsset)
			office.DELETE("/assets/:id", handlers.DeleteOfficeAsset)
		}

		// R&D group
		rnd := api.Group("/rnd")
		rnd.Use(middleware.RequireAuth())
		{
			rnd.GET("/assets", handlers.GetRndAssets)
			rnd.POST("/assets", handlers.CreateRndAsset)
			rnd.PUT("/assets/:id", handlers.UpdateRndAsset)
			rnd.DELETE("/assets/:id", handlers.DeleteRndAsset)
		}

		// Dashboard activities
		api.GET("/dashboard/activities", handlers.GetActivities)

		// System Settings
		settings := api.Group("/settings")
		settings.Use(middleware.RequireAuth())
		settings.Use(func(c *gin.Context) {
			role := c.GetString("userRole")
			if role != "super_admin" && role != "admin_manager" {
				c.AbortWithStatusJSON(403, gin.H{"error": "Admin access required"})
				return
			}
			c.Next()
		})
		{
			settings.GET("", handlers.GetSettings)
			settings.PUT("", handlers.UpdateSettings)
		}

		// Statistics & Analytics
		statistics := api.Group("/statistics")
		statistics.Use(middleware.RequireAuth())
		statistics.Use(func(c *gin.Context) {
			role := c.GetString("userRole")
			if role != "super_admin" && role != "admin_manager" {
				c.AbortWithStatusJSON(403, gin.H{"error": "Admin access required"})
				return
			}
			c.Next()
		})
		{
			statistics.GET("", handlers.GetStatistics)
		}

		// Notifications group
		notifications := api.Group("/notifications")
		notifications.Use(middleware.RequireAuth())
		{
			notifications.GET("", handlers.GetNotifications)
			notifications.PATCH("/:id/read", handlers.MarkNotificationRead)
		}
	}

	return r
}

func Start() {
	r := SetupRouter()

	// Debug: Print all registered routes
	fmt.Println("\n=== Registered Routes ===")
	for _, route := range r.Routes() {
		fmt.Printf("  %s %s\n", route.Method, route.Path)
	}
	fmt.Println("=========================")

	log.Println("Server running on :8080")
	r.Run(":8080")
}
