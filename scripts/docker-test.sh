#!/bin/bash
set -e

IMAGE_NAME="ralph-test"

# Build the test image
echo "Building test image..."
docker build -t $IMAGE_NAME -f Dockerfile.test .

# Run interactive container with API keys
echo "Starting test container..."
docker run -it --rm \
    -e ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}" \
    -e OPENAI_API_KEY="${OPENAI_API_KEY}" \
    -v "$(pwd)":/workspace \
    $IMAGE_NAME
