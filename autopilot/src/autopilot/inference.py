"""Inference script for autopilot neural network."""

import argparse
from pathlib import Path

import numpy as np
import torch

from autopilot.model import load_model


class AutopilotInference:
    """
    Inference wrapper for the trained autopilot model.
    """

    def __init__(self, model_path: str, device: str = None):
        """
        Initialize inference wrapper.

        Args:
            model_path: Path to the saved model checkpoint
            device: Device to run inference on (cuda/mps/cpu)
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

        # Load model
        self.model, self.normalization_params = load_model(model_path, device)

        if self.normalization_params is None:
            print("Warning: No normalization parameters found in checkpoint. "
                  "Make sure to normalize features manually.")

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
        c_sensor: float,
        r_sensor: float,
        speed: float,
        threshold: float = 0.5
    ) -> dict:
        """
        Predict control commands from sensor readings.

        Args:
            l_sensor: Left sensor range
            c_sensor: Center sensor range
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
        # Prepare features
        features = np.array([[l_sensor, c_sensor, r_sensor, speed]], dtype=np.float32)

        # Normalize
        features_normalized = self.normalize_features(features)

        # Convert to tensor
        features_tensor = torch.tensor(features_normalized, dtype=torch.float32).to(self.device)

        # Predict (model outputs logits, need to apply sigmoid)
        with torch.no_grad():
            logits = self.model(features_tensor)
            probabilities = torch.sigmoid(logits)

        # Convert to numpy
        probs = probabilities.cpu().numpy()[0]

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

    def predict_batch(
        self,
        features: np.ndarray,
        threshold: float = 0.5
    ) -> tuple:
        """
        Predict control commands for a batch of samples.

        Args:
            features: Array of shape (N, 4) with features
            threshold: Threshold for binary classification

        Returns:
            Tuple of (commands, probabilities)
            - commands: Array of shape (N, 4) with binary commands
            - probabilities: Array of shape (N, 4) with probabilities
        """
        # Normalize
        features_normalized = self.normalize_features(features)

        # Convert to tensor
        features_tensor = torch.tensor(features_normalized, dtype=torch.float32).to(self.device)

        # Predict (model outputs logits, need to apply sigmoid)
        with torch.no_grad():
            logits = self.model(features_tensor)
            probabilities = torch.sigmoid(logits)

        # Convert to numpy
        probs = probabilities.cpu().numpy()
        commands = (probs >= threshold).astype(np.float32)

        return commands, probs


def evaluate_on_telemetry(model_path: str, telemetry_dir: str = "../server/telemetry", device: str = None):
    """
    Evaluate the model on all telemetry data.

    Args:
        model_path: Path to the saved model
        telemetry_dir: Directory containing telemetry JSON files
        device: Device to run on
    """
    from autopilot.data_loader import load_telemetry_data

    print("=== Evaluating Model on Telemetry ===\n")

    # Load data
    features, labels = load_telemetry_data(telemetry_dir)

    # Initialize inference
    inference = AutopilotInference(model_path, device)

    # Predict
    print("\nRunning predictions...")
    commands, probabilities = inference.predict_batch(features)

    # Calculate accuracy
    correct = (commands == labels)

    print("\nAccuracy per control:")
    print(f"  W (forward):  {correct[:, 0].mean():.3f}")
    print(f"  A (left):     {correct[:, 1].mean():.3f}")
    print(f"  S (backward): {correct[:, 2].mean():.3f}")
    print(f"  D (right):    {correct[:, 3].mean():.3f}")
    print(f"  Overall:      {correct.mean():.3f}")

    # Show some example predictions
    print("\nExample predictions (first 5 samples):")
    print("=" * 80)
    print(f"{'Sensors (L/C/R/Speed)':<30} {'True':<15} {'Predicted':<15} {'Probs (W/A/S/D)'}")
    print("=" * 80)

    for i in range(min(5, len(features))):
        sensors = f"{features[i, 0]:.0f}/{features[i, 1]:.0f}/{features[i, 2]:.0f}/{features[i, 3]:.0f}"
        true_cmd = f"{'W' if labels[i, 0] else '_'}{'A' if labels[i, 1] else '_'}{'S' if labels[i, 2] else '_'}{'D' if labels[i, 3] else '_'}"
        pred_cmd = f"{'W' if commands[i, 0] else '_'}{'A' if commands[i, 1] else '_'}{'S' if commands[i, 2] else '_'}{'D' if commands[i, 3] else '_'}"
        probs = f"{probabilities[i, 0]:.2f}/{probabilities[i, 1]:.2f}/{probabilities[i, 2]:.2f}/{probabilities[i, 3]:.2f}"

        print(f"{sensors:<30} {true_cmd:<15} {pred_cmd:<15} {probs}")


def main():
    """Command line interface for inference."""
    parser = argparse.ArgumentParser(description="Run inference with autopilot model")

    subparsers = parser.add_subparsers(dest='command', help='Command to run')

    # Evaluate command
    eval_parser = subparsers.add_parser('evaluate', help='Evaluate model on telemetry data')
    eval_parser.add_argument(
        "--model-path",
        type=str,
        default="./models/best_model.pt",
        help="Path to the saved model"
    )
    eval_parser.add_argument(
        "--telemetry-dir",
        type=str,
        default="../server/telemetry",
        help="Directory containing telemetry JSON files"
    )
    eval_parser.add_argument(
        "--device",
        type=str,
        choices=['cuda', 'mps', 'cpu'],
        default=None,
        help="Device to run on"
    )

    # Predict command
    predict_parser = subparsers.add_parser('predict', help='Predict commands from sensor values')
    predict_parser.add_argument(
        "--model-path",
        type=str,
        default="./models/best_model.pt",
        help="Path to the saved model"
    )
    predict_parser.add_argument(
        "--l-sensor",
        type=float,
        required=True,
        help="Left sensor range"
    )
    predict_parser.add_argument(
        "--c-sensor",
        type=float,
        required=True,
        help="Center sensor range"
    )
    predict_parser.add_argument(
        "--r-sensor",
        type=float,
        required=True,
        help="Right sensor range"
    )
    predict_parser.add_argument(
        "--speed",
        type=float,
        required=True,
        help="Current speed"
    )
    predict_parser.add_argument(
        "--threshold",
        type=float,
        default=0.5,
        help="Threshold for binary classification"
    )
    predict_parser.add_argument(
        "--device",
        type=str,
        choices=['cuda', 'mps', 'cpu'],
        default=None,
        help="Device to run on"
    )

    args = parser.parse_args()

    if args.command == 'evaluate':
        evaluate_on_telemetry(args.model_path, args.telemetry_dir, args.device)
    elif args.command == 'predict':
        inference = AutopilotInference(args.model_path, args.device)
        result = inference.predict(
            args.l_sensor,
            args.c_sensor,
            args.r_sensor,
            args.speed,
            args.threshold
        )

        print("\nPrediction:")
        print(f"  Input: L={args.l_sensor}, C={args.c_sensor}, R={args.r_sensor}, Speed={args.speed}")
        print(f"  Commands: W={result['forward']}, A={result['left']}, S={result['backward']}, D={result['right']}")
        print(f"  Probabilities: W={result['probabilities']['w']:.3f}, A={result['probabilities']['a']:.3f}, "
              f"S={result['probabilities']['s']:.3f}, D={result['probabilities']['d']:.3f}")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
