# Deploying TARA to the Oracle server

Push to `deploy/oracle-setup` -> GitHub Actions builds two images (api, web), pushes them
to GHCR, then SSHes to the server and runs `docker compose pull && up -d`.

One-time setup:
1. Server: `/opt/tara/.env` from `deploy/env.example` (real secrets, never committed).
2. Server: add the CI public key to `~/.ssh/authorized_keys`.
3. GitHub repo secrets: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`.

Server: `aegis0212.duckdns.org` (Caddy handles HTTPS; the Caddyfile is baked into the web image).
