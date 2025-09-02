# ASI Chain RChain-Compatible Faucet
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements_rchain.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements_rchain.txt

# Copy application files
COPY rchain_faucet.py .

# Create data directory for database and non-root user
RUN mkdir -p /app/data && \
    useradd -m -u 1000 faucet && \
    chown -R faucet:faucet /app

USER faucet

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DATABASE_PATH=/app/data/faucet.db

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Expose port
EXPOSE 5000

# Run the application
CMD ["python", "rchain_faucet.py"]