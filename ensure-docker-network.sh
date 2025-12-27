#!/bin/bash

# This should create a network for the postgres docker containers if they exist. 
# This should ensure that these can be connected through a docker network when you are running the docker compose commands.
# It is mandatory to run this script before running the actual container
NETWORK_NAME=humble_net
CONTAINERS=("pg_data") # Change this to the postgres container name that you use in your .env file
# CONTAINERS=("humble_data_pg")

# Create the network if it doesn't exist
if ! sudo docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    echo "Creating docker network $NETWORK_NAME"
    sudo docker network create "$NETWORK_NAME"
else
    echo "Docker network '$NETWORK_NAME' already exists"
fi

# Connect to the network if they are not connected
for CONTAINER in "${CONTAINERS[@]}"; do
    if ! sudo docker inspect "$CONTAINER" | grep -q "\"$NETWORK_NAME\""; then 
        echo "Connecting container '$CONTAINER' to '$NETWORK_NAME'"
        sudo docker network connect "$NETWORK_NAME" "$CONTAINER"
    else 
        echo "Container '$CONTAINER' already connected to '$NETWORK_NAME'"
    fi 
done