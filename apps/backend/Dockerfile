FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY apps/backend/package*.json apps/backend/
COPY apps/frontend/package*.json apps/frontend/
RUN npm ci

COPY apps/backend ./apps/backend
RUN npm --workspace apps/backend run build

FROM node:22-alpine AS runtime

WORKDIR /app

RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont \
  && addgroup -S appgroup \
  && adduser -S appuser -G appgroup

COPY package*.json ./
COPY apps/backend/package*.json apps/backend/
RUN npm ci --omit=dev --workspace apps/backend

COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/backend/src/templates ./apps/backend/src/templates
RUN mkdir -p /app/apps/backend/data \
  && chown -R appuser:appgroup /app/apps/backend/data

ENV NODE_ENV=production
ENV PORT=4000
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

EXPOSE 4000

USER appuser

CMD ["node", "apps/backend/dist/server.js"]
