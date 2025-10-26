#!/bin/bash

# Train wide model configuration
# Configuration from .github/workflows/train-models.yml

uv run python -m autopilot.train \
  --output-dir "./models/wide" \
  --epochs 120 \
  --batch-size 12 \
  --learning-rate 0.001 \
  --hidden-size 384 \
  --num-layers 3 \
  --fc-hidden 192 \
  --dropout 0.08 \
  --weight-decay 1e-4 \
  --label-smoothing 0.02 \
  --max-lr 1.5e-3 \
  --wandb
