#!/bin/bash
# One installation job, not a periodic certificate request. Poll DNS only;
# attempt ACME once when both public resolvers agree on the intended address.
set -euo pipefail
server_dir=$(cd -- "$(dirname -- "$0")" && pwd)
for ((attempt=1; attempt<=1440; attempt++)); do
    if "$server_dir/enable-domain.sh" --check-dns; then
        exec "$server_dir/enable-domain.sh"
    fi
    sleep 60
done
echo 'DNS did not propagate within the installation window.' >&2
exit 1
