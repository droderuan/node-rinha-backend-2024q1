FROM node:20-bookworm

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY . ./

EXPOSE 3333
