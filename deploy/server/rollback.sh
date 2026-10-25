#!/bin/bash
set -euo pipefail
exec 9>/var/lib/donozera/publish.lock
flock -n 9 || { echo 'Publication is running'; exit 1; }
previous=$(readlink -f /var/www/donozera/previous)
test -f "$previous/index.html"
current=$(readlink -f /var/www/donozera/current)
ln -s "$previous" /var/www/donozera/rollback-next
mv -Tf /var/www/donozera/rollback-next /var/www/donozera/current
ln -s "$current" /var/www/donozera/previous-next
mv -Tf /var/www/donozera/previous-next /var/www/donozera/previous
node --input-type=module -e 'import fs from "node:fs"; fs.writeFileSync("/var/lib/donozera/status.json.tmp",JSON.stringify({running:false,error:null,publishedAt:new Date().toISOString(),release:"rollback"}));fs.renameSync("/var/lib/donozera/status.json.tmp","/var/lib/donozera/status.json");'
curl -fsS http://127.0.0.1/healthz
