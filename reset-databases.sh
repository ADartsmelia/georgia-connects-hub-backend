#!/bin/bash

echo "🔄 Resetting Georgia Connects Hub Databases..."
echo "[WARNING] This will delete all data in PostgreSQL and Redis!"

read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Operation cancelled."
    exit 1
fi

echo "[INFO] Stopping and removing containers..."
docker-compose down --volumes

echo "[INFO] Removing volumes..."
docker volume rm georgia_connects_postgres_data georgia_connects_redis_data georgia_connects_pgadmin_data 2>/dev/null || true

echo "[INFO] Starting fresh databases..."
docker-compose up -d postgres redis

echo "[INFO] Waiting for services to be healthy..."
sleep 10

echo "✅ Databases reset and ready!"
echo "📊 PostgreSQL: localhost:5432"
echo "⚡ Redis: localhost:6379"
