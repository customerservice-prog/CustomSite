# Standard Node build for Railway — avoids Nixpacks NIXPACKS_PATH / Metal builder quirks.
# Do not add Supabase or other secrets here; set them in Railway (runtime) only.
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
