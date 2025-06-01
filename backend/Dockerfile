FROM node:20.12.0-alpine3.19

WORKDIR /app

COPY package.json .

COPY . .

RUN npm install

EXPOSE 5000

RUN npm run build

CMD ["npm", "run", "start"]


