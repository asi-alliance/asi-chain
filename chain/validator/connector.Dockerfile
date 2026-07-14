FROM rust:slim

WORKDIR /app
COPY ./scripts/connect.sh ./connect.sh

RUN apt-get update && apt-get install -y \
    make \
    git \
    curl \
    protobuf-compiler \
    jq \
    pkg-config \
    libssl-dev \
    ca-certificates \
    cmake \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN ["git", "clone", "https://github.com/singnet/rust-client.git"]

WORKDIR /app/rust-client
RUN ["cargo", "build", "--release"]
WORKDIR /app

ENTRYPOINT ["bash", "connect.sh"]