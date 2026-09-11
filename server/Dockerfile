FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only. Build tools are a fallback in case
# better-sqlite3 has no prebuilt binary for this platform, and are removed after.
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && npm ci --omit=dev \
    && apk del .build-deps

# Copy source code
COPY . .

# Database + uploads live here; mount a volume on it.
ENV DATA_DIR=/app/data
RUN mkdir -p /app/data && chown node:node /app/data
USER node

EXPOSE 3001

# Use node directly (no nodemon in production)
CMD ["node", "index.js"]
