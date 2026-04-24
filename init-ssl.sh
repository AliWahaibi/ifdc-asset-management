#!/bin/bash

# Configuration
DOMAIN="aerotrack.ifdc.tech"
EMAIL="admin@ifdc.tech"
DATA_PATH="./certbot"

echo "### 1. Cleaning up old certbot data..."
rm -rf "$DATA_PATH"

echo "### 2. Creating Let's Encrypt directory structure..."
mkdir -p "$DATA_PATH/conf/live/$DOMAIN"

echo "### 3. Generating self-signed dummy RSA certificates..."
# Generate directly into the mapped volume path on the host to prevent Nginx crash
openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
  -keyout "$DATA_PATH/conf/live/$DOMAIN/privkey.pem" \
  -out "$DATA_PATH/conf/live/$DOMAIN/fullchain.pem" \
  -subj "/CN=localhost"

echo "### 4. Starting the Nginx frontend (react-frontend) with --build..."
docker compose up -d --build react-frontend

echo "### 5. Waiting for Nginx to fully boot (10 seconds)..."
sleep 10

echo "### 6. Requesting real Let's Encrypt certificates..."
docker compose run --rm certbot certonly --webroot -w /var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d "$DOMAIN"

echo "### 7. Reloading Nginx with real certificates..."
docker compose exec react-frontend nginx -s reload

echo "### 8. Starting the rest of the application..."
docker compose up -d
