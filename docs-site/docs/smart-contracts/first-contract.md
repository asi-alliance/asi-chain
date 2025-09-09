---
sidebar_position: 1
---

# Your First Contract

Deploy your first smart contract on ASI Chain.

## Simple Token Contract
```rholang
new token in {
  contract token(@"balance", @address, return) = {
    return!(100)
  }
}
```

## Deploy
```bash
./rust-client/target/release/node_cli deploy -f contract.rho
```