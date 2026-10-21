FROM rust:slim-bookworm AS client
RUN apt-get update && apt-get install -y --no-install-recommends cmake curl jq libprotobuf-dev libssl-dev make perl pkg-config protobuf-compiler && rm -rf /var/lib/apt/lists/*
ENV CARGO_BUILD_JOBS=8
WORKDIR /app/asi-chain-client
COPY --from=client_source Cargo.* rust-toolchain.toml ./
COPY --from=client_source .cargo/ .cargo/
COPY --from=client_source src/ src/
COPY --from=client_source rho_examples/ rho_examples/
RUN cargo build

FROM client AS bot
COPY --from=infra_source local-launch/bot/bot.sh /app/deployer.sh
ENTRYPOINT ["bash", "/app/deployer.sh"]

FROM client AS connector
COPY --from=infra_source chain/validator/scripts/connect.sh /app/connect.sh
ENTRYPOINT ["bash", "/app/connect.sh"]
