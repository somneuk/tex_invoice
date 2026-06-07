# After Docker Run - Setup Guide

## 1. Verify Container is Running

```bash
# Check if container is running
docker ps

# Check logs for any errors
docker logs tex_invoice_app

# Follow logs in real-time
docker logs -f tex_invoice_app
```

Expected output in logs:
```
Connected to SQLite database at /app/db/database.sqlite
Seeded initial admin user (username: admin, password: admin123)
Backend server running on http://localhost:5000
```

## 2. Access the Application

Open your browser and go to:
```
http://localhost:5000
```

You should see the TEX Invoice login page.

## 3. Default Login Credentials

**Username:** `admin`  
**Password:** `admin123`

⚠️ **Change these immediately for production!**

## 4. Verify Database & Uploads

Check that volumes were created and mounted:

```bash
# List Docker volumes
docker volume ls | grep tex_invoice

# Verify volume contents (Linux/macOS)
docker volume inspect tex_invoice_db
docker volume inspect tex_invoice_uploads

# On Windows with Docker Desktop, volumes are managed by Docker internally
```

## 5. Change Admin Password

After logging in as admin:

1. Click on your profile/avatar in the app
2. Select **Account Settings** or **Change Password**
3. Enter new secure password
4. Save changes

## 6. Add Your First Customer

1. Go to **Customers** section
2. Click **Add Customer**
3. Enter customer details:
   - Name (required)
   - Tax ID
   - Phone
   - Email
   - Address
4. Click **Save**

## 7. Create Your First Invoice

1. Go to **Invoices** section
2. Click **New Invoice**
3. Fill in:
   - Invoice Number
   - Type (Sale or Purchase)
   - Date
   - Customer (select from dropdown)
   - Amount
   - VAT
   - Optional: Upload receipt image (max 10MB)
4. Click **Create**

## 8. Monitor Container Health

```bash
# Check container health status
docker inspect --format='{{.State.Health.Status}}' tex_invoice_app

# Should output: healthy

# View health details
docker inspect tex_invoice_app | grep -A 10 '"Health"'
```

## 9. Backup Your Data

**SQLite Database:**
```bash
# Copy database to backup location
docker cp tex_invoice_app:/app/db/database.sqlite ./database.sqlite.backup
```

**Uploaded Files:**
```bash
# Copy uploads folder
docker cp tex_invoice_app:/app/uploads ./uploads.backup
```

Or using volumes:
```bash
# Windows/macOS (Docker Desktop manages volumes automatically)
# Linux: Volumes are typically at /var/lib/docker/volumes/

# Create a backup script
docker run --rm \
  -v tex_invoice_db:/app/db \
  -v tex_invoice_uploads:/app/uploads \
  -v $(pwd):/backup \
  alpine tar czf /backup/tex_invoice_backup.tar.gz -C /app db uploads
```

## 10. View Application Logs

```bash
# Current logs
docker logs tex_invoice_app

# Last 100 lines
docker logs --tail 100 tex_invoice_app

# Follow logs (Ctrl+C to exit)
docker logs -f tex_invoice_app

# Logs with timestamps
docker logs -t tex_invoice_app
```

## 11. Restart Container (if needed)

```bash
# Graceful restart (10 second timeout)
docker restart tex_invoice_app

# Hard restart (immediate)
docker kill tex_invoice_app
docker start tex_invoice_app

# View restart count
docker inspect tex_invoice_app | grep RestartCount
```

## 12. Access Database Directly (Advanced)

```bash
# Get shell access to container
docker exec -it tex_invoice_app sh

# Inside container - check SQLite database
cd /app/db
sqlite3 database.sqlite

# List tables
.tables

# Example queries
SELECT * FROM users;
SELECT * FROM customers;
SELECT * FROM invoices;

# Exit SQLite
.exit

# Exit container shell
exit
```

## 13. Update JWT Secret (Production)

If you need to change the JWT secret:

1. Stop the container:
```bash
docker stop tex_invoice_app
```

2. Remove the old container:
```bash
docker rm tex_invoice_app
```

3. Run new container with updated secret:
```bash
docker run -d \
  --restart=unless-stopped \
  -p 5000:5000 \
  -v tex_invoice_uploads:/app/uploads \
  -v tex_invoice_db:/app/db \
  -e JWT_SECRET=your-new-secure-secret-here \
  --name tex_invoice_app \
  tex_invoice:latest
```

⚠️ **Note:** Existing tokens will be invalidated. Users will need to log in again.

## 14. Common Issues & Solutions

### Port 5000 Already in Use

```bash
# Find what's using port 5000
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Use different port
docker run -d -p 8000:5000 tex_invoice:latest
# Access at http://localhost:8000
```

### Container Keeps Restarting

```bash
# Check logs for errors
docker logs tex_invoice_app

# Inspect container
docker inspect tex_invoice_app

# Check if volumes are properly mounted
docker inspect tex_invoice_app | grep Mounts -A 10
```

### Permission Denied (Linux)

```bash
# Add current user to docker group
sudo usermod -aG docker $USER

# Apply group changes without logging out
newgrp docker
```

### Database Locked Error

```bash
# This usually means another process is using the database
# Restart the container
docker restart tex_invoice_app

# If error persists, check file permissions
docker exec tex_invoice_app ls -la /app/db/
```

## 15. Performance Monitoring

```bash
# Check container resource usage
docker stats tex_invoice_app

# View CPU, Memory, Network I/O
# Ctrl+C to exit

# Detailed stats
docker stats --no-stream tex_invoice_app
```

## 16. Useful Commands Reference

```bash
# View container details
docker inspect tex_invoice_app

# View environment variables
docker exec tex_invoice_app env | grep -E "NODE_ENV|PORT|JWT"

# Execute command inside container
docker exec -it tex_invoice_app node -v

# View container file system
docker exec -it tex_invoice_app ls -la /app

# Check disk usage in container
docker exec tex_invoice_app du -sh /app /app/db /app/uploads

# Test API health
curl http://localhost:5000/api/auth/me

# Check if port is accessible
curl -I http://localhost:5000
```

## 17. Keep Container Updated

```bash
# Rebuild image with latest code
docker build -t tex_invoice:latest .

# Stop and remove old container
docker stop tex_invoice_app
docker rm tex_invoice_app

# Run new container
docker run -d \
  --restart=unless-stopped \
  -p 5000:5000 \
  -v tex_invoice_uploads:/app/uploads \
  -v tex_invoice_db:/app/db \
  -e JWT_SECRET=your-secret \
  --name tex_invoice_app \
  tex_invoice:latest

# Verify it's running
docker logs tex_invoice_app
```

## Next Steps

- ✅ Application is running
- ✅ Database is initialized
- ✅ Container is auto-restarting
- 📊 Start adding customers and invoices
- 🔐 Change default admin password
- 💾 Set up regular backups
- 📈 Monitor logs and performance
- 🚀 Plan production deployment

For detailed deployment info, see [README.md](README.md) and [DOCFILE.md](DOCFILE.md)
