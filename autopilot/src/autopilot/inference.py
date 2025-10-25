"""Inference script for GRU-based autopilot neural network."""

import argparse
from pathlib import Path
from collections import deque

import numpy as np
import torch

from autopilot.model import load_model, AutopilotGRU


class AutopilotInference:
    """
    Inference wrapper for trained GRU autopilot model.
    Maintains sequence buffer for temporal predictions.
    """

    def __init__(self, model_path: str, device: str = None, seq_len: int = 10):
        """
        Initialize inference wrapper.

        Args:
            model_path: Path to the saved model checkpoint
            device: Device to run inference on (cuda/mps/cpu)
            seq_len: Sequence length for GRU (default: 10 = 500ms history)
        """
        # Determine device
        if device is None:
            if torch.cuda.is_available():
                device = 'cuda'
            elif torch.backends.mps.is_available():
                device = 'mps'
            else:
                device = 'cpu'

        self.device = device
        print(f"Using device: {device}")

        # Load GRU model
        self.model, self.normalization_params = load_model(model_path, device)

        if self.normalization_params is None:
            print("Warning: No normalization parameters found in checkpoint. "
                  "Make sure to normalize features manually.")

        if not isinstance(self.model, AutopilotGRU):
            raise ValueError(f"Expected AutopilotGRU model, got {type(self.model)}")

        print("Model type: GRU (sequence-based)")

        # Initialize sequence buffer
        self.seq_len = seq_len
        self.observation_buffer = deque(maxlen=seq_len)
        self.prev_actions = [0.0, 0.0, 0.0, 0.0]  # [w, a, s, d]
        print(f"Sequence length: {seq_len}")

    def reset_buffer(self):
        """
        Reset the observation buffer and previous actions.
        Call this when starting a new driving session.
        """
        self.observation_buffer.clear()
        self.prev_actions = [0.0, 0.0, 0.0, 0.0]
        print("Buffer reset")

    def normalize_features(self, features: np.ndarray) -> np.ndarray:
        """
        Normalize features using saved normalization parameters.

        Args:
            features: Raw features to normalize

        Returns:
            Normalized features
        """
        if self.normalization_params is None:
            return features

        mean = np.array(self.normalization_params['mean'])
        std = np.array(self.normalization_params['std'])

        return (features - mean) / std

    def predict(
        self,
        l_sensor: float,
        ml_sensor: float,
        c_sensor: float,
        mr_sensor: float,
        r_sensor: float,
        speed: float,
        threshold: float = 0.5
    ) -> dict:
        """
        Predict control commands from sensor readings using GRU sequence model.
        Adds observation to buffer and predicts from sequence.

        Args:
            l_sensor: Left sensor range
            ml_sensor: Mid-left sensor range
            c_sensor: Center sensor range
            mr_sensor: Mid-right sensor range
            r_sensor: Right sensor range
            speed: Current speed
            threshold: Threshold for binary classification

        Returns:
            Dictionary with control commands and probabilities:
            {
                'forward': bool,
                'left': bool,
                'backward': bool,
                'right': bool,
                'probabilities': {
                    'w': float,
                    'a': float,
                    's': float,
                    'd': float
                }
            }
        """
        # Create observation with sensors + speed + previous actions (10 features)
        observation = [l_sensor, ml_sensor, c_sensor, mr_sensor, r_sensor, speed] + self.prev_actions

        # Add to buffer
        self.observation_buffer.append(observation)

        # If buffer not full yet, pad with first observation
        if len(self.observation_buffer) < self.seq_len:
            # Pad by repeating the first observation
            padded_sequence = [self.observation_buffer[0]] * (self.seq_len - len(self.observation_buffer)) + list(self.observation_buffer)
        else:
            padded_sequence = list(self.observation_buffer)

        # Convert to numpy array: shape (1, seq_len, 10)
        sequence = np.array([padded_sequence], dtype=np.float32)

        # Normalize (apply normalization per-feature across the sequence)
        sequence_normalized = self.normalize_features(sequence.reshape(-1, 10)).reshape(1, self.seq_len, 10)

        # Convert to tensor
        sequence_tensor = torch.tensor(sequence_normalized, dtype=torch.float32).to(self.device)

        # Predict
        with torch.no_grad():
            logits = self.model(sequence_tensor)
            probabilities = torch.sigmoid(logits)

        probs = probabilities.cpu().numpy()[0]

        # Update previous actions for next timestep
        self.prev_actions = [
            float(probs[0] >= threshold),
            float(probs[1] >= threshold),
            float(probs[2] >= threshold),
            float(probs[3] >= threshold)
        ]

        # Create control commands
        commands = {
            'forward': bool(probs[0] >= threshold),
            'left': bool(probs[1] >= threshold),
            'backward': bool(probs[2] >= threshold),
            'right': bool(probs[3] >= threshold),
            'probabilities': {
                'w': float(probs[0]),
                'a': float(probs[1]),
                's': float(probs[2]),
                'd': float(probs[3])
            }
        }

        return commands



def main():
    """Command line interface for GRU inference."""
    parser = argparse.ArgumentParser(description="Run GRU autopilot inference")

    parser.add_argument(
        "--model-path",
        type=str,
        default="./models/best_model.pt",
        help="Path to the saved model"
    )
    parser.add_argument(
        "--l-sensor",
        type=float,
        required=True,
        help="Left sensor range"
    )
    parser.add_argument(
        "--ml-sensor",
        type=float,
        required=True,
        help="Mid-left sensor range"
    )
    parser.add_argument(
        "--c-sensor",
        type=float,
        required=True,
        help="Center sensor range"
    )
    parser.add_argument(
        "--mr-sensor",
        type=float,
        required=True,
        help="Mid-right sensor range"
    )
    parser.add_argument(
        "--r-sensor",
        type=float,
        required=True,
        help="Right sensor range"
    )
    parser.add_argument(
        "--speed",
        type=float,
        required=True,
        help="Current speed"
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.5,
        help="Threshold for binary classification"
    )
    parser.add_argument(
        "--device",
        type=str,
        choices=['cuda', 'mps', 'cpu'],
        default=None,
        help="Device to run on"
    )

    args = parser.parse_args()

    inference = AutopilotInference(args.model_path, args.device)
    result = inference.predict(
        args.l_sensor,
        args.ml_sensor,
        args.c_sensor,
        args.mr_sensor,
        args.r_sensor,
        args.speed,
        args.threshold
    )

    print("\nPrediction:")
    print(f"  Input: L={args.l_sensor}, ML={args.ml_sensor}, C={args.c_sensor}, MR={args.mr_sensor}, R={args.r_sensor}, Speed={args.speed}")
    print(f"  Commands: W={result['forward']}, A={result['left']}, S={result['backward']}, D={result['right']}")
    print(f"  Probabilities: W={result['probabilities']['w']:.3f}, A={result['probabilities']['a']:.3f}, "
          f"S={result['probabilities']['s']:.3f}, D={result['probabilities']['d']:.3f}")


if __name__ == "__main__":
    main()
