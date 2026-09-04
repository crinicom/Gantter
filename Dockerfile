# syntax=docker/dockerfile:1

# ---- Build stage: compile the SPA and assemble server deps ----
FROM node:22-slim AS builder
WORKDIR /app

# Install build toolchain needed by better-sqlite3 (native module)
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Root deps (vite, react, ...
COPY package.json package-lock.json ./
RUN npm install

# Server deps (independent lockfile)
COPY server/package.json server/package-lock.json ./server/
RUN npm ci --prefix server

# App source
COPY . .

# Build the SPA -> dist/
RUN npm run build

# ---- Runtime stage: minimal image ----
FROM node:22-slim AS runner
WORKDIR /app

# Runtime also needs to (re)build better-sqlite3 native binding
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Copy server deps + code + built SPA
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/server /app/server
COPY --from=builder /app/dist /app/dist

# Ensure server deps are present/compiled for this image
RUN npm ci --prefix server

EXPOSE 8080

CMD ["node", "server/src/index.js"]
