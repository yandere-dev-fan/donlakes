#!/bin/bash
# Dedicated SSH forced command. Takes a source archive over stdin.
set -euo pipefail
export PATH=/usr/local/bin:/usr/bin:/bin
umask 022
exec 9>/var/lib/donozera/publish.lock
flock -n 9 || { echo 'Another publication is running'; exit 1; }
incoming=$(mktemp -d /opt/donozera/incoming/release-XXXXXXXX)
trap 'rm -f /var/lib/donozera/ci-running' EXIT
touch /var/lib/donozera/ci-running
tar --extract --gzip --file=- --directory="$incoming" --no-same-owner --no-same-permissions
cd "$incoming"
npm ci --no-audit --no-fund
node deploy/publish.mjs --source "$incoming"
sudo -n /usr/bin/systemctl restart donozera-admin.service
curl --fail --silent http://127.0.0.1/healthz
