#!/bin/bash

if command -v nvidia-smi &> /dev/null && nvidia-smi &> /dev/null; then
    echo "✓ GPU NVIDIA detectada, habilitando GPU..."
    docker compose -f docker-compose.yml -f docker-compose.gpu.yml up
else
    echo "✗ Sem GPU NVIDIA, rodando sem GPU..."
    docker compose -f docker-compose.yml up
fi
