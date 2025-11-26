FROM oven/bun:latest AS builder

WORKDIR /app
ENV NODE_ENV=production

# Copy package files first
COPY --link bun.lock package.json ./

# Add conditional installation of svelte-adapter-bun and update config
RUN if ! grep -q "svelte-adapter-bun" package.json; then \
    bun add -D svelte-adapter-bun; \
    fi

# Install dependencies
RUN bun install --ci

# Copy remaining files
COPY --link . .

# Update svelte.config.js to use Bun adapter
RUN if grep -q "@sveltejs/adapter-" svelte.config.js; then \
    sed -i 's/@sveltejs\/adapter-[a-zA-Z0-9-]\+/svelte-adapter-bun/g' svelte.config.js; \
    fi

# Build the application
RUN bun --bun run vite build

# Production stage
FROM oven/bun:latest

WORKDIR /app
COPY --chown=bun:bun --from=builder /app /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

ENV PORT=3000
ENV PROTOCOL_HEADER=x-forwarded-proto
ENV HOST_HEADER=x-forwarded-host
EXPOSE 3000/tcp
USER bun

# Healthcheck with longer timeouts for SvelteKit startup
HEALTHCHECK --interval=15s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

CMD ["bun", "--bun", "/app/build/index.js"]