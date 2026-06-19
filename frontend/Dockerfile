# Build stage — compile the React app
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# Runtime stage — non-root nginx (listens on 8080)
FROM nginxinc/nginx-unprivileged:alpine
# Briefly switch to root to copy assets and grant the nginx user write access to
# the config (the entrypoint rewrites it in local mode); runtime stays non-root.
USER root
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh && chown -R nginx /etc/nginx
USER nginx
EXPOSE 8080
ENTRYPOINT ["/docker-entrypoint.sh"]
