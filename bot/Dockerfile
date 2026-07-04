# slim (glibc), а не alpine — у better-sqlite3 есть готовые бинарники под glibc,
# компилятор в образе не нужен
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npx", "tsx", "src/index.ts"]
