FROM node:20-slim AS sdk
WORKDIR /app/asi-chain-wallet-sdk
COPY --from=sdk_source package*.json ./
RUN npm ci
COPY --from=sdk_source src/ src/
COPY --from=sdk_source tsconfig*.json rollup.config.mjs ./
RUN npm run build

FROM node:20-slim AS wallet-build
RUN apt-get update && apt-get install -y --no-install-recommends build-essential python3 pkg-config libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev libpixman-1-dev libudev-dev libusb-1.0-0-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app/asi-chain-wallet
COPY --from=sdk /app/asi-chain-wallet-sdk /app/asi-chain-wallet-sdk
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
COPY --from=infra_source local-launch/wallet/.env.local .env.local
RUN npm run build

FROM node:20-slim AS explorer-build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps && npm install ajv@^8.12.0 ajv-keywords@^5.1.0 --save-dev --legacy-peer-deps
COPY . .
COPY --from=infra_source local-launch/explorer/.env.local .env.local
RUN npm run build

FROM node:20-alpine AS faucet-build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
COPY --from=infra_source local-launch/faucet/frontend/.env.local .env.local
RUN npm run build

FROM wallet-build AS wallet
EXPOSE 3000
CMD ["npm", "start"]

FROM explorer-build AS explorer
EXPOSE 3000
CMD ["npm", "start"]

FROM faucet-build AS faucet
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
