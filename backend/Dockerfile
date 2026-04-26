# Stage 1: Build the Go binary
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install security-related packages for the build
RUN apk update && apk add --no-cache git ca-certificates tzdata && update-ca-certificates

# Force cache bust - this will make Docker re-download dependencies
ADD https://www.google.com /time.now

# Copy go mod and sum files  
COPY go.mod go.sum ./

# Download all dependencies (this will now re-download with updated versions)
RUN go mod download
RUN go mod verify

# Copy the source code
COPY . .

# Build the binary with security flags
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -p 1 -ldflags="-w -s" -o backend-binary main.go

# Stage 2: Minimal runtime
FROM alpine:latest

WORKDIR /app

# PATCH THE ALPINE BASE IMAGE FOR CVEs
RUN apk update && apk upgrade --no-cache

# Force-upgrade zlib
RUN apk add --no-cache --upgrade zlib --repository=https://dl-cdn.alpinelinux.org/alpine/edge/main

# Import the user and group files from the builder
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copy the pre-built binary file from the previous stage
COPY --from=builder /app/backend-binary .

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create uploads directory and set ownership
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

CMD ["./backend-binary"]