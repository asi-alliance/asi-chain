FROM rust:slim

WORKDIR /deployer

RUN ["apt", "update"]
RUN ["apt", "upgrade", "--yes"]
RUN ["apt", "install", "--yes", "make", "git", "curl", "protobuf-compiler", "jq"]
RUN ["git", "clone", "-b", "asi-main-scala", "https://github.com/asi-alliance/asi-chain-client.git", "."]
RUN ["cargo", "build"]

COPY ./bot.sh ./deployer.sh

ENTRYPOINT ["bash", "deployer.sh"]