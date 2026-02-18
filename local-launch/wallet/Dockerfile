FROM node:20-slim

WORKDIR /app

RUN apt update && apt install -y \
    git \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHON=/usr/bin/python3

RUN git clone https://github.com/asi-alliance/asi-chain-wallet.git \
    && cd asi-chain-wallet/ \
    && mv * /app \
    && rm -rf /app/asi-chain-wallet

RUN npm install --legacy-peer-deps

EXPOSE 3000

CMD ["npm", "start"]
