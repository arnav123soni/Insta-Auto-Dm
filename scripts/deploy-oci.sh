#!/bin/bash
set -e

echo "=========================================================="
echo "  Deploying OpenReply to Oracle Cloud (Production)"
echo "=========================================================="

# Check if .env exists
if [ ! -f .env ]; then
  if [ -f .env.production ]; then
    echo "==> Using .env.production as .env"
    cp .env.production .env
  else
    echo "ERROR: Neither .env nor .env.production found!"
    echo "Please copy .env.production.example to .env and configure your secrets."
    exit 1
  fi
fi

# Ensure Docker and Docker Compose are present
if ! command -v docker &> /dev/null; then
  echo "ERROR: Docker is not installed. Please install docker first."
  exit 1
fi

COMPOSE_CMD="docker compose"
if ! docker compose version &> /dev/null; then
  if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
  else
    echo "ERROR: Neither 'docker compose' nor 'docker-compose' found!"
    exit 1
  fi
fi

echo "==> Building and starting production containers..."
$COMPOSE_CMD -f docker-compose.prod.yml up -d --build

echo "==> Waiting for services to become healthy..."
sleep 5

echo "==> Checking container status:"
$COMPOSE_CMD -f docker-compose.prod.yml ps

echo "=========================================================="
echo "  Deployment Complete!"
echo "  Local binding: http://127.0.0.1:${WEB_PORT:-3001}"
echo "=========================================================="
