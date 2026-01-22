set dotenv-load
dev:
    # NOTE
    # echo 1024 | doas tee /proc/sys/fs/inotify/max_user_instances
    # doas sysctl fs.inotify.max_user_watches=10000000
    # Requires SESSION_SECRET in .env file
    PORT=30847 npm run dev -- --host

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

watch:
    docker compose up --watch

# dir := "$HOME/Notes/fuse_notes"
# remote-fuse:
#     @echo {{dir}}
#     doas umount -l {{dir}} || true
#     cp -r .data .data.bak.$(date +%s)
#     @echo mount on local machine with 'sshfs -o Cipher=none   -o compression=no user@vidar:/media/Applications/Javascript/lilium/{{dir}} {{dir}}'
#     lilium_fuse .data/notes.sqlite {{dir}}
#
# fuse:
#     @echo {{dir}}
#     doas umount -l {{dir}} || true
#     cp -r .data .data.bak.$(date +%s)
#     @echo mount on local machine with 'sshfs -o Cipher=none   -o compression=no user@vidar:/media/Applications/Javascript/lilium/{{dir}} {{dir}}'
#     lilium_fuse .data/notes.sqlite {{dir}}
#
check:
    # Format
    npx prettier --write src/**/*.ts
    npx prettier --write src/**/*.tsx

    # Format
    bun run typecheck







# dir := "$HOME/Notes/fuse_notes"
# NOTE WAL cannot be remount mounted
# remote-fuse:
#     @echo {{dir}}
#     doas umount -l {{dir}} || true
#     cp -r .data .data.bak.$(date +%s)
#     @echo mount on local machine with 'sshfs -o Cipher=none   -o compression=no user@vidar:/media/Applications/Javascript/lilium/{{dir}} {{dir}}'
#     lilium_fuse .data/notes.sqlite {{dir}}

dir := "$HOME/Notes/"
db := ".data/notes.sqlite"
bin := "/home/ryan/Sync/journals/2025/11/28/sqlite_fuse/target/release/fuse_example"
user_id := "84a9e6d1ba7f6fd229c4276440d43886"
fuse:
    @echo {{dir}}
    doas umount -l {{dir}} || true
    # sqlite3 .data/notes.sqlite "VACUUM INTO '.data/notes.bak.sqlite';"
    # lilium_fuse .data/notes.sqlite {{dir}}
    {{bin}} --user-id {{user_id}} {{dir}} {{db}} 

