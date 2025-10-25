"""FastAPI server for autopilot inference."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from autopilot.inference import AutopilotInference

# Request/Response models
class CarState(BaseModel):
    """Car state input for autopilot predictions."""
    l_sensor: float   # Left sensor distance
    ml_sensor: float  # Mid-left sensor distance
    c_sensor: float   # Center sensor distance
    mr_sensor: float  # Mid-right sensor distance
    r_sensor: float   # Right sensor distance
    speed: float      # Current speed


class ControlCommands(BaseModel):
    """Control commands output from autopilot."""
    forward: bool
    backward: bool
    left: bool
    right: bool
    probabilities: dict  # Optional: W/A/S/D probabilities for debugging


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
        "model_loaded": autopilot is not None
    }


@app.post("/predict", response_model=ControlCommands)
async def predict(state: CarState):
    """
    Predict control commands based on current car state.

    Args:
        state: Current car state with sensor readings and speed

    Returns:
        Control commands (forward, backward, left, right)
    """
    if autopilot is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Run inference
        result = autopilot.predict(
            l_sensor=state.l_sensor,
            ml_sensor=state.ml_sensor,
            c_sensor=state.c_sensor,
            mr_sensor=state.mr_sensor,
            r_sensor=state.r_sensor,
            speed=state.speed,
            threshold=0.5
        )

        return ControlCommands(
            forward=result['forward'],
            backward=result['backward'],
            left=result['left'],
            right=result['right'],
            probabilities=result['probabilities']
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
