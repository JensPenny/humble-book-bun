#!/bin/bash

# This script runs the humble analyzer job in a Docker container
# and then commits the changes to Git on the host

# Ensure the Docker network exists
echo "Ensuring Docker network exists..."
./ensure-docker-network.sh

# Build and run the Docker container
echo "Building and running the Docker container..."
docker compose -f ovh-docker-compose.yaml build
docker compose -f ovh-docker-compose.yaml up

echo "Docker job completed!"

# Run the Git operations on the host
echo "Now running Git operations on the host..."
./commit-changes.sh

echo "All operations completed successfully!"
