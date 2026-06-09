FROM node:18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD /bin/sh -c "sed -i s/REPLACE_WITH_ALB_DNS/$INT_ALB_DNS/g /etc/nginx/nginx.conf && nginx -g 'daemon off;'"
