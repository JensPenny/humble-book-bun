#!/bin/bash

# Create a wrapper script to initialize git and then run the full script
cd cmd
./initialize_docker_git.sh
./full_script.sh