# ASI Chain Block Explorer Dockerfile
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY parser/ ./parser/
COPY web/ ./web/
COPY *.sh ./

# Ensure templates and static directories are included
RUN mkdir -p ./web/templates ./web/static

# Create data directory
RUN mkdir -p data logs

# Make scripts executable
RUN chmod +x *.sh

# Expose web interface port
EXPOSE 5001

# Copy Docker-specific scripts
COPY parser/docker_enhanced_parser.py ./parser/
COPY web/docker_app.py ./web/
COPY docker-entrypoint.sh .

# Make entrypoint executable
RUN chmod +x docker-entrypoint.sh

# Default command uses entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"]