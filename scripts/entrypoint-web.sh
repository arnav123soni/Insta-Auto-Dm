#!/bin/sh
set -e

echo "==> [OpenReply] Starting Web Service..."

# Run database migrations automatically before Next.js starts
echo "==> [OpenReply] Applying database migrations..."
npx prisma migrate deploy

# Optionally seed owner user if requested or in local-owner mode
if [ "${RUN_SEED:-false}" = "true" ] || [ -n "${LOCAL_OWNER_ID:-}" ]; then
  echo "==> [OpenReply] Ensuring default workspace & owner user are seeded..."
  npx tsx prisma/seed.ts || echo "==> [OpenReply] Seed notice: User/workspace already initialized or skipped."
fi

echo "==> [OpenReply] Launching application server: $@"
exec "$@"
