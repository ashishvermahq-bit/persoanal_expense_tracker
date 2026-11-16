#!/bin/sh
# Dump the paisa database to deploy/backups/paisa-YYYY-MM-DD.archive.gz and keep 14 days.
# Run daily from root's crontab, e.g.:
#   15 2 * * * /opt/paisa/deploy/backup.sh >> /var/log/paisa-backup.log 2>&1
# Restore one (replaces the current data):
#   docker compose exec -T mongo sh -c 'mongorestore -u root -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --archive --gzip --drop' < backups/paisa-2026-11-16.archive.gz
set -eu
cd "$(dirname "$0")"
mkdir -p backups
chmod 700 backups
out="backups/paisa-$(date +%F).archive.gz"
docker compose exec -T mongo sh -c 'mongodump -u root -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db paisa --archive --gzip --quiet' > "$out.tmp"
mv "$out.tmp" "$out"
find backups -name 'paisa-*.archive.gz' -mtime +14 -delete
echo "$(date -Is) backup ok: $out ($(du -h "$out" | cut -f1))"
