# Stage 1: Build frontend assets
FROM node:20-alpine AS frontend-builder
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Build backend runtime
FROM node:20-alpine AS app

LABEL maintainer="tex-invoice"
LABEL description="TEX Invoice - Billing Web Application"

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files and install production dependencies
COPY backend/package*.json ./
RUN npm install --only=production && \
    npm cache clean --force

# Copy backend code
COPY backend/ .

# Copy built frontend from builder stage
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

# Create necessary directories with proper permissions
RUN mkdir -p db uploads && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/api/auth/me', {headers: {'Authorization': 'Bearer health'}}, (r) => {if (r.statusCode !== 401 && r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

CMD ["node", "server.js"]
