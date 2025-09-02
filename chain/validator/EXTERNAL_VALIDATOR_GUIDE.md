# ASI\:Chain (MettaCycle Testnet) — External Validator Setup Guide

## Introduction

Follow these instructions to connect an **external validator** to the ASI\:Chain (MettaCycle testnet). The process covers building Docker images, preparing the environment, bonding the validator, running the node, verifying synchronization, testing a manual transaction deploy, and safely stopping the node.

**Note on Location**: This guide resides within the project repository alongside its automation script. All file paths are relative to maintain self-containment and ensure functionality directly from the repository.

## Requirements

* **Docker** and **docker-compose** installed.
* **Rust** and **Cargo** installed (required for the manual `cargo run -- full-deploy ...` verification step).
* **Network access** from your environment to the HTTP/API endpoints specified in this guide.
* (Optional) A **previously created wallet** (with or without funds), depending on the chosen option for `.env` preparation.

---

## 1. Obtain the Docker Images

The recommended approach is to build the required Docker images locally. The option to pull pre-built images from a container registry like ECR may be added in the future.

All files referenced below are located in the project's repository folder:

* **Project Path:** [chain/validator](./)

### 1.1 Build the Configurator Image

The configurator image prepares the necessary environment and configurations for the validator.

* **Dockerfile:** [configurator.Dockerfile](./configurator.Dockerfile)
* **Run from:** the `./chain/validator` folder
* **Command:**

```bash
docker build -f configurator.Dockerfile -t configurator:latest ../..
```

**Important**: The **build context** must be set to the **project root** (`../..`). This is required because the build process pulls the `wallet-generator` utility from the root directory. Docker cannot traverse up the directory tree during a build, so passing the correct context is essential.

### 1.2 Build the Connector Image

The connector image handles the bonding process, which officially registers the validator with the network.

* **Dockerfile:** [connector.Dockerfile](./connector.Dockerfile)
* **Run from:** the `./chain/validator` folder
* **Command:**

```bash
docker build -f connector.Dockerfile -t connector:latest .
```

### 1.3 Verify Images

After building, list the local Docker images to confirm their creation.

```bash
docker image ls
```

Expected output should include entries for the newly built images:

| **REPOSITORY** | **TAG** |
| -------------- | ------- |
| configurator   | latest  |
| connector      | latest  |

### 1.4 Point Compose Files to Local Images

If the images were built locally, the docker-compose files must be updated to reference these local tags instead of remote registry URIs.

* In [configurator.yml](./configurator.yml), locate `services -> configurator -> image` and set its value to:

```yaml
image: configurator:latest
```

* In [connector.yml](./connector.yml), locate `services -> connector -> image` and set its value to:

```yaml
image: connector:latest
```

Keep the rest of the compose configuration intact.

---

## 2. Prepare `.env` and Run the Configurator

Before starting the validator, create and configure a `.env` file containing your wallet credentials. Choose **one** of the following three options.

### Option A: Generate a New Key/Address

* Run the designated key generation script.
* Populate the `.env` file with the required environment variables produced by the script.

### Option B: Use a Previously Created Wallet (Zero Balance)

* Ensure the wallet is connected to **server1** and has a balance of **0**.
* Write the wallet **address** and **private key** into the `.env` file.
* Reference tool: [http://184.73.0.34:3000/](http://184.73.0.34:3000/)

### Option C: Use a Previously Created, Funded Wallet

* Ensure the wallet balance is **strictly greater than 20,000**.
* Write the wallet **address** and **private key** into the `.env` file.

### 2.1 Run the Configurator

Execute the configurator to apply the settings from the `.env` file.

**Note**: Do not modify any parameters when starting the container.

* **Windows (PowerShell/CMD):**

```powershell
docker-compose -f .\configurator.yml up
```

* **Linux/macOS:**

```bash
docker-compose -f ./configurator.yml up
```

Observe the container output to verify that the environment has been configured successfully.

---

## 3. Add the Validator to Bonds

Start the connector service to bond the validator to the network.

* **Windows:**

```powershell
docker-compose -f .\connector.yml up
```

* **Linux/macOS:**

```bash
docker-compose -f ./connector.yml up
```

**Success Criterion:** The logs should include the following confirmation message:

> `Validator bonded successfully`

The connector can be stopped after successful bonding (e.g., press Ctrl+C if running in the foreground).

---

## 4. Start the Validator

Run the main validator node in detached (`-d`) mode to allow it to run in the background.

* **Windows:**

```powershell
docker-compose -f .\validator.yml up -d
```

* **Linux/macOS:**

```bash
docker-compose -f ./validator.yml up -d
```

### 4.1 Check Validator Synchronization

Verify that the validator is synchronizing with the rest of the network.

1. **Check the latest finalized block on the observer node:**

   * Observer endpoint: [http://44.198.8.24:40453/api/last-finalized-block](http://44.198.8.24:40453/api/last-finalized-block)
   * If the API response contains at least one block, synchronization has started.
2. **Compare the observer's block height with your validator's:**

   * Use the same URL path but replace the host and port with your validator’s public endpoint.
   * **Expectation:** The validator’s latest block should **match** the observer’s latest block. When they match, synchronization is successful.

If the validator shows at least one block but lags behind the observer, allow it to continue running until it has caught up.

---

## 5. Verify Transaction Deployment (Manual Test)

To confirm the validator is fully operational, perform a manual test to prove it can successfully submit a transaction to the network. This is especially relevant for an external validator not known to the autopropose script.

1. Clone the Rust client repository and navigate into the folder:

```bash
git clone https://github.com/F1R3FLY-io/rust-client
cd rust-client
```

2. Execute a test deploy using your private key:

```bash
cargo run -- full-deploy -f ./rho_examples/stdout.rho --private-key YOUR_PRIVATE_KEY -p 40442
```

The goal is to receive confirmation that the network accepted the transaction sent from your validator.

---

## 6. Disable (Stop) the External Validator

When the validator node is no longer needed, stop it cleanly using docker-compose.

* **Windows:**

```powershell
docker-compose -f .\validator.yml stop
```

* **Linux/macOS:**

```bash
docker-compose -f ./validator.yml stop
```

This command stops the validator container gracefully without deleting it, preserving its state for a future restart.

---

## Appendix — Quick Links

* **Repo Folder (Validator):** [chain/validator](./)
* **Configurator Dockerfile:** [configurator.Dockerfile](./configurator.Dockerfile)
* **Connector Dockerfile:** [connector.Dockerfile](./connector.Dockerfile)
* **Observer Endpoint:** [http://44.198.8.24:40453/api/last-finalized-block](http://44.198.8.24:40453/api/last-finalized-block)
* **Wallet Tool (server1):** [http://184.73.0.34:3000/](http://184.73.0.34:3000/)
