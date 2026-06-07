# Deployment Guide for Linux Server

This project contains a React frontend (`frontend/`) and a Node/Express backend (`backend/`). The backend uses SQLite and stores uploaded files under `backend/uploads/`.

## Prerequisites

- Linux server with SSH access
- Node.js 18+ and npm installed
- Git installed
- Optional: `nginx` for serving frontend and proxying API requests
- Optional: `pm2` or `systemd` for backend process management

## Recommended Deployment Architecture

- Build the frontend and serve the static `dist/` output with `nginx`
- Run the backend as a separate Node process on `localhost:5000`
- Configure `nginx` to proxy `/api` to the backend

## 1. Clone the repository

```bash
cd /var/www
git clone <your-repo-url> tex_invoice
cd tex_invoice
```

## 2. Install dependencies

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd ../frontend
npm install
```

## 3. Configure environment variables

Create `backend/.env` with at least:

```env
PORT=5000
JWT_SECRET=your-production-jwt-secret
```

- `PORT` is the backend port (default is `5000` if not set)
- `JWT_SECRET` should be a secure random string for JWT signing

## 4. Build the frontend

```bash
cd frontend
npm run build
```

This creates the production frontend assets under `frontend/dist/`.

## 5. Run the backend

The backend can be started manually or with a process manager.

### Manual start

```bash
cd backend
npm start
```

### Using `pm2`

```bash
npm install -g pm2
cd backend
pm start --name tex_invoice_backend
pm save
pm startup
```

### Using `systemd`

Create a unit file at `/etc/systemd/system/tex_invoice_backend.service`:

```ini
[Unit]
Description=Tex Invoice Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/tex_invoice/backend
ExecStart=/usr/bin/node server.js
Restart=always
Environment=PORT=5000
Environment=JWT_SECRET=your-production-jwt-secret
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

Then enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable tex_invoice_backend
sudo systemctl start tex_invoice_backend
```

## 6. Configure `nginx`

Use `nginx` to serve the frontend and proxy API calls.

Example `nginx` server block:

```nginx
server {
  listen 80;
  server_name your-domain.com;

  root /var/www/tex_invoice/frontend/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection keep-alive;
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /uploads/ {
    proxy_pass http://127.0.0.1:5000/uploads/;
  }
}
```

Reload `nginx` after changes:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 7. Deploy with Docker

This repository also supports a Docker-based deployment from the project root.

Build the image:

```bash
docker build -t tex_invoice:latest .
```

Run the container:

```bash
docker run -d \
  -p 5000:5000 \
  -v /var/www/tex_invoice/backend/uploads:/app/uploads \
  -v /var/www/tex_invoice/backend/db:/app/db \
  --name tex_invoice_app \
  tex_invoice:latest
```

If you want to pass a custom JWT secret:

```bash
docker run -d \
  -p 5000:5000 \
  -v /var/www/tex_invoice/backend/uploads:/app/uploads \
  -v /var/www/tex_invoice/backend/db:/app/db \
  -e JWT_SECRET=your-production-jwt-secret \
  --name tex_invoice_app \
  tex_invoice:latest
```

The app will serve the frontend and backend from the same container on port `5000`.

## 8. Verify the app

- Browse `http://your-domain.com`
- Confirm the frontend loads
- Confirm API requests to `/api/*` succeed
- Confirm uploaded files are accessible via `/uploads/*`

## 8. Notes and maintenance

- The backend automatically creates `backend/db/database.sqlite` and `backend/uploads/` when started.
- Use a strong `JWT_SECRET` in production.
- If you want the backend to also serve the built frontend, add Express static middleware in `backend/server.js` and point it to `../frontend/dist`.
- For production, consider using `pm2`, `systemd`, or Docker for better reliability.

## Troubleshooting

- If the frontend shows a blank page, check `nginx` config and ensure `try_files $uri $uri/ /index.html;` is present.
- If API calls fail, make sure the backend is running and `nginx` proxy is configured correctly.
- Check backend logs for errors in `backend/server.js`.
