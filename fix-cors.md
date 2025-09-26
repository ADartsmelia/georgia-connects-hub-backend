# Fix CORS Configuration

## Issue
The backend is blocking requests from the frontend due to CORS policy. The frontend domain `https://squid-app-bbj3k.ondigitalocean.app` is not in the allowed origins list.

## Solution

### Step 1: Update Environment Variables on Server

SSH into your server and update the `.env.production` file:

```bash
# SSH into your server
ssh root@207.154.250.143

# Navigate to backend directory
cd /var/www/georgia-connects/backend

# Update the .env.production file
sudo nano .env.production
```

### Step 2: Add CORS Configuration

Add or update these lines in `.env.production`:

```bash
# CORS Configuration
CORS_ORIGIN=https://squid-app-bbj3k.ondigitalocean.app
ALLOWED_ORIGINS=https://squid-app-bbj3k.ondigitalocean.app
FRONTEND_URL=https://squid-app-bbj3k.ondigitalocean.app
SOCKET_CORS_ORIGIN=https://squid-app-bbj3k.ondigitalocean.app
```

### Step 3: Restart Backend Server

```bash
# Stop the current server
pm2 stop georgia-connects-api

# Clean environment file (remove comments)
grep -v "^#" .env.production | grep -v "^$" > .env.clean

# Restart with new environment variables
export $(cat .env.clean | xargs) && pm2 start ecosystem.config.cjs

# Check logs
pm2 logs georgia-connects-api --lines 10
```

### Step 4: Test CORS Fix

```bash
# Test preflight request
curl -k -X OPTIONS https://207.154.250.143/api/v1/auth/register \
  -H "Origin: https://squid-app-bbj3k.ondigitalocean.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v

# Test actual request
curl -k -X POST https://207.154.250.143/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Origin: https://squid-app-bbj3k.ondigitalocean.app" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'
```

### Step 5: Test from Frontend

Once the CORS is fixed, test your frontend application. The registration should work without CORS errors.

## Alternative: Temporary Fix for Testing

For testing purposes only, you can temporarily allow all origins:

```bash
ALLOWED_ORIGINS=*
```

**Warning:** This is not secure for production and should only be used for testing.

## Expected Result

After applying the fix, you should see:
- ✅ No CORS errors in browser console
- ✅ Registration requests working from frontend
- ✅ All API endpoints accessible from your frontend domain

