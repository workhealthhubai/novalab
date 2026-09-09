#!/bin/bash
# Runs once when the PostgreSQL data volume is first initialised.
# Creates a dedicated database + role for the Orthanc index so that the PACS
# never shares the application schema or credentials.
set -euo pipefail

: "${ORTHANC_DB_NAME:=orthanc}"
: "${ORTHANC_DB_USER:=orthanc}"
: "${ORTHANC_DB_PASSWORD:?ORTHANC_DB_PASSWORD must be set}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE ROLE "${ORTHANC_DB_USER}" WITH LOGIN PASSWORD '${ORTHANC_DB_PASSWORD}';
  CREATE DATABASE "${ORTHANC_DB_NAME}" OWNER "${ORTHANC_DB_USER}";
  -- Orthanc must not be able to reach the application database and vice versa.
  REVOKE ALL ON DATABASE "${ORTHANC_DB_NAME}" FROM PUBLIC;
  REVOKE ALL ON DATABASE "${POSTGRES_DB}" FROM PUBLIC;
  GRANT ALL PRIVILEGES ON DATABASE "${ORTHANC_DB_NAME}" TO "${ORTHANC_DB_USER}";
EOSQL

echo "Orthanc database '${ORTHANC_DB_NAME}' and role '${ORTHANC_DB_USER}' created."
