# ASI Faucet Server

A small Axum-based service that sends test funds and exposes read endpoints to interact with ASI chain.

## Quick start

1) Configure environment

Copy `.env.example` and enter your configuration settings

2) Run the server

  ```
   cargo run
  ```

The server listens on `HOST:PORT` (defaults to `0.0.0.0:40470` from `.env.example`).

## API

All responses are JSON. CORS is enabled.

- POST `/transfer`
  - Content-Type: application/json
  - Body: `{ "to_address": "1111..." }`
  - Validations:
    - Address format 
    - Recipient balance must be ≤ 20.000 in REV (otherwise rejected)
    - Server must have `PRIVATE_KEY` set in `.env`
  - On success: `{ "deploy_id": "<id>" }`

- GET `/balance/:address`
  - Validates address format
  - Returns: `{ "balance": "<string_amount>" }`

- GET `/deploy/:deploy_id`
  - Validates deploy id
  - Returns deploy info from observer node (status, msg, block_hash)

## Notes

- Amount sent per transfer is configured by `FAUCET_AMOUNT` in `.env`
- The service talks to a node and an observer (for only-read endpoints)