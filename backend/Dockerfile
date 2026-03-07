# Stage 1: Build the Go binary
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install security-related packages for the build
RUN apk update && apk add --no-cache git ca-certificates tzdata && update-ca-certificates

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download all dependencies
RUN go mod download
RUN go mod verify

# Copy the source code
COPY . .

# Build the binary with security flags (CGO_ENABLED=0 for static binary)
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -a -installsuffix cgo -ldflags="-w -s" -o backend-binary main.go

# Stage 2: Minimal runtime
FROM alpine:latest

WORKDIR /app

# PATCH THE ALPINE BASE IMAGE FOR CVEs (e.g., zlib)
RUN apk update && apk upgrade --no-cache

# Force-upgrade the specific vulnerable package
RUN apk add --no-cache --upgrade zlib

# Import the user and group files from the builder
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copy the pre-built binary file from the previous stage
COPY --from=builder /app/backend-binary .

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create uploads directory (since it exists in folder structure) and set ownership
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

CMD ["./backend-binary"]