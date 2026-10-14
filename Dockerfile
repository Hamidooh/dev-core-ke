FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev || true

COPY . .

EXPOSE 3000

ENV PORT=3000

CMD ["node", "--experimental-sqlite", "server.js"]
