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

RUN ["git", "clone", "-b", "asi-main-scala", "https://github.com/asi-alliance/asi-chain-client.git"]

WORKDIR /app/asi-chain-client
RUN ["cargo", "build", "--release"]
WORKDIR /app

ENTRYPOINT ["bash", "connect.sh"]