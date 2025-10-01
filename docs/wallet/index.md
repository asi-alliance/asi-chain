# ASI\:Chain Wallet

## Overview

The [ASI\:Chain Wallet](http://184.73.0.34:3000) provides secure key management and transaction capabilities for the ASI\:Chain network.

This guide covers account creation, network configuration, and obtaining credentials required for validator node setup.

**Access the wallet**: [http://184.73.0.34:3000](http://184.73.0.34:3000)

## Step 1: Create or Import Your Account

1. Navigate to the [accounts page](http://184.73.0.34:3000/#/accounts)
2. **Create New Account**:

   * Follow the prompts to generate a new wallet account.
3. **Or Import Existing Account**:

   * Enter Account Name
   * Enter your 64-character hexadecimal private key
   * Click **Import Account**
   * Your account will be added to the wallet

**Note:** Keep your private key secure and never share it with anyone.

## Step 2: Configure the Network

After creating or importing your account, configure the network connection.

### Network Types

The wallet supports multiple networks:

* **Custom Network**: Configure custom RPC endpoints for ASI\:Chain testnet
* **Firefly Mainnet**: Production network (when available)
* **Firefly Testnet**: Test network for development
* **Local Network**: Local node testing

### Configure Custom Network

To connect to ASI\:Chain testnet, configure custom network settings via [Settings page](http://184.73.0.34:3000/#/settings):

#### Validator Node Connection

* **Host**: `54.175.6.183`
* **gRPC Port**: `40401`
* **HTTP Port**: `40403`
* **Direct links**:

  * gRPC: `54.175.6.183:40401`
  * HTTP: `http://54.175.6.183:40403`

#### Read-Only Node Connection

* **Host**: `54.175.6.183`
* **gRPC Port**: `40451`
* **HTTP Port**: `40453`
* **Direct links**:

  * gRPC: `54.175.6.183:40451`
  * HTTP: `http://54.175.6.183:40453`

For the full list of available nodes and their endpoints, see [Network Nodes documentation](/network-configuration/network-nodes/).

## Step 3: Generate Keys for Validator Setup

Navigate to the [key generation page](http://184.73.0.34:3000/#/keys) to create your cryptographic keys.

### Option A: Generate New Keypair

1. Click **Generate New Keypair** button
2. The system will create a completely new random keypair
3. **Critical:** Save all displayed credentials immediately:

| Credential           | Description                         | Format                                |
| -------------------- | ----------------------------------- | ------------------------------------- |
| **Private Key**      | Secret key for signing transactions | 64 hex characters                     |
| **Public Key**       | Public cryptographic key            | 130+ hex characters with '04' prefix  |
| **Ethereum Address** | ETH-compatible address              | Standard format with '0x' prefix      |
| **ASI Address**      | RChain/Firefly network address      | 50-54 characters starting with '1111' |

### Option B: Import Existing Private Key

1. Enter your 64-character hexadecimal private key
2. Click **Import** to derive public key and addresses
3. The system will generate all associated addresses from your key

### Backup Your Keys

* **Private Key**: Store securely offline - this controls your account
* **ASI Address**: Your primary address for ASI\:Chain transactions
* **Never share your private key with anyone**

## Accessing Your Account

### Account Selection

1. Navigate to the [accounts page](http://184.73.0.34:3000/#/accounts)
2. Your imported accounts appear in the dropdown menu
3. Select your account to view balance and perform transactions

### Account Display

Each account shows:

* Account name (customizable)
* Shortened address (format: `11112QPs...bNxTp1`)
* Current balance in ASI

## Using Your Wallet

### Dashboard Features

Access the wallet to use these features:

* **[Dashboard](http://184.73.0.34:3000/#/dashboard)**: View account overview and balances
* **[Send](http://184.73.0.34:3000/#/send)**: Transfer ASI tokens to other addresses
* **[Receive](http://184.73.0.34:3000/#/receive)**: Display your address for incoming transfers
* **[History](http://184.73.0.34:3000/#/history)**: Review transaction history
* **[Deploy](http://184.73.0.34:3000/#/deploy)**: Deploy smart contracts to the network
* **[IDE](http://184.73.0.34:3000/#/ide)**: Write and test Rholang code

## Validator Configuration

For validator node setup, you'll need specific credentials from your wallet:

### Required Data from Wallet

* **Private Key**: Your 64-character hex key (from key generation step)
* **Public Key**: Your full public key with '04' prefix
* **ASI Address**: Your 50-54 character address (optional, for rewards)

### Configuration Files

#### 1. Environment Variables (`.env`)

```env
VALIDATOR_PRIVATE_KEY=<YOUR-PRIVATE-KEY>
VALIDATOR_HOST=<YOUR-PUBLIC-IP-ADDRESS>
```

#### 2. Validator Configuration (`conf/validator.conf`)

```hocon
casper {
  validator-public-key = <YOUR-PUBLIC-KEY>
  validator-private-key = <YOUR-PRIVATE-KEY>
}
```

#### 3. Smart Contract Deployment

When deploying contracts, use your private key:

```bash
deploy \
    --private-key "<YOUR-PRIVATE-KEY>" \
    --phlo-limit 10000000 \
    --phlo-price 1
```

### Key Mapping Guide

| Wallet Field | Where to Use                              | Format Required                  |
| ------------ | ----------------------------------------- | -------------------------------- |
| Private Key  | `.env`, `validator.conf`, deploy commands | 64 hex characters (no 0x prefix) |
| Public Key   | `validator.conf`                          | Full key with '04' prefix        |
| ASI Address  | Receiving validator rewards               | 50-54 characters                 |

## Key Format Examples

| Key Type        | Example Format                                                          |
| --------------- | ----------------------------------------------------------------------- |
| **Private Key** | `56c37367ffdfa427a3770eabe5b6dd0791c30617eab01581deaf031ab96b317f`      |
| **Public Key**  | `040c9da4e4c62c13770f2f83c0da857658072c5294e944fdcddcdb8a71100712c2...` |
| **ETH Address** | `0x7ac3498d5ac4f0ffcc82739e49591a4b1246b273`                            |
| **ASI Address** | `11112NmdWk7LRx1zQ18Q1L4rpssja2fTSo3JPBkfsRuZcbwdahCVSM`                |

## Next Steps

After creating your wallet account:

1. Request test tokens from the [Faucet](/faucet/)
2. Configure your [Validator Node](/node-image/validator/)
3. Monitor your transactions via [Block Explorer](http://54.175.6.183:5173/)

---

**Warning:** Your private key provides complete control over your account. Loss or compromise of your private key results in permanent loss of access to funds. There is no recovery mechanism for lost keys.
