#!/bin/bash

# This script runs the humble analyzer job in a Docker container

# Ensure the Docker network exists
echo "Ensuring Docker network exists..."
./ensure-docker-network.sh

# Build and run the Docker container
echo "Building and running the Docker container..."
docker compose -f local-docker-compose.yaml build
docker compose -f local-docker-compose.yaml up

echo "Job completed!"
