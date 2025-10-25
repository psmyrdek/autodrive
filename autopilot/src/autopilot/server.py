"""FastAPI server for autopilot inference."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from autopilot.inference import AutopilotInference

# Request/Response models
class SequencePayload(BaseModel):
    """Sequence input for GRU-based autopilot predictions."""
    dt_ms: int                     # Time between observations (e.g., 50ms)
    x: list[list[float]]           # Sequence of observations [T][6]: [l, ml, c, mr, r, speed]
    prev_actions: list[float] = [0.0, 0.0, 0.0, 0.0]  # Previous predicted actions [w, a, s, d]


class ControlCommands(BaseModel):
    """Control commands output from autopilot."""
    forward: bool
    backward: bool
    left: bool
    right: bool
    probabilities: dict  # W/A/S/D probabilities for debugging


# Global inference wrapper
autopilot: AutopilotInference | None = None

# Create FastAPI app
app = FastAPI(
    title="AutoDrive Autopilot API",
    description="Neural network inference API for autonomous driving",
    version="1.0.0"
)

# Add CORS middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3001"],  # Vite dev server and Express
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def load_model():
    """Load the trained model on startup."""
    global autopilot

    model_path = "./models/best_model.pt"
    print(f"Loading model from {model_path}...")

    try:
        autopilot = AutopilotInference(model_path, device=None)
        print("Model loaded successfully!")
    except Exception as e:
        print(f"Error loading model: {e}")
        raise


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "model_loaded": autopilot is not None,
        "model_type": "GRU" if autopilot else None
    }


@app.post("/reset")
async def reset_buffer():
    """
    Reset the observation buffer.
    Call this when starting a new driving session to clear history.
    """
    if autopilot is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        autopilot.reset_buffer()
        return {"status": "buffer_reset"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset error: {str(e)}")


@app.post("/predict", response_model=ControlCommands)
async def predict(payload: SequencePayload):
    """
    Predict control commands from sequence of observations using GRU model.

    Args:
        payload: SequencePayload with sequence of observations [T][6]: [l, ml, c, mr, r, speed]

    Returns:
        Control commands (forward, backward, left, right) with probabilities
    """
    if autopilot is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        import numpy as np
        import torch

        # GRU model expects: [l, ml, c, mr, r, speed, w_prev, a_prev, s_prev, d_prev] (10 features)
        # Frontend sends: [l, ml, c, mr, r, speed] (6 features) + prev_actions (4 features)
        # We use the prev_actions from the last prediction across all timesteps in this sequence

        sequence_with_actions = []
        # Use previous actions from payload (tracked by frontend)
        prev_actions = payload.prev_actions

        for timestep in payload.x:
            # timestep: [l, ml, c, mr, r, speed]
            # Combine with previous actions (same for all timesteps in sequence)
            full_timestep = timestep + prev_actions
            sequence_with_actions.append(full_timestep)

        # Convert to numpy array: (1, seq_len, 10)
        sequence = np.array([sequence_with_actions], dtype=np.float32)

        # Normalize using model's normalization params
        if autopilot.normalization_params is not None:
            mean = np.array(autopilot.normalization_params['mean'])
            std = np.array(autopilot.normalization_params['std'])
            sequence_normalized = (sequence.reshape(-1, 10) - mean) / std
            sequence_normalized = sequence_normalized.reshape(1, len(payload.x), 10)
        else:
            sequence_normalized = sequence

        # Convert to tensor
        sequence_tensor = torch.tensor(sequence_normalized, dtype=torch.float32).to(autopilot.device)

        # Predict
        with torch.no_grad():
            logits = autopilot.model(sequence_tensor)
            probabilities = torch.sigmoid(logits)

        probs = probabilities.cpu().numpy()[0]

        # Create control commands
        threshold = 0.5
        return ControlCommands(
            forward=bool(probs[0] >= threshold),
            backward=bool(probs[2] >= threshold),
            left=bool(probs[1] >= threshold),
            right=bool(probs[3] >= threshold),
            probabilities={
                'w': float(probs[0]),
                'a': float(probs[1]),
                's': float(probs[2]),
                'd': float(probs[3])
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


def main():
    """Run the FastAPI server."""
    uvicorn.run(
        "autopilot.server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes
        log_level="info"
    )


if __name__ == "__main__":
    main()
