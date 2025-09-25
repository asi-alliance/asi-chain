# Build stage
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --user -r requirements.txt

# Runtime stage
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user first
RUN useradd -m -u 1000 indexer

# Copy Python dependencies from builder to indexer's home
COPY --from=builder /root/.local /home/indexer/.local

# Copy application code
COPY . .

# Set ownership
RUN chown -R indexer:indexer /app /home/indexer/.local

COPY node_cli_linux /usr/local/bin/node_cli
RUN chmod +x /usr/local/bin/node_cli

# Switch to non-root user
USER indexer

# Make sure scripts in .local are usable
ENV PATH=/home/indexer/.local/bin:$PATH

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9090/health || exit 1

# Expose monitoring port
EXPOSE 9090

# Run the indexer
CMD ["python", "-m", "src.main"]