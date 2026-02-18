FROM rust:slim

WORKDIR /bot/src

RUN ["apt", "update"]
RUN ["apt", "upgrade", "--yes"]
RUN ["apt", "install", "--yes", "make", "git", "curl", "protobuf-compiler", "jq"]
RUN ["git", "clone", "https://github.com/singnet/rust-client.git", "."]
RUN ["cargo", "build"]

COPY ./bot.sh ./deployer.sh

ENTRYPOINT ["bash", "deployer.sh"]
