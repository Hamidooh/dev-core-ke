FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
COPY . .

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"]
