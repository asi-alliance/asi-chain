# Multi-stage build for ASI Chain TypeScript Faucet
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY typescript-faucet/package*.json ./
COPY typescript-faucet/tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm install -D typescript @types/node

# Copy source code
COPY typescript-faucet/src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Create data directory for SQLite database
RUN mkdir -p /app/data && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

EXPOSE 5000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]