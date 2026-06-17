FROM node:20-alpine

# Install necessary packages
RUN apk add --no-cache tini

WORKDIR /app

# Copy dependency files first for better layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy the rest of the application
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Use tini as PID 1 for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

EXPOSE 3000

CMD ["node", "src/server.js"]
