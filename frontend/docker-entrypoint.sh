#!/bin/sh
set -e

if [ -z "$INT_ALB_DNS" ]; then
  echo "INT_ALB_DNS not set. Reconfiguring Nginx for local development mode..."
  cat << 'EOF' > /etc/nginx/nginx.conf
events {}
http {
  resolver 127.0.0.11 valid=5s;
  include /etc/nginx/mime.types;
  server {
    listen 80;
    client_max_body_size 50M;
    root /usr/share/nginx/html;
    index index.html;

    location / {
      try_files $uri $uri/ /index.html;
    }

    location /api/properties {
      proxy_pass http://property-service:8001;
    }

    location /api/search {
      proxy_pass http://property-service:8001;
    }

    location /api/reviews {
      proxy_pass http://property-service:8001;
    }

    location /api/auth {
      proxy_pass http://booking-service:8002;
    }

    location /api/users {
      proxy_pass http://booking-service:8002;
    }

    location /api/bookings {
      proxy_pass http://booking-service:8002;
    }

    location /api/ai {
      proxy_pass http://ai-service:8003;
    }

    location /api/admin {
      proxy_pass http://admin-service:8004;
    }

    location /api/search/ai {
      proxy_pass http://ai-search-service:8005;
    }

    location /uploads {
      proxy_pass http://property-service:8001;
    }
  }
}
EOF
else
  echo "INT_ALB_DNS is set to $INT_ALB_DNS. Running in production mode..."
  sed -i "s/REPLACE_WITH_ALB_DNS/$INT_ALB_DNS/g" /etc/nginx/nginx.conf
fi

echo "Starting Nginx..."
exec nginx -g 'daemon off;'
