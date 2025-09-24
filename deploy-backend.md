# Backend Deployment Guide

## DigitalOcean Droplet Deployment

### Step 1: Create Droplet

1. **Go to DigitalOcean Console**

   - Navigate to Droplets → Create
   - Choose Ubuntu 22.04 LTS
   - Size: Basic $6/month (4GB RAM, 2 vCPUs, 80GB SSD)
   - Add SSH Key for authentication

2. **Create Managed PostgreSQL Database**
   - Navigate to Databases → Create
   - Choose PostgreSQL
   - Size: $15/month (1GB RAM, 1 vCPU, 10GB SSD)
   - Same region as droplet

### Step 2: Setup Droplet

1. **Connect to your droplet**

   ```bash
   ssh root@your-droplet-ip
   ```

2. **Run setup script**

   ```bash
   # Update system
   apt update && apt upgrade -y

   # Install Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   apt-get install -y nodejs

   # Install Redis
   apt install redis-server -y
   systemctl enable redis-server
   systemctl start redis-server

   # Install PM2
   npm install -g pm2

   # Install Git
   apt install git -y
   ```

### Step 3: Deploy Backend Code

1. **Create app directory**

   ```bash
   mkdir -p /var/www/georgia-connects
   cd /var/www/georgia-connects
   ```

2. **Clone backend repository**

   ```bash
   git clone https://github.com/your-username/georgia-connects-hub-backend.git backend
   cd backend
   ```

3. **Install dependencies**

   ```bash
   npm install --production
   ```

4. **Create production environment**
   ```bash
   cp .env .env.production
   nano .env.production
   ```

### Step 4: Configure Environment Variables

```bash
# .env.production
NODE_ENV=production
PORT=3000

# Database URL from DigitalOcean PostgreSQL
DATABASE_URL=postgresql://username:password@host:port/database

# Redis (local)
REDIS_URL=redis://localhost:6379

# JWT Secret (generate new secure one)
JWT_SECRET=your-super-secure-jwt-secret-here

# CORS - Allow frontend domain
CORS_ORIGIN=https://your-frontend-app.ondigitalocean.app

# Other production settings...
```

### Step 5: Start Backend

1. **Start with PM2**

   ```bash
   pm2 start src/server.js --name "georgia-connects-api"
   ```

2. **Save PM2 configuration**

   ```bash
   pm2 save
   pm2 startup
   ```

3. **Check status**
   ```bash
   pm2 status
   pm2 logs georgia-connects-api
   ```

### Step 6: Configure Firewall

```bash
# Allow HTTP and HTTPS
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw allow 3000  # Backend API (if needed)
ufw enable
```

### Step 7: Setup SSL (Optional)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate (if you have a domain)
certbot --nginx -d your-domain.com
```

## Database Setup

1. **Run migrations**

   ```bash
   npm run migrate
   ```

2. **Seed database (if needed)**
   ```bash
   npm run seed
   ```

## Monitoring

- **PM2 Monitoring**: `pm2 monit`
- **Logs**: `pm2 logs georgia-connects-api`
- **Restart**: `pm2 restart georgia-connects-api`

## Troubleshooting

- **Check if Redis is running**: `systemctl status redis-server`
- **Check if backend is running**: `pm2 status`
- **Check logs**: `pm2 logs georgia-connects-api`
- **Test API**: `curl http://localhost:3000/health`
