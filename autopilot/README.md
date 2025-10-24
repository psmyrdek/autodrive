# AutoDrive Autopilot Neural Network

Train a neural network to control the AutoDrive car based on telemetry data collected from human gameplay.

## Overview

This project trains a feedforward neural network to predict control commands (WASD keys) based on sensor readings and current speed. The model learns from telemetry data collected during successful human-driven gameplay sessions.

**Model Architecture:**
- Input: 4 features (left sensor, center sensor, right sensor, speed)
- Hidden layers: 64 → 32 units with ReLU activation and dropout
- Output: 4 sigmoid outputs (probabilities for W/A/S/D keys)
- Loss: Binary Cross Entropy (multi-label classification)

## Setup

### Prerequisites

- Python 3.11+
- [uv](https://github.com/astral-sh/uv) package manager

### Installation

1. Install dependencies with uv:

```bash
cd autopilot
uv sync
```

This will create a virtual environment and install PyTorch, NumPy, and tqdm.

## Usage

### 1. Collect Telemetry Data

First, play the AutoDrive game and save successful runs:

1. Start the game: `npm run dev:all` (from project root)
2. Navigate to `/game` in your browser
3. Drive the track successfully
4. When you crash, click "Save Telemetry"
5. Repeat for multiple successful runs (more data = better model)

Telemetry files are saved to `../server/telemetry/` as JSON files.

### 2. Train the Model

Train the neural network on collected telemetry:

```bash
# Basic training (uses default parameters)
uv run python -m autopilot.train

# Custom parameters
uv run python -m autopilot.train \
  --telemetry-dir ../server/telemetry \
  --output-dir ./models \
  --epochs 50 \
  --batch-size 32 \
  --learning-rate 0.001 \
  --val-split 0.2
```

**Parameters:**
- `--telemetry-dir`: Directory with telemetry JSON files (default: `../server/telemetry`)
- `--output-dir`: Where to save model checkpoints (default: `./models`)
- `--epochs`: Number of training epochs (default: 50)
- `--batch-size`: Batch size for training (default: 32)
- `--learning-rate`: Learning rate for Adam optimizer (default: 0.001)
- `--val-split`: Fraction of data for validation (default: 0.2)
- `--device`: Device to train on - `cuda`, `mps`, or `cpu` (auto-detected if not specified)

**Training Output:**
- Model checkpoints saved to `./models/`
- `best_model.pt`: Best model based on validation loss
- `final_model.pt`: Model after final epoch

The training script will show:
- Data loading statistics (number of samples, feature ranges)
- Per-epoch training and validation metrics
- Per-key accuracy (W/A/S/D individually)
- Overall accuracy

### 3. Evaluate the Model

Test the trained model on telemetry data:

```bash
# Evaluate on all telemetry
uv run python -m autopilot.inference evaluate \
  --model-path ./models/best_model.pt \
  --telemetry-dir ../server/telemetry

# Test single prediction
uv run python -m autopilot.inference predict \
  --model-path ./models/best_model.pt \
  --l-sensor 106 \
  --c-sensor 652 \
  --r-sensor 128 \
  --speed 2
```

### 4. Run Inference Server

Start the FastAPI server to enable ML-powered autopilot in the game:

```bash
# Start the server (runs on http://localhost:8000)
cd autopilot
uv run python -m autopilot.server

# Or use uvicorn directly
uv run uvicorn autopilot.server:app --host 0.0.0.0 --port 8000 --reload
```

**Server Endpoints:**
- `GET /health` - Health check and model status
- `POST /predict` - Predict control commands from car state

**Request format for `/predict`:**
```json
{
  "l_sensor": 106.0,
  "c_sensor": 652.0,
  "r_sensor": 128.0,
  "speed": 2.0
}
```

**Response format:**
```json
{
  "forward": true,
  "backward": false,
  "left": false,
  "right": false,
  "probabilities": {
    "w": 0.89,
    "a": 0.12,
    "s": 0.05,
    "d": 0.23
  }
}
```

**Integration with Game:**

Once the server is running, the AutopilotSystem in the game will automatically use ML predictions when autopilot mode is enabled (press 'P' in game). The system falls back to rule-based logic if the server is unavailable.

### 5. Use in Code (Python)

```python
from autopilot.inference import AutopilotInference

# Load model
autopilot = AutopilotInference('./models/best_model.pt')

# Predict control commands
result = autopilot.predict(
    l_sensor=106,
    c_sensor=652,
    r_sensor=128,
    speed=2
)

print(f"Forward: {result['forward']}")  # True/False
print(f"Left: {result['left']}")        # True/False
print(f"Backward: {result['backward']}") # True/False
print(f"Right: {result['right']}")      # True/False
print(f"Probabilities: {result['probabilities']}")  # W/A/S/D probs
```

## Project Structure

```
autopilot/
├── pyproject.toml              # uv project config
├── README.md                   # This file
├── .python-version             # Python version (3.11)
├── src/autopilot/
│   ├── __init__.py
│   ├── data_loader.py          # Load and parse telemetry JSON files
│   ├── dataset.py              # PyTorch Dataset class
│   ├── model.py                # Neural network architecture
│   ├── train.py                # Training script
│   ├── inference.py            # Inference/evaluation script
│   └── server.py               # FastAPI server for real-time inference
└── models/                     # Saved model checkpoints (created during training)
    ├── best_model.pt
    └── final_model.pt
```

## Data Format

### Telemetry JSON Structure

Each telemetry file contains an array of samples:

```json
[
  {
    "timestamp": 0,
    "w_pressed": true,
    "a_pressed": false,
    "s_pressed": false,
    "d_pressed": false,
    "l_sensor_range": 106,
    "c_sensor_range": 652,
    "r_sensor_range": 128,
    "speed": 2
  },
  ...
]
```

### Feature Normalization

Features are normalized to zero mean and unit variance during training. Normalization parameters (mean and std) are saved with the model checkpoint for consistent inference.

## Integration with TypeScript (AutopilotSystem)

The trained model is integrated with `AutopilotSystem.ts` via the FastAPI server:

1. **Start the inference server** (see section 4 above):
   ```bash
   cd autopilot
   uv run python -m autopilot.server
   ```

2. **Run the game**:
   ```bash
   cd .. # Back to project root
   npm run dev:all
   ```

3. **Enable autopilot in game**:
   - Navigate to `/game` in your browser
   - Press 'P' to toggle autopilot mode
   - The AutopilotSystem will automatically detect the ML server and use it
   - If the server is down, it falls back to rule-based logic

**How it works:**
- `AutopilotSystem.ts` sends car state (sensors + speed) to `http://localhost:8000/predict`
- FastAPI server runs inference using the trained PyTorch model
- Control commands are sent back and applied to the car

**Alternative: ONNX Runtime Web** (future work for client-side inference):
   ```python
   import torch.onnx
   model, _ = load_model('./models/best_model.pt')
   dummy_input = torch.randn(1, 4)
   torch.onnx.export(model, dummy_input, 'autopilot.onnx')
   ```
   This would allow running the model directly in the browser without a server.

## Tips for Better Results

1. **Collect diverse data**: Drive different tracks, speeds, and scenarios
2. **Quality over quantity**: Save only successful runs (no crashes)
3. **Balance the dataset**: Ensure all control keys (WASD) are well-represented
4. **Monitor validation accuracy**: If val accuracy is low, collect more data or adjust hyperparameters
5. **Experiment with architecture**: Try different hidden layer sizes in `model.py`

## Troubleshooting

**No telemetry files found:**
- Make sure you've played the game and saved telemetry
- Check that `../server/telemetry/` exists and contains `.json` files

**Low accuracy:**
- Collect more telemetry data (aim for 1000+ samples)
- Increase training epochs
- Adjust learning rate or model architecture

**Training too slow:**
- Reduce batch size if running out of memory
- Use GPU if available (CUDA or MPS)

## License

MIT
