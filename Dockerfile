# Multi-stage: build admin SPA (needs devDependencies), then run with production deps only.
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Same gates as CI — blocks broken TypeScript / tests from reaching production images.
RUN npm run launch:check

FROM node:20-alpine
RUN apk add --no-cache ffmpeg python3 py3-pip bash curl \
  && pip3 install --break-system-packages yt-dlp \
  && ln -sf "$(command -v yt-dlp)" /usr/local/bin/yt-dlp \
  && yt-dlp --version && ffmpeg -version | head -n1

ENV YT_DLP_PATH=/usr/local/bin/yt-dlp
ENV FFMPEG_PATH=/usr/bin/ffmpeg

WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
COPY --from=builder /app/dist-admin ./dist-admin
EXPOSE 3000
CMD ["node", "server.js"]
