# ASI-Chain Explorer Dockerfile
# Multi-stage build for production optimization

# Stage 1: Build the React application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies needed for build)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Set build-time environment variables (AWS Lightsail production server)
ENV REACT_APP_GRAPHQL_URL=http://184.73.0.34:8080/v1/graphql
ENV REACT_APP_GRAPHQL_WS_URL=ws://184.73.0.34:8080/v1/graphql
ENV REACT_APP_INDEXER_API_URL=http://184.73.0.34:9090
ENV REACT_APP_HASURA_ADMIN_SECRET=myadminsecretkey
ENV REACT_APP_ENVIRONMENT=production
ENV REACT_APP_API_TIMEOUT=30000
ENV REACT_APP_NETWORK_NAME="ASI Chain"
ENV REACT_APP_NETWORK_ID=asi-mainnet
ENV REACT_APP_ENABLE_WEBSOCKETS=true
ENV REACT_APP_ENABLE_POLLING=true
ENV REACT_APP_POLLING_INTERVAL=5000

# Build the React application for production
RUN npm run build

# Stage 2: Serve the application with nginx
FROM nginx:alpine AS production

# Copy custom nginx configuration
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy environment configuration script
COPY --from=builder /app/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]

# Stage 3: Development mode (optional)
FROM node:18-alpine AS development

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies including dev dependencies
RUN npm install

# Copy source code
COPY . .

# Expose development port
EXPOSE 3000

# Start development server
CMD ["npm", "start"]