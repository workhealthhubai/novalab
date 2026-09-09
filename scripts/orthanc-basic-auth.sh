#!/usr/bin/env bash
# Prints the base64 value Nginx needs to authenticate against Orthanc.
# Usage: ./scripts/orthanc-basic-auth.sh [username] [password]
#   or:  ORTHANC_USERNAME=... ORTHANC_PASSWORD=... ./scripts/orthanc-basic-auth.sh
set -euo pipefail
user="${1:-${ORTHANC_USERNAME:-orthanc}}"
pass="${2:-${ORTHANC_PASSWORD:-}}"
if [[ -z "$pass" ]]; then
  echo "Password required (argument 2 or ORTHANC_PASSWORD)" >&2
  exit 1
fi
printf '%s:%s' "$user" "$pass" | base64 | tr -d '\n'
echo
