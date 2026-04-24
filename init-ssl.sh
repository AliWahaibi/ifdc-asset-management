#!/bin/bash

# Configuration
DOMAIN="aerotrack.ifdc.tech"
EMAIL="admin@ifdc.tech" # Replace with your real email
DATA_PATH="./certbot"

if [ ! -e "$DATA_PATH/conf/ssl-dhparams.pem" ]; then
  echo "### Downloading recommended TLS parameters..."
  mkdir -p "$DATA_PATH/conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$DATA_PATH/conf/options-ssl-nginx.conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$DATA_PATH/conf/ssl-dhparams.pem"
fi

echo "### Creating dummy certificate for $DOMAIN..."
path="/etc/letsencrypt/live/$DOMAIN"
mkdir -p "$DATA_PATH/conf/live/$DOMAIN"
docker compose run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:4096 -days 1\
  -keyout '$path/privkey.pem' \
  -out '$path/fullchain.pem' \
  -subj '/CN=localhost'" certbot

echo "### Starting nginx..."
docker compose up --force-recreate -d react_frontend

echo "### Deleting dummy certificate for $DOMAIN..."
docker compose run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/$DOMAIN && \
  rm -rf /etc/letsencrypt/archive/$DOMAIN && \
  rm -rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot

echo "### Requesting Let's Encrypt certificate for $DOMAIN..."
# Join $domains to -d args
docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d $DOMAIN" certbot

echo "### Reloading nginx..."
docker compose exec react_frontend nginx -s reload
