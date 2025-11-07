FROM rust:slim

WORKDIR /app
COPY ./scripts/connect.sh ./connect.sh

RUN ["apt", "update"]
RUN ["apt", "upgrade", "--yes"]
RUN ["apt", "install", "--yes", "make", "git", "curl", "protobuf-compiler", "jq"]
RUN ["git", "clone", "https://github.com/singnet/rust-client.git"]

WORKDIR /app/rust-client
RUN ["cargo", "build"]
WORKDIR /app

ENTRYPOINT ["bash", "connect.sh"]
