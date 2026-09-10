#!/bin/sh
set -e

if [ -n "${DB_HOST:-}" ]; then
  DATABASE_URL="$(node -e "
const { DB_USER: u, DB_PASSWORD: p, DB_HOST: h, DB_PORT: port, DB_NAME: db, NODE_ENV: env } = process.env;
if (!u || !p || !h || !port || !db) process.exit(1);
const ssl = env === 'production' ? '&sslmode=require' : '';
console.log(
  'postgresql://' +
    encodeURIComponent(u) + ':' + encodeURIComponent(p) +
    '@' + h + ':' + port + '/' + db +
    '?schema=public' + ssl
);
")"
  export DATABASE_URL
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set" >&2
  exit 1
fi

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting API..."
exec node dist/index.js
