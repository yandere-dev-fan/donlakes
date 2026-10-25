#!/bin/bash
# Run as root after both domain A records point to this server.
set -euo pipefail
server_dir=$(cd -- "$(dirname -- "$0")" && pwd)
python3 - <<'PY'
import json, urllib.request, sys
for hostname in ['donozera.ru', 'www.donozera.ru']:
    for record in ['A', 'AAAA']:
        req=urllib.request.Request('https://cloudflare-dns.com/dns-query?name='+hostname+'&type='+record, headers={'accept':'application/dns-json'})
        with urllib.request.urlopen(req,timeout=15) as response: data=json.load(response)
        answers={r['data'] for r in data.get('Answer',[]) if r['type']==(1 if record=='A' else 28)}
        if record=='A' and answers!={'135.106.164.41'}:
            sys.exit(f'DNS not ready: {hostname} A = {answers}; expected 135.106.164.41')
        if record=='AAAA' and answers:
            sys.exit(f'Unexpected IPv6 record for {hostname}: {answers}; configure IPv6 before issuing certificate')
print('Public DNS is ready.')
PY
install -d -m 755 /var/www/letsencrypt
install -m 644 "$server_dir/site.conf" /etc/nginx/snippets/donozera-site.conf
# Keep an already active HTTPS configuration during renewals or retries.
if ! test -f /etc/letsencrypt/live/donozera.ru/fullchain.pem; then
    install -m 644 "$server_dir/nginx-bootstrap.conf" /etc/nginx/sites-available/donozera
    nginx -t
    systemctl reload nginx
fi
certbot certonly --non-interactive --agree-tos --register-unsafely-without-email --webroot -w /var/www/letsencrypt --cert-name donozera.ru -d donozera.ru -d www.donozera.ru --keep-until-expiring
install -m 644 "$server_dir/nginx.conf" /etc/nginx/sites-available/donozera
nginx -t
systemctl reload nginx
install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/donozera-nginx <<'HOOK'
#!/bin/sh
set -eu
/usr/sbin/nginx -t
/usr/bin/systemctl reload nginx
HOOK
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/donozera-nginx
systemctl enable --now certbot.timer
curl --fail --silent --show-error --retry 3 --retry-delay 1 --resolve donozera.ru:443:127.0.0.1 https://donozera.ru/healthz
