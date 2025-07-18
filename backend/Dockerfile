FROM node:20.12.0-alpine3.19

WORKDIR /app

COPY package.json .

COPY . .

RUN npm install

EXPOSE 5000

ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

RUN npm run db:generate

RUN npm run build

CMD ["npm", "run", "start"]


