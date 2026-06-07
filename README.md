# TEX Invoice - Billing Web Application

A full-stack invoicing application built with React (frontend) and Node.js/Express (backend) using SQLite for data storage.

## 📚 Documentation

- **[README.md](README.md)** ← Start here (this file)
- **[DOCKER_SETUP.md](DOCKER_SETUP.md)** - Post-Docker setup & troubleshooting
- **[DOCFILE.md](DOCFILE.md)** - Advanced Linux deployment with nginx & systemd
- **[.gitignore](.gitignore)** - Git configuration
- **[Dockerfile](Dockerfile)** - Docker image definition

## Quick Start

### Prerequisites

- **Docker** (recommended for deployment)
- **Node.js 18+** and npm (for local development)
- **Git**

## Installation & Deployment

### Option 1: Docker (Recommended for Production)

#### Install Docker

**Windows:**
1. Download [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
2. Run the installer and follow the setup wizard
3. Restart your computer
4. Verify installation: `docker --version`

**macOS:**
1. Download [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop)
2. Run the installer and drag Docker to Applications
3. Launch Docker from Applications
4. Verify installation: `docker --version`

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo systemctl start docker
sudo usermod -aG docker $USER
docker --version
```

**Linux (CentOS/RHEL):**
```bash
sudo yum install -y docker
sudo systemctl start docker
sudo usermod -aG docker $USER
docker --version
```

#### Build and Run with Docker

From the project root:

```bash
# Build the Docker image
docker build -t tex_invoice:latest .

# Run the container
docker run -d \
  -p 5000:5000 \
  -v tex_invoice_uploads:/app/uploads \
  -v tex_invoice_db:/app/db \
  -e JWT_SECRET=your-secure-jwt-secret \
  --name tex_invoice_app \
  tex_invoice:latest
```

Then access the app at `http://localhost:5000`

**With environment file:**

Create `backend/.env`:
```env
PORT=5000
JWT_SECRET=your-production-jwt-secret
```

Then run:
```bash
docker run -d \
  -p 5000:5000 \
  -v tex_invoice_uploads:/app/uploads \
  -v tex_invoice_db:/app/db \
  --env-file backend/.env \
  --name tex_invoice_app \
  tex_invoice:latest
```

#### Docker Compose (Optional)

Create `docker-compose.yml` in the project root:

```yaml
version: '3.9'
services:
  app:
    build:
      context: .
    container_name: tex_invoice_app
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      PORT: 5000
      JWT_SECRET: ${JWT_SECRET:-your-default-jwt-secret}
    volumes:
      - tex_invoice_uploads:/app/uploads
      - tex_invoice_db:/app/db
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:5000/api/auth/me', {headers: {'Authorization': 'Bearer health'}}, (r) => {if (r.statusCode !== 401 && r.statusCode !== 200) throw new Error(r.statusCode)})"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

volumes:
  tex_invoice_uploads:
  tex_invoice_db:
```

Then run:
```bash
docker-compose up -d
```

**After Docker starts, see [DOCKER_SETUP.md](DOCKER_SETUP.md) for:**
- Verifying the container is healthy
- Default login credentials
- Backing up data
- Troubleshooting common issues
- Performance monitoring
- Production setup tips

### Option 2: Local Development

#### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd tex_invoice

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

#### 2. Configure Environment

Create `backend/.env`:
```env
PORT=5000
JWT_SECRET=your-development-jwt-secret
```

#### 3. Start Development

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

The backend runs on `http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The frontend runs on `http://localhost:5173` with API proxy to backend

#### 4. Build for Production

```bash
# Build frontend
cd frontend
npm run build

# Output in: frontend/dist/
```

### Option 3: Linux Server Deployment (nginx + systemd)

See [DOCFILE.md](DOCFILE.md) for detailed Linux deployment instructions including:
- Server setup with nginx
- Process management with systemd
- SSL/TLS configuration
- Maintenance and troubleshooting

## Features

- 👤 **User Authentication** - Secure login with JWT tokens
- 👥 **Customer Management** - Add, edit, and delete customers
- 📄 **Invoice Management** - Create, view, and manage bills/invoices
- 📊 **Dashboard** - Visual analytics of sales and purchases
- 📤 **File Upload** - Attach images/PDFs to invoices
- 📊 **Reporting** - Daily, monthly, and yearly statistics
- 🔒 **Security** - Password hashing, JWT auth, CORS protection

## Default Credentials

Username: `admin`
Password: `admin123`

⚠️ **Change these immediately in production!**

## Database

The app uses SQLite with automatic schema creation:
- `backend/db/database.sqlite` - Database file (auto-created)
- `backend/uploads/` - Uploaded invoice files

Both directories are created automatically on first run.

## Docker Management

### View Logs
```bash
docker logs tex_invoice_app
```

### Stop Container
```bash
docker stop tex_invoice_app
```

### Start Container
```bash
docker start tex_invoice_app
```

### Remove Container
```bash
docker rm tex_invoice_app
```

### Rebuild Image
```bash
docker build -t tex_invoice:latest .
```

### View Running Containers
```bash
docker ps
```

## Troubleshooting

### Docker Issues

**Port 5000 already in use:**
```bash
# Use a different port
docker run -d -p 8000:5000 tex_invoice:latest

# Access at http://localhost:8000
```

**Permission denied while running Docker:**
```bash
# Add your user to docker group (Linux)
sudo usermod -aG docker $USER
# Log out and log back in
```

**Container exits immediately:**
```bash
# Check logs
docker logs tex_invoice_app

# Run in interactive mode to see errors
docker run -it tex_invoice:latest
```

### Application Issues

**Frontend shows blank page:**
- Clear browser cache (Ctrl+Shift+Delete)
- Check that backend is running
- Verify proxy settings in `frontend/vite.config.js`

**API errors:**
- Check backend logs: `docker logs tex_invoice_app`
- Verify JWT_SECRET is set
- Ensure port 5000 is accessible

**Database errors:**
- Check `backend/db/` directory exists and is writable
- Verify volume mounts: `docker inspect tex_invoice_app`

**File upload fails:**
- Verify `backend/uploads/` directory exists
- Check volume permissions
- Ensure file size is under 10MB

**For more Docker troubleshooting:**
- See [DOCKER_SETUP.md](DOCKER_SETUP.md) - Detailed troubleshooting guide with 15+ common issues and solutions

## API Endpoints

All endpoints require authentication (JWT token) except login/register:

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (returns JWT token)
- `GET /api/auth/me` - Get current user profile
- `GET /api/auth/logs` - Get login history

### Customers
- `GET /api/customers` - List all customers
- `POST /api/customers` - Create new customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Invoices
- `GET /api/invoices` - List invoices (with filters)
- `POST /api/invoices` - Create invoice (supports file upload)
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Dashboard
- `GET /api/dashboard` - Get statistics and charts

## Tech Stack

- **Frontend**: React 19, Vite, ESLint
- **Backend**: Node.js, Express, JWT, bcryptjs
- **Database**: SQLite3
- **File Upload**: Multer
- **Authentication**: JWT, bcryptjs
- **Containerization**: Docker

## License

Private project

## Support

For issues or questions:

- **Docker issues:** See [DOCKER_SETUP.md](DOCKER_SETUP.md) - Troubleshooting section with container health checks, permission issues, port conflicts, and more
- **Advanced deployment:** Check [DOCFILE.md](DOCFILE.md) for Linux server setup with nginx, systemd, and SSL
- **General help:** Check application logs with `docker logs tex_invoice_app`
