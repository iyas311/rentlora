#!/bin/sh
set -e

# The baked-in /etc/nginx/nginx.conf serves the SPA only; in Kubernetes the edge
# gateway (kgateway / ingress) routes /api/* to backend services.
#
# For local docker-compose there is no gateway, so when FRONTEND_MODE=local we
# generate a config that proxies /api/* directly to the service containers. The
# config is written to /tmp and passed via -c so it works as the non-root user.
if [ "$FRONTEND_MODE" = "local" ]; then
  echo "FRONTEND_MODE=local — enabling per-service /api proxy for docker-compose"
  cat << 'EOF' > /tmp/nginx.conf
pid /tmp/nginx.pid;
events {}
http {
  client_body_temp_path /tmp/client_temp;
  proxy_temp_path /tmp/proxy_temp;
  fastcgi_temp_path /tmp/fastcgi_temp;
  uwsgi_temp_path /tmp/uwsgi_temp;
  scgi_temp_path /tmp/scgi_temp;
  resolver 127.0.0.11 valid=5s;
  include /etc/nginx/mime.types;
  server {
    listen 8080;
    client_max_body_size 50M;
    root /usr/share/nginx/html;
    index index.html;

    location / { try_files $uri $uri/ /index.html; }

    location /api/properties { proxy_pass http://property-service:8001; }
    location /api/search/ai  { proxy_pass http://ai-search-service:8005; }
    location /api/search     { proxy_pass http://property-service:8001; }
    location /api/reviews    { proxy_pass http://property-service:8001; }
    location /api/auth       { proxy_pass http://booking-service:8002; }
    location /api/users      { proxy_pass http://booking-service:8002; }
    location /api/bookings   { proxy_pass http://booking-service:8002; }
    location /api/ai         { proxy_pass http://ai-service:8003; }
    location /api/admin      { proxy_pass http://admin-service:8004; }
    location /uploads        { proxy_pass http://property-service:8001; }
  }
}
EOF
  echo "Starting Nginx..."
  exec nginx -c /tmp/nginx.conf -g 'daemon off;'
else
  echo "Serving SPA only (edge gateway routes /api/*)"
  echo "Starting Nginx..."
  exec nginx -c /etc/nginx/nginx.conf -g 'daemon off;'
fi
