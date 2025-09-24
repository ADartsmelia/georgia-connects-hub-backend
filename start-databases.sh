#!/bin/bash

echo "🚀 Starting Georgia Connects Hub Databases..."
echo "[INFO] Starting PostgreSQL and Redis..."

# Start the databases
docker-compose up -d postgres redis

echo "[INFO] Waiting for services to be healthy..."
sleep 10

# Check if services are running
if docker-compose ps postgres | grep -q "healthy"; then
    echo "✅ PostgreSQL is running and healthy"
else
    echo "❌ PostgreSQL failed to start properly"
    docker-compose logs postgres
    exit 1
fi

if docker-compose ps redis | grep -q "healthy"; then
    echo "✅ Redis is running and healthy"
else
    echo "❌ Redis failed to start properly"
    docker-compose logs redis
    exit 1
fi

echo ""
echo "🎉 Databases are ready!"
echo "📊 PostgreSQL: localhost:5432"
echo "⚡ Redis: localhost:6379"
echo ""
echo "📋 Useful commands:"
echo "  View logs: docker-compose logs -f [service]"
echo "  Stop all: docker-compose down"
echo "  Start pgAdmin: docker-compose --profile tools up -d pgadmin"
echo ""
echo "🔍 Database connection details:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: georgia_connects_hub"
echo "  Username: postgres"
echo "  Password: postgres123"
