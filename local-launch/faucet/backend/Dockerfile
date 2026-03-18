FROM rust:trixie

RUN apt update && \
    apt install -y protobuf-compiler git build-essential make && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN git clone --recurse-submodules https://github.com/asi-alliance/asi-chain-faucet.git

WORKDIR /app/asi-chain-faucet/server

RUN cargo build --release

CMD ["cargo", "run", "--release"]
