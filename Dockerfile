# Build stage
FROM node:latest AS builder

WORKDIR /app
ENV NODE_ENV=production

# Copy package files first
COPY package.json package-lock.json* pnpm-lock.yaml* bun.lock* .npmrc* ./

# Ensure @sveltejs/adapter-node is installed and update config
RUN if ! grep -q "@sveltejs/adapter-node" package.json; then \
    npm install -D @sveltejs/adapter-node; \
    fi

# Install dependencies
RUN npm ci || npm install

# Copy remaining files
COPY . .

# Update svelte.config.js to use Node adapter
RUN if grep -q "@sveltejs/adapter-" svelte.config.js; then \
    sed -i 's/@sveltejs\/adapter-[a-zA-Z0-9-]\+/@sveltejs\/adapter-node/g' svelte.config.js; \
    fi

# Build the application
RUN npm run build

# Production stage
FROM node:latest

WORKDIR /app

# Copy only what is needed to run the built app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules

# Install curl for healthcheck (Debian/Ubuntu-based official Node image)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV PROTOCOL_HEADER=x-forwarded-proto
ENV HOST_HEADER=x-forwarded-host

EXPOSE 3000/tcp

# Optional: drop privileges if you add a non-root user
# RUN useradd -m nodeuser
# USER nodeuser

# Healthcheck with longer timeouts for SvelteKit startup
HEALTHCHECK --interval=15s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Run the SvelteKit Node adapter output
CMD ["node", "build"]
