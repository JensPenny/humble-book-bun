#!/bin/bash

# This script handles Git operations on the host after the Docker container has processed the data
# It should be run from the root directory of the project

echo "Starting Git operations on the host..."

# Pull the latest changes
git pull

# Add the site_gen directory and explicitly force add the data JSON files
git add site_gen/
git add -f site_gen/humble_astro/data/*.json

# Add the cmd files that need to be tracked
git add cmd/last_update cmd/urls_to_parse

echo "Added updated site and specific files to Git"

# Commit the changes
git commit -m "Automated commit by host script"
echo "Committed automatically"

# Push the changes
git push
echo "Pushed automatically"

echo "Git operations completed successfully!"
