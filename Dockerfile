# Build stage
FROM node:latest AS builder

WORKDIR /app

# Copy package files first
COPY package.json package-lock.json* ./

# Install all dependencies including devDependencies
RUN npm install

# Copy remaining files
COPY . .

# Ensure @sveltejs/adapter-node is installed and update svelte.config.js
RUN if ! grep -q "@sveltejs/adapter-node" package.json; then \
    npm install -D @sveltejs/adapter-node; \
    fi

RUN if grep -q "@sveltejs/adapter-" svelte.config.js; then \
    sed -i 's/@sveltejs\/adapter-[a-zA-Z0-9-]\+/@sveltejs\/adapter-node/g' svelte.config.js; \
    fi

# Build the application
RUN npm run build

# Production stage
FROM node:latest

WORKDIR /app

# Copy production files and built assets
COPY --from=builder /app/package.json ./
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV PROTOCOL_HEADER=x-forwarded-proto
ENV HOST_HEADER=x-forwarded-host

EXPOSE 3000/tcp

HEALTHCHECK --interval=15s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

CMD ["node", "build"]
