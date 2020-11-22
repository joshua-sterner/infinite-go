FROM alpine:3.12
WORKDIR /usr/src/app
COPY . .
RUN apk add --no-cache nodejs npm
RUN npm install
EXPOSE 3000
CMD node index.js
