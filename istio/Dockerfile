FROM node:8.11.4-alpine
RUN apk add --no-cache tzdata
ENV TZ Asia/Shanghai

ARG APP_HOME=/data/app
ENV APP_HOME $APP_HOME
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY package.json package-lock.json $APP_HOME/
RUN npm install --production
COPY . $APP_HOME

EXPOSE 3000

CMD [ "npm", "start" ]


