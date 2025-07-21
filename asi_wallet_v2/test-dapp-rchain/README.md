# ASI Chain Test dApp

A simple test dApp to verify WalletConnect integration with ASI Wallet.

## Features

- Connect to ASI Wallet via WalletConnect
- Send ASI Chain transactions
- Sign messages
- Get balance
- QR code generation for easy connection

## Prerequisites

- Node.js (v18.x or later)

## Configuration

Before running the dApp, you need to configure your WalletConnect Project ID.

1.  Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
2.  Open the `.env` file and add your Project ID from [WalletConnect Cloud](https://cloud.walletconnect.com).

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run the dApp**
   ```bash
   npm run dev
   ```

   The dApp will open at http://localhost:3003

## Usage

1. **Connect Wallet**
   - Click "Connect Wallet"
   - A QR code will appear
   - In ASI Wallet, click "WalletConnect" and scan the QR code
   - Or copy the URI from console and paste it manually

2. **Send Transaction**
   - Enter recipient address and amount
   - Optionally add Rholang deploy code
   - Click "Send Transaction"
   - Approve in wallet

3. **Sign Message**
   - Enter any message
   - Click "Sign Message"
   - Approve in wallet

4. **Get Balance**
   - Click "Get Balance"
   - View current balance

## Testing Flow

> Note: Make sure the ASI Wallet is running on port `3002`. You can do this by running `PORT=3002 npm start` in the wallet's root directory.

1. Start the ASI Wallet on port 3002 (see note above)
2. Start this dApp on port 3003 using `npm run dev`
3. Connect wallet using QR code
4. Test various functions

## Troubleshooting

- **Connection fails**: Ensure both apps use the same PROJECT_ID
- **QR code not showing**: Check browser console for errors
- **Transaction fails**: Verify wallet has sufficient balance
- **Methods not supported**: Ensure wallet implements all ASI Chain methods

## ASI Chain-Specific Methods

This dApp tests the following ASI Chain methods:
- `rchain_sendTransaction` - Send REV tokens or deploy contracts
- `rchain_signMessage` - Sign arbitrary messages
- `rchain_getBalance` - Get account balance

## Notes

- This is a test dApp for development purposes
- Uses ASI Chain mainnet (`rchain:01`) by default
- Also supports testnet (`rchain:testnet`)