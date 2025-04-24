#!/bin/bash
# This script allows for an upload to github from a container, based on the data that is provided in an .env file
cd ..
echo "Initializing git configuration in container"
git init 
git config --global user.name "$GITHUB_USERNAME"
git config --global user.email "$GITHUB_EMAIL"
git config --global --add safe.directory /app # set the docker app folder as full safe dir, since this is a shared volume from the docker context
git remote add origin "https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@${GITHUB_REPO_URL}"