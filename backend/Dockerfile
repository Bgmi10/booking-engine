FROM node:18-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl

COPY package*.json ./
RUN npm install

COPY . .

ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

RUN npm run db:generate

RUN npm run build

EXPOSE 5000
CMD ["npm", "start"]
