# Multi-stage: build admin SPA (needs devDependencies), then run with production deps only.
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:admin

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
COPY --from=builder /app/dist-admin ./dist-admin
EXPOSE 3000
CMD ["node", "server.js"]
