set dotenv-load
dev:
    # Requires SESSION_SECRET in .env file
    mkdir -p .data && \
    npm run dev -- --host

run_build:
    # Requires SESSION_SECRET in .env file
    mkdir -p .data && \
    PORT=30847 node .output/server/index.mjs

build:
    mkdir -p .data && \
    npm install && \
    npm run build && \
    PORT=3000 node .output/server/index.mjs

admin:
    SUDO_MODE="true" \
    just dev


dir := "fuse_notes"
fuse:
    @echo {{dir}}
    doas umount -l {{dir}} || true
    cp -r .data .data.bak.$(date +%s)
    @echo mount on local machine with 'sshfs -o Cipher=none   -o compression=no user@vidar:/media/Applications/Javascript/lilium/{{dir}} {{dir}}'
    lilium_fuse .data/notes.sqlite {{dir}}
