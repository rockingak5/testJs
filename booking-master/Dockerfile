FROM node:16.20.0-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .

COPY ./docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
ENTRYPOINT [ "./docker-entrypoint.sh" ]

EXPOSE 3500

RUN npm run build
VOLUME ["/app/public"]

CMD npm run start

