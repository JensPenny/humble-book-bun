#!/bin/bash
# run-humble-analyzer.sh - Script to run the Humble Bundle analyzer on a self-hosted server

# Change to the project directory
cd "$(dirname "$0")"

# Check if a URL was provided
if [ $# -gt 0 ]; then
  URL="$1"
  SAVE_FLAG="--save"
else
  # Default URL
  URL="https://www.humblebundle.com/books/computer-science-fun-way-no-starch-books"
  SAVE_FLAG="--save"
fi

# Run the script with Bun
echo "Running Humble Bundle analyzer for URL: $URL"
bun run ../api/cli/api-client.ts "$URL" $SAVE_FLAG

# Check if the script ran successfully
if [ $? -eq 0 ]; then
  echo "Humble Bundle analyzer completed successfully."
else
  echo "Humble Bundle analyzer failed with error code $?."
  exit 1
fi
