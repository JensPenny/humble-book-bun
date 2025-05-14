#!/bin/bash
# This script allows for an upload to github from a container, based on the data that is provided in an .env file
cd /app
if [ ! -d .git ]; then 
    echo "Initializing git configuration in container"
    git config init.defaultBranch main # Github uses main as default branches
    git init 
    git config user.name "$GITHUB_USERNAME"
    git config user.email "$GITHUB_EMAIL"
    git config --add safe.directory /app # set the docker app folder as full safe dir, since this is a shared volume from the docker context
    git config push.autoSetupRemote true # Automatically set up the remote tracking branch when pushing
    git remote add origin "https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@${GITHUB_REPO_URL}"
    git fetch origin
    git checkout -B main origin/main
    echo "Git configuration completed successfully"
fi