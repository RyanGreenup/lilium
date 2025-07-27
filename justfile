set shell := ["zsh", "-cu"]
set dotenv-load

init:
    pnpm install
    python ./scripts/make_db.py

run:
    mkdir -p .data && \
    npm run dev -- --host

admin:
    SUDO_MODE="true" \
    just run
