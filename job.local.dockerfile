# This is the dockerfile for the full humble analyzer job.

# Base bun image that will be used in all derived steps
FROM oven/bun:1.2-alpine AS base
WORKDIR /app

# Install git and other dependencies
RUN apk add --no-cache git npm bash postgresql-client

# Caching layer for dependency resolution
FROM base AS install
RUN mkdir -p /temp/dev 
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Final image
FROM base
COPY --from=install /temp/dev/node_modules /app/node_modules

# Set up git configuration for automated commits
RUN mkdir -p /root/.ssh && chmod 700 /root/.ssh

# Create a wrapper script to initialize git and then run the full script
RUN echo '#!/bin/bash\n\
# Run git initialization script\n\
/app/cmd/initialize_docker_git.sh\n\
\n\
# Run the full script\n\
/app/cmd/full_script.sh\n\
' > /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# The actual files will be mounted via docker-compose volume
# The entry point will run the initialization script and then the full script
ENTRYPOINT ["/bin/bash", "/app/docker-entrypoint.sh"]
