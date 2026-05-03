# Multi-stage: build admin SPA (needs devDependencies), then run with production deps only.
FROM node:20-alpine AS builder
# youtube-dl-exec preinstall requires python3>=3.9 on PATH; plain node:20-alpine has none.
RUN apk add --no-cache python3 \
  && ln -sf "$(command -v python3)" /usr/local/bin/python
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Same gates as CI — blocks broken TypeScript / tests from reaching production images.
RUN npm run launch:check

FROM node:20-alpine
RUN apk add --no-cache ffmpeg python3 py3-pip bash curl \
  && ln -sf "$(command -v python3)" /usr/local/bin/python \
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
