# ===================================
# LinkedEye-FinSpot Frontend Dockerfile
# Production-ready multi-stage build
# ===================================

# Build arguments
ARG NODE_VERSION=20
ARG NGINX_VERSION=1.25
ARG ALPINE_VERSION=3.19

# Stage 1: Dependencies
FROM node:${NODE_VERSION}-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Use npm install if package-lock.json doesn't exist, otherwise use npm ci
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi && npm cache clean --force

# Stage 2: Build
FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /app

# Build arguments for Vite
# Use empty string to let api.ts use relative /api path (works with nginx proxy)
ARG VITE_API_URL=
ARG VITE_APP_NAME=LinkedEye-FinSpot
ARG VITE_APP_VERSION=1.0.0

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL \
    VITE_APP_NAME=$VITE_APP_NAME \
    VITE_APP_VERSION=$VITE_APP_VERSION

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy package files
COPY package*.json ./

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 3: Production with Nginx
FROM nginx:${NGINX_VERSION}-alpine AS production

# Build-time arguments
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=1.0.0

# OCI Image Labels
LABEL org.opencontainers.image.title="LinkedEye-FinSpot Frontend" \
      org.opencontainers.image.description="LinkedEye-FinSpot ITSM Platform Frontend" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.vendor="FinSpot Technologies" \
      org.opencontainers.image.source="https://github.com/finspot/linkedeye-finspot" \
      org.opencontainers.image.licenses="MIT"

# Install security updates
RUN apk --no-cache upgrade && \
    apk add --no-cache \
    # Health check tool
    wget && \
    rm -rf /var/cache/apk/*

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/*

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user and set permissions
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S nginx-user -u 1001 -G nginx-user && \
    # Set ownership
    chown -R nginx-user:nginx-user /usr/share/nginx/html && \
    chown -R nginx-user:nginx-user /var/cache/nginx && \
    chown -R nginx-user:nginx-user /var/log/nginx && \
    # Create required directories for non-root nginx
    mkdir -p /var/run/nginx && \
    chown -R nginx-user:nginx-user /var/run/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx-user:nginx-user /var/run/nginx.pid && \
    # Fix permissions for nginx temp directories
    mkdir -p /tmp/nginx && \
    chown -R nginx-user:nginx-user /tmp/nginx

# Copy nginx config that works with non-root user
COPY --chown=nginx-user:nginx-user nginx.conf /etc/nginx/conf.d/default.conf

# Expose port (non-privileged port for non-root)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Switch to non-root user
USER nginx-user

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
