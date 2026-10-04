# Pinned to the host's Node/npm so `npm ci` accepts lockfiles generated locally. Bump both together.
FROM node:24.11.1-slim

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

CMD ["npm", "run", "dev"]