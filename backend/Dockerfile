FROM node:20-alpine

WORKDIR /app

COPY package.json .

COPY package-lock.json .

COPY . .

RUN npm install

RUN npm run build

EXPOSE 5000

CMD ["npm", "run", "start"]


