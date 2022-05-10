FROM node:16-alpine

RUN apk update
RUN apk add --no-cache p7zip

RUN mkdir /tmp/chorus-plus
RUN mkdir /var/log/chorus-plus
RUN mkdir /var/opt/chorus-plus

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

VOLUME [ "/var/log/chorus-plus", "/var/opt/chorus-plus" ]

EXPOSE 80
CMD [ "npm", "start" ]