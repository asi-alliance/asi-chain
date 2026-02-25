# ==============================
# Stage 1: Fetch Rust CLI binary from GitHub Releases
# ==============================
FROM debian:bookworm-slim AS rust-cli

ARG RUST_CLIENT_VERSION=v0.2

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /out \
  && curl -fsSL -o /out/snetrc \
    "https://github.com/singnet/rust-client/releases/download/${RUST_CLIENT_VERSION}/snetrc-linux-amd64-${RUST_CLIENT_VERSION}" \
  && chmod +x /out/snetrc



# ==============================
# Stage 2: Build Python dependencies
# ==============================
FROM python:3.11-slim AS python-builder

RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt


# ==============================
# Stage 3: Runtime image
# ==============================
FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 indexer

WORKDIR /app

COPY --from=python-builder /root/.local /home/indexer/.local

# Copy Rust CLI binary
COPY --from=rust-cli /out/snetrc /usr/local/bin/snetrc
RUN chmod +x /usr/local/bin/snetrc

COPY . .

RUN chown -R indexer:indexer /app /home/indexer/.local

USER indexer

ENV PYTHONPATH=/app
ENV PATH="/home/indexer/.local/bin:${PATH}"
ENV RUST_CLI_PATH=/usr/local/bin/snetrc
ENV PYTHONUNBUFFERED=1

EXPOSE 9090

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9090/health || exit 1

CMD ["python", "-m", "src.main"]
