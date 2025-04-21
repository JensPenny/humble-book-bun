# This is the dockerfile for the full humble analyzer job.

# Base bun image that will be used in all derived steps
FROM oven/bun:1.2-alpine AS base
WORKDIR /app

# Caching layer for dependency resolution
# This should speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev 
COPY package.json bun.lock /temp/dev
RUN cd /temp/dev && bun install --frozen-lockfile
