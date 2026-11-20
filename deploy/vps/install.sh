#!/usr/bin/env bash
# Dari — install/update a TEST deployment on a shared VPS.
# Public on http://<server-ip>:8086 (website + API for the phone app).
# Only adds /opt/dari, the Docker stack "dari" and the nginx site "dari-ip";
# other sites on the server (e.g. Jersey, Tech Plus) are not touched.
#
#   curl -fsSL https://raw.githubusercontent.com/HaidraAboHamra/DARI/ccr-78982c29-ug2t1b/deploy/vps/install.sh | sudo bash
set -euo pipefail

PORT=${DARI_PORT:-8086}       # public port (nginx)
API_PORT=4100                 # loopback only
WEB_PORT=3100                 # loopback only
BASE=/opt/dari
REPO=https://github.com/HaidraAboHamra/DARI.git
BRANCH=${DARI_BRANCH:-ccr-78982c29-ug2t1b}
SITE=/etc/nginx/sites-available/dari-ip

[ "$(id -u)" -eq 0 ] || { echo "Run as root (sudo)."; exit 1; }
command -v nginx >/dev/null || { echo "nginx is required (it fronts the other sites on this server)."; exit 1; }

# 0 · our ports must be free (or already ours)
for p in $PORT $API_PORT $WEB_PORT; do
  if ss -ltnH "sport = :$p" | grep -q . && ! { [ -f "$SITE" ] || docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^dari-'; }; then
    echo "Port $p is already used by something else — set DARI_PORT or free it."; exit 1
  fi
done

# 1 · Docker (only if missing)
if ! command -v docker >/dev/null; then
  echo "• installing Docker"
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null

# 2 · building the web app needs ~2 GB; add swap on small servers
mem_kb=$(awk '/MemTotal|SwapTotal/ {s+=$2} END {print s}' /proc/meminfo)
if [ "$mem_kb" -lt 3000000 ] && [ ! -f /swapfile-dari ]; then
  echo "• adding 2 GB swap (/swapfile-dari)"
  fallocate -l 2G /swapfile-dari && chmod 600 /swapfile-dari && mkswap /swapfile-dari >/dev/null && swapon /swapfile-dari
  grep -q swapfile-dari /etc/fstab || echo '/swapfile-dari none swap sw 0 0' >> /etc/fstab
fi

# 3 · code
mkdir -p "$BASE"
if [ -d "$BASE/src/.git" ]; then
  git -C "$BASE/src" fetch --depth 1 origin "$BRANCH" && git -C "$BASE/src" reset --hard FETCH_HEAD
else
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$BASE/src"
fi

# 4 · configuration (created once; kept on updates)
if [ ! -f "$BASE/.env" ]; then
  IP=${DARI_PUBLIC_HOST:-$(curl -fsS4 --max-time 5 https://ifconfig.me || hostname -I | awk '{print $1}')}
  cat > "$BASE/.env" <<CONF
PUBLIC_URL=http://$IP:$PORT
POSTGRES_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
OTP_DEV_CODE=123456
API_PORT=$API_PORT
WEB_PORT=$WEB_PORT
COOKIE_SECURE=false
CONF
  chmod 600 "$BASE/.env"
fi
. "$BASE/.env"

# 5 · build and start
echo "• building and starting (first time takes several minutes)"
docker compose -p dari -f "$BASE/src/deploy/vps/docker-compose.yml" --env-file "$BASE/.env" up -d --build --remove-orphans
for i in $(seq 1 90); do
  curl -fsS "http://127.0.0.1:$API_PORT/health/ready" >/dev/null 2>&1 && break
  sleep 2
done
curl -fsS "http://127.0.0.1:$API_PORT/health/ready" && echo

# 6 · nginx: one public port → website, API, media, live stream
BACKUP=""
[ -f "$SITE" ] && BACKUP=$(mktemp) && cp -a "$SITE" "$BACKUP"
cat > "$SITE" <<NGINX
# Dari (test) — http://<ip>:$PORT → web 127.0.0.1:$WEB_PORT, API 127.0.0.1:$API_PORT
server {
    listen $PORT;
    listen [::]:$PORT;
    server_name _;
    client_max_body_size 10m;
    add_header X-Robots-Tag "noindex, nofollow" always;

    location = /api/v1/stream {            # Server-Sent Events: no buffering, long-lived
        proxy_pass http://127.0.0.1:$API_PORT;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host \$http_host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_read_timeout 1h;
    }
    location /api/v1/ { proxy_pass http://127.0.0.1:$API_PORT; proxy_set_header Host \$http_host; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; }
    location /media/  { proxy_pass http://127.0.0.1:$API_PORT; proxy_set_header Host \$http_host; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; expires 7d; }
    location = /api/stream {               # website's same-origin live stream
        proxy_pass http://127.0.0.1:$WEB_PORT;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host \$http_host;
        proxy_buffering off;
        proxy_read_timeout 1h;
    }
    location / { proxy_pass http://127.0.0.1:$WEB_PORT; proxy_set_header Host \$http_host; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; }
}
NGINX
ln -sfn "$SITE" /etc/nginx/sites-enabled/dari-ip
if nginx -t 2>/dev/null; then
  systemctl reload nginx
else
  echo "nginx config invalid — reverting the Dari site only"
  if [ -n "$BACKUP" ]; then cp -a "$BACKUP" "$SITE"; else rm -f "$SITE" /etc/nginx/sites-enabled/dari-ip; fi
  nginx -t && systemctl reload nginx
  exit 1
fi
command -v ufw >/dev/null && ufw status | grep -q "Status: active" && ufw allow "$PORT/tcp" >/dev/null || true

echo
echo "Dari is up:"
echo "  website:        $PUBLIC_URL"
echo "  phone app:      enter  ${PUBLIC_URL#http://}  as the server address"
echo "  demo logins:    0900000001 admin · 0900000002 merchant · 0900000003 courier · 0900000005 citizen — code 123456"
