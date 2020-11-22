FROM alpine:3.12
WORKDIR /usr/src/app
COPY . .
RUN apk add --no-cache postgresql nodejs npm
RUN npm install
RUN su postgres -c "initdb /var/lib/postgresql/data"
RUN mkdir /run/postgresql
RUN chown postgres:postgres /run/postgresql
RUN su postgres -c "postgres -D /var/lib/postgresql/data" & \
    sleep 3; \
    su postgres -c "createuser root"; \
    su postgres -c "createdb infinite-go"
EXPOSE 3000
CMD su postgres -c "postgres -D /var/lib/postgresql/data" & \
    sleep 10; \
    node index.js
