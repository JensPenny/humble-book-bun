#!/bin/bash

# This script handles Git operations on the host after the Docker container has processed the data
# It should be run from the root directory of the project

echo "Starting Git operations on the host..."

# Load environment variables from .env file
if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    export $(grep -v '^#' .env | xargs)
else
    echo "Error: .env file not found!"
    exit 1
fi

# Configure Git with the loaded credentials
echo "Configuring Git with credentials..."
git config user.name "$GITHUB_USERNAME"
git config user.email "$GITHUB_EMAIL"

# Set up the remote URL with authentication
REMOTE_URL="https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@${GITHUB_REPO_URL}"
git remote set-url origin "$REMOTE_URL"

# Pull the latest changes
echo "Pulling latest changes..."
git pull

# Add the site_gen directory and explicitly force add the data JSON files
echo "Adding files to Git..."
git add site_gen/
git add -f site_gen/humble_astro/data/*.json

# Add the cmd files that need to be tracked
git add cmd/last_update cmd/urls_to_parse

echo "Added updated site and specific files to Git"

# Commit the changes
echo "Committing changes..."
git commit -m "Automated commit by host script"
echo "Committed automatically"

# Push the changes
echo "Pushing changes..."
git push
echo "Pushed automatically"

echo "Git operations completed successfully!"

# Clean up - remove the credentials from the Git config for security
echo "Cleaning up Git configuration..."
git remote set-url origin "https://${GITHUB_REPO_URL}"
