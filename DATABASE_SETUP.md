# Database Setup with Docker

This directory contains Docker configuration for running PostgreSQL and Redis databases for the Georgia Connects Hub backend.

## 🚀 Quick Start

### Start Databases

```bash
./start-databases.sh
```

### Stop Databases

```bash
./stop-databases.sh
```

### Reset Databases (⚠️ Deletes all data)

```bash
./reset-databases.sh
```

## 📊 Services

| Service        | Port | Description                    | Credentials                                   |
| -------------- | ---- | ------------------------------ | --------------------------------------------- |
| **PostgreSQL** | 5432 | Primary database               | `postgres` / `postgres123`                    |
| **Redis**      | 6379 | Cache and session store        | Password: `redis123`                          |
| **pgAdmin**    | 5050 | Database management (optional) | `admin@georgia-connects-hub.com` / `admin123` |

## 🔧 Configuration

### Environment Variables

Copy `database.env` to `.env` and modify as needed:

```bash
cp database.env .env
```

### Database Connection

- **Host**: localhost
- **Port**: 5432
- **Database**: georgia_connects_hub
- **Username**: postgres
- **Password**: postgres123

### Redis Connection

- **Host**: localhost
- **Port**: 6379
- **Password**: redis123

## 🛠️ Advanced Usage

### Start with pgAdmin

```bash
docker-compose --profile tools up -d
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Connect to Database

```bash
# Using psql
docker-compose exec postgres psql -U postgres -d georgia_connects_hub

# Using Docker
docker run -it --rm --network georgia_connects_network postgres:15-alpine psql -h postgres -U postgres -d georgia_connects_hub
```

### Connect to Redis

```bash
# Using redis-cli
docker-compose exec redis redis-cli -a redis123

# Using Docker
docker run -it --rm --network georgia_connects_network redis:7-alpine redis-cli -h redis -a redis123
```

## 📁 Files

- `docker-compose.yml` - Main Docker Compose configuration
- `init-db.sql` - PostgreSQL initialization script
- `database.env` - Environment variables template
- `start-databases.sh` - Start databases script
- `stop-databases.sh` - Stop databases script
- `reset-databases.sh` - Reset databases script

## 🔍 Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :5432
lsof -i :6379

# Stop local services
brew services stop postgresql
brew services stop redis
```

### Permission Issues

```bash
# Fix file permissions
chmod +x *.sh
```

### Container Issues

```bash
# Remove and recreate containers
docker-compose down
docker-compose up -d --force-recreate
```

## 📚 Additional Resources

- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Redis Docker Image](https://hub.docker.com/_/redis)
- [pgAdmin Docker Image](https://hub.docker.com/_/pgadmin)
