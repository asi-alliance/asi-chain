# ASI:Chain - Wallet Generator

This guide describes the process of creating a full set of keys for working with **ASI:Chain** nodes and CLI wallet.

Keys are created using the secp256k1 algorithm, which is supported by the **ASI:Chain** consensus algorithm.

Using this script, you generate a full set of keys:
* Address (e.g., 1111LAd2...1BPcvHftP)
* Private key (e.g., b67533f...d77cbcb)
* Public key (e.g., 0457febafcc25dd34...24c8216c94b4ae661c)

The generated key's set is cryptographically unique and secure.

The key set will be displayed once in the console after running the script. Additionally, a backup file will be created in the current directory with the filename `wallet_current-date-and-time.txt`, which you should **backup in secure storage**.

## Requirements
```
Node.js version 20 or higher
```

## Install Node.js
```
https://nodejs.org/en/download
```

#### Git clone this repo and install dependencies
```bash
git clone https://github.com/asi-alliance/asi-chain.git
```

```bash
cd asi-chain/wallet-generator
```

```bash
npm install
```

#### Run script for create private key and address
```bash
npm run generate
```

Output:

```
$ npm run generate

> asi-chain-keys-generator@1.0.0 generate
> npx ts-node walletGeneratorScript.ts

Private Key: b67533f1f99c0ecaedb7d829e430b1c0e605bda10f339f65d5567cb5bd77cbcb
Public Key: 0457febafcc25dd34ca5e5c025cd445f60e5ea6918931a54eb8c3a204f51760248090b0c757c2bdad7b8c4dca757e109f8ef64737d90712724c8216c94b4ae661c
Address: 1111LAd2PWaHsw84gxarNx99YVK2aZhCThhrPsWTV7cs1BPcvHftP
Wallet saved to: wallet_2025-07-2T13-24-58-185Z.txt
```

>[!TIP]
> Check the generated file or console output and backup all created keys


>[!CAUTION]
> If you lose your keys you will lose access to all funds and control of the validator node
