#!/usr/bin/env bash
# Prints fresh random secrets for a production .env.
set -euo pipefail
echo "JWT_ACCESS_SECRET=$(openssl rand -base64 48 | tr -d '\n')"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -d '\n')"
echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"
echo "ORTHANC_DB_PASSWORD=$(openssl rand -hex 24)"
echo "ORTHANC_PASSWORD=$(openssl rand -hex 24)"
echo "MINIO_SECRET_KEY=$(openssl rand -hex 24)"
echo "REDIS_PASSWORD=$(openssl rand -hex 24)"
