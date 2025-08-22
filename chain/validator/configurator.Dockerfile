FROM node:24-alpine

WORKDIR /home/node

COPY ./wallet-generator ./wallet-generator
COPY ./chain/validator/scripts/configure.sh ./configure.sh

RUN ["apk", "add", "--no-cache", "curl"]
RUN ["npm", "--prefix", "wallet-generator", "install"]

CMD ["sh", "configure.sh"]
