FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL=/api
ARG VITE_PRYMEIRA_HUB_URL=https://hub.prymeiradigital.com.br
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_PRYMEIRA_HUB_URL=$VITE_PRYMEIRA_HUB_URL

COPY package*.json ./
COPY apps/backend/package*.json apps/backend/
COPY apps/frontend/package*.json apps/frontend/
RUN npm ci

COPY apps/frontend ./apps/frontend
RUN npm --workspace apps/frontend run build

FROM nginx:1.27-alpine

COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/frontend/docker-entrypoint.d/40-prymeira-runtime-config.sh /docker-entrypoint.d/40-prymeira-runtime-config.sh
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
RUN chmod +x /docker-entrypoint.d/40-prymeira-runtime-config.sh

EXPOSE 80
