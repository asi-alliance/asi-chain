FROM node:20-slim

WORKDIR /app

RUN apt update && apt install -y \
    git \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHON=/usr/bin/python3

RUN git clone https://github.com/asi-alliance/asi-chain-explorer.git \
    && cd asi-chain-explorer/ \
    && mv * /app \
    && rm -rf /app/asi-chain-explorer

RUN npm install --legacy-peer-deps && npm install ajv@^8.12.0 ajv-keywords@^5.1.0 --save-dev --legacy-peer-deps

EXPOSE 3000

CMD ["npm", "start"]
