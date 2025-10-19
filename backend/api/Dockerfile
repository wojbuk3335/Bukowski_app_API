# 🐳 DOCKER PRODUCTION SETUP

# Dockerfile dla backend
FROM node:18-alpine

# Stwórz non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S bukowski -u 1001

# Working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application
COPY . .
RUN chown -R bukowski:nodejs /app

# Switch to non-root user
USER bukowski

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start application
CMD ["node", "app/app.js"]