#!/bin/bash
set -euo pipefail

if [ ! -f /opt/elasticbeanstalk/deployment/env ]; then
  echo "Missing /opt/elasticbeanstalk/deployment/env"
  exit 1
fi

set -a
. /opt/elasticbeanstalk/deployment/env
set +a

if [ -z "${DOMAIN_NAME:-}" ]; then
  echo "DOMAIN_NAME is required"
  exit 1
fi

CERT_PATH="/etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem"
KEY_PATH="/etc/letsencrypt/live/${DOMAIN_NAME}/privkey.pem"
APP_PROXY_PORT="${APP_PORT:-8080}"

if [ ! -f "$CERT_PATH" ] || [ ! -f "$KEY_PATH" ]; then
  echo "Certificate files are missing for ${DOMAIN_NAME}"
  exit 1
fi

cat > /etc/nginx/conf.d/https-letsencrypt.conf <<EOF
server {
    listen 443 ssl;
    server_name _;

    ssl_certificate ${CERT_PATH};
    ssl_certificate_key ${KEY_PATH};

    ssl_session_timeout 5m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_pass http://127.0.0.1:${APP_PROXY_PORT};
    }
}

server {
    listen 80;
    server_name _;
    return 301 https://\$host\$request_uri;
}
EOF

nginx -t
systemctl reload nginx
