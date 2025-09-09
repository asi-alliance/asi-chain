.PHONY: help install dev-install test lint format run docker-build docker-up docker-down clean

# Default target
.DEFAULT_GOAL := help

# Variables
PYTHON := python3
PIP := pip3
DOCKER_COMPOSE := docker-compose

help: ## Show this help message
	@echo "ASI-Chain Indexer - Available Commands:"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "\033[36m%-20s\033[0m %s\n", "Command", "Description"} /^[a-zA-Z_-]+:.*?##/ { printf "\033[36m%-20s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

install: ## Install production dependencies
	$(PIP) install -r requirements.txt

dev-install: ## Install development dependencies
	$(PIP) install -r requirements.txt
	$(PIP) install pytest pytest-asyncio pytest-cov black flake8 mypy

test: ## Run tests
	pytest tests/ -v --cov=src --cov-report=term-missing

lint: ## Run linters
	flake8 src/ tests/ --max-line-length=100 --ignore=E203,W503
	mypy src/

format: ## Format code with black
	black src/ tests/

run: ## Run the indexer locally
	$(PYTHON) -m src.main

run-reset: ## Run the indexer with database reset
	$(PYTHON) -m src.main --reset

migrate: ## Run database migrations
	psql $(DATABASE_URL) < migrations/000_comprehensive_initial_schema.sql

docker-build: ## Build Docker image
	docker build -t asi-indexer:latest .

docker-up: ## Start services with Docker Compose
	$(DOCKER_COMPOSE) up -d

docker-down: ## Stop Docker Compose services
	$(DOCKER_COMPOSE) down

docker-logs: ## View Docker logs
	$(DOCKER_COMPOSE) logs -f indexer

docker-reset: ## Reset Docker environment
	$(DOCKER_COMPOSE) down -v
	$(DOCKER_COMPOSE) up -d

clean: ## Clean up generated files
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .coverage htmlcov/ .pytest_cache/ .mypy_cache/

status: ## Check indexer status
	@curl -s http://localhost:9090/status | jq .

health: ## Check health endpoint
	@curl -s http://localhost:9090/health | jq .

metrics: ## View Prometheus metrics
	@curl -s http://localhost:9090/metrics | head -20