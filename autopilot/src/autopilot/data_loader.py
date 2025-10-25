"""Load and parse telemetry JSON files."""

import json
from pathlib import Path
from typing import Tuple

import numpy as np


def load_telemetry_data(telemetry_dir: str = "../server/telemetry") -> Tuple[np.ndarray, np.ndarray]:
    """
    Load all telemetry JSON files and extract features and labels.

    Args:
        telemetry_dir: Path to directory containing telemetry JSON files

    Returns:
        Tuple of (features, labels) as numpy arrays
        - features: shape (N, 6) - [l_sensor_range, ml_sensor_range, c_sensor_range, mr_sensor_range, r_sensor_range, speed]
        - labels: shape (N, 4) - [w_pressed, a_pressed, s_pressed, d_pressed] as binary (0/1)
    """
    telemetry_path = Path(telemetry_dir)

    if not telemetry_path.exists():
        raise FileNotFoundError(f"Telemetry directory not found: {telemetry_dir}")

    all_features = []
    all_labels = []

    # Find all JSON files
    json_files = list(telemetry_path.glob("*.json"))

    if not json_files:
        raise ValueError(f"No JSON files found in {telemetry_dir}")

    print(f"Loading {len(json_files)} telemetry files...")

    for json_file in json_files:
        with open(json_file, 'r') as f:
            telemetry_data = json.load(f)

        # Each file contains an array of telemetry samples
        for sample in telemetry_data:
            # Extract features: [l_sensor, ml_sensor, c_sensor, mr_sensor, r_sensor, speed]
            features = [
                sample['l_sensor_range'],
                sample['ml_sensor_range'],
                sample['c_sensor_range'],
                sample['mr_sensor_range'],
                sample['r_sensor_range'],
                sample['speed']
            ]

            # Extract labels: [w_pressed, a_pressed, s_pressed, d_pressed]
            # Convert boolean to binary (0/1)
            labels = [
                int(sample['w_pressed']),
                int(sample['a_pressed']),
                int(sample['s_pressed']),
                int(sample['d_pressed'])
            ]

            all_features.append(features)
            all_labels.append(labels)

    # Convert to numpy arrays
    features_array = np.array(all_features, dtype=np.float32)
    labels_array = np.array(all_labels, dtype=np.float32)

    print(f"Loaded {len(features_array)} telemetry samples")
    print(f"Features shape: {features_array.shape}")
    print(f"Labels shape: {labels_array.shape}")

    # Print some statistics
    print("\nFeature statistics:")
    print(f"  L sensor range:  min={features_array[:, 0].min():.1f}, max={features_array[:, 0].max():.1f}, mean={features_array[:, 0].mean():.1f}")
    print(f"  ML sensor range: min={features_array[:, 1].min():.1f}, max={features_array[:, 1].max():.1f}, mean={features_array[:, 1].mean():.1f}")
    print(f"  C sensor range:  min={features_array[:, 2].min():.1f}, max={features_array[:, 2].max():.1f}, mean={features_array[:, 2].mean():.1f}")
    print(f"  MR sensor range: min={features_array[:, 3].min():.1f}, max={features_array[:, 3].max():.1f}, mean={features_array[:, 3].mean():.1f}")
    print(f"  R sensor range:  min={features_array[:, 4].min():.1f}, max={features_array[:, 4].max():.1f}, mean={features_array[:, 4].mean():.1f}")
    print(f"  Speed:           min={features_array[:, 5].min():.1f}, max={features_array[:, 5].max():.1f}, mean={features_array[:, 5].mean():.1f}")

    print("\nLabel distribution:")
    print(f"  W pressed: {labels_array[:, 0].sum()}/{len(labels_array)} ({100*labels_array[:, 0].mean():.1f}%)")
    print(f"  A pressed: {labels_array[:, 1].sum()}/{len(labels_array)} ({100*labels_array[:, 1].mean():.1f}%)")
    print(f"  S pressed: {labels_array[:, 2].sum()}/{len(labels_array)} ({100*labels_array[:, 2].mean():.1f}%)")
    print(f"  D pressed: {labels_array[:, 3].sum()}/{len(labels_array)} ({100*labels_array[:, 3].mean():.1f}%)")

    return features_array, labels_array


def normalize_features(features: np.ndarray) -> Tuple[np.ndarray, dict]:
    """
    Normalize features to zero mean and unit variance.

    Args:
        features: Feature array to normalize

    Returns:
        Tuple of (normalized_features, normalization_params)
        normalization_params contains mean and std for each feature
    """
    mean = features.mean(axis=0)
    std = features.std(axis=0)

    # Avoid division by zero
    std = np.where(std == 0, 1, std)

    normalized = (features - mean) / std

    params = {
        'mean': mean.tolist(),
        'std': std.tolist()
    }

    return normalized, params
