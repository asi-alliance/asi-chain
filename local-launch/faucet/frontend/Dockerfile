FROM node:20-alpine

WORKDIR /app

# Install git
RUN apk add --no-cache git

# Clone only web part
RUN git clone https://github.com/asi-alliance/asi-chain-faucet.git \
    && cd asi-chain-faucet/web \
    && mv * /app \
    && rm -rf /app/asi-chain-faucet

# Install dependencies
RUN npm install

# Vite dev port
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
