#!/usr/bin/env bash
# Daily backup of the TARA database + uploaded/generated files.
# Runs on the server (cron). Keeps the newest 14 backups.
set -euo pipefail
cd /opt/tara
mkdir -p backups
STAMP=$(date +%F_%H%M)

# 1. Consistent copy of the SQLite DB (safe while the API is running).
docker compose exec -T api python -c "
import sqlite3
src = sqlite3.connect('/data/tara.db')
dst = sqlite3.connect('/data/backup-tmp.db')
src.backup(dst); dst.close(); src.close()"
docker compose cp api:/data/backup-tmp.db "backups/tara-$STAMP.db"
docker compose exec -T api rm -f /data/backup-tmp.db
gzip -f "backups/tara-$STAMP.db"

# 2. Uploaded files, stage outputs, model-call audit log and run logs.
docker compose exec -T api sh -c 'mkdir -p /app/uploads /app/artifacts /data/audit /data/logs && tar czf - -C /app uploads artifacts -C /data audit logs' > "backups/files-$STAMP.tgz"

# 3. Prune: keep the 14 newest of each kind.
ls -1t backups/tara-*.db.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
ls -1t backups/files-*.tgz 2>/dev/null | tail -n +15 | xargs -r rm -f
echo "$(date -Is) backup ok: $STAMP"
