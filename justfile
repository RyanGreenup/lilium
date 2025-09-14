set dotenv-load
dev:
    # Requires SESSION_SECRET in .env file
    mkdir -p .data && \
    npm run dev -- --host

run_build:
    # Requires SESSION_SECRET in .env file
    mkdir -p .data && \
    PORT=3010 node .output/server/index.mjs

build:
    mkdir -p .data && \
    npm install && \
    npm run build && \
    PORT=3000 node .output/server/index.mjs

admin:
    SUDO_MODE="true" \
    just dev
