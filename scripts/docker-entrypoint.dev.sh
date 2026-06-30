#!/bin/sh
set -e

echo "Waiting for MongoDB..."
until nc -z mongo 27017; do
  sleep 1
done
echo "MongoDB ready."

echo "Seeding sample data..."
npm run seed:sample

echo "Starting dev server..."
exec npm run dev:docker
