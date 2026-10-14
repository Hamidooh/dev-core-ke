FROM node:22-alpine

WORKDIR /app

COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "node --experimental-sqlite server.js || node server.js"]
