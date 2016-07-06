FROM node:argon

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY . /usr/src/app

EXPOSE 6969
CMD [ "npm", "start" ]

