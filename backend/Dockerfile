FROM node:18-slim

WORKDIR /app

COPY package.json .

COPY . .

RUN npm install

EXPOSE 5000

ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

RUN npm run db:generate

RUN npm run build

CMD ["npm", "run", "start"]


