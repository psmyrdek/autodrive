"""Load and parse telemetry JSON files for GRU sequence training."""

import json
from pathlib import Path
from typing import Tuple

import numpy as np


def load_telemetry_sequences(
    telemetry_dir: str = "../server/telemetry",
    seq_len: int = 5
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Load telemetry data and create sequences for GRU training.

    Each sequence consists of seq_len timesteps, and predicts the actions at the final timestep.
    Per-file processing ensures sequences don't cross different driving sessions.

    Args:
        telemetry_dir: Path to directory containing telemetry JSON files
        seq_len: Number of timesteps in each sequence (default: 5)

    Returns:
        Tuple of (sequences, labels) as numpy arrays
        - sequences: shape (N, seq_len, 10) where features per timestep are:
          [l_sensor, ml_sensor, c_sensor, mr_sensor, r_sensor, speed,
           w_pressed_prev, a_pressed_prev, s_pressed_prev, d_pressed_prev]
        - labels: shape (N, 4) - [w_pressed, a_pressed, s_pressed, d_pressed] at final timestep
    """
    telemetry_path = Path(telemetry_dir)

    if not telemetry_path.exists():
        raise FileNotFoundError(f"Telemetry directory not found: {telemetry_dir}")

    json_files = list(telemetry_path.glob("*.json"))

    if not json_files:
        raise ValueError(f"No JSON files found in {telemetry_dir}")

    print(f"Loading {len(json_files)} telemetry files for sequence generation...")

    all_sequences = []
    all_labels = []

    for json_file in json_files:
        with open(json_file, 'r') as f:
            telemetry_data = json.load(f)

        # Skip files with too few samples
        if len(telemetry_data) < seq_len + 1:
            print(f"Skipping {json_file.name} (only {len(telemetry_data)} samples, need at least {seq_len + 1})")
            continue

        # Create sequences using sliding window within this file
        for i in range(len(telemetry_data) - seq_len):
            sequence = []

            # Build sequence of seq_len timesteps
            for t in range(seq_len):
                sample = telemetry_data[i + t]

                # Extract sensor values and speed
                sensors_and_speed = [
                    sample['l_sensor_range'],
                    sample['ml_sensor_range'],
                    sample['c_sensor_range'],
                    sample['mr_sensor_range'],
                    sample['r_sensor_range'],
                    sample['speed']
                ]

                # Get previous actions (from timestep t-1)
                if t == 0:
                    # For first timestep in sequence, use zeros or previous sample if available
                    if i > 0:
                        prev_sample = telemetry_data[i - 1]
                        prev_actions = [
                            int(prev_sample['w_pressed']),
                            int(prev_sample['a_pressed']),
                            int(prev_sample['s_pressed']),
                            int(prev_sample['d_pressed'])
                        ]
                    else:
                        prev_actions = [0, 0, 0, 0]
                else:
                    prev_sample = telemetry_data[i + t - 1]
                    prev_actions = [
                        int(prev_sample['w_pressed']),
                        int(prev_sample['a_pressed']),
                        int(prev_sample['s_pressed']),
                        int(prev_sample['d_pressed'])
                    ]

                # Combine: [sensors, speed, prev_actions]
                timestep_features = sensors_and_speed + prev_actions
                sequence.append(timestep_features)

            # Label is the action at the final timestep (i + seq_len)
            label_sample = telemetry_data[i + seq_len]
            label = [
                int(label_sample['w_pressed']),
                int(label_sample['a_pressed']),
                int(label_sample['s_pressed']),
                int(label_sample['d_pressed'])
            ]

            all_sequences.append(sequence)
            all_labels.append(label)

    # Convert to numpy arrays
    sequences_array = np.array(all_sequences, dtype=np.float32)
    labels_array = np.array(all_labels, dtype=np.float32)

    print(f"\nCreated {len(sequences_array)} sequences")
    print(f"Sequences shape: {sequences_array.shape} (N, seq_len={seq_len}, features=10)")
    print(f"Labels shape: {labels_array.shape}")

    # Print label distribution
    print("\nLabel distribution:")
    print(f"  W pressed: {labels_array[:, 0].sum()}/{len(labels_array)} ({100*labels_array[:, 0].mean():.1f}%)")
    print(f"  A pressed: {labels_array[:, 1].sum()}/{len(labels_array)} ({100*labels_array[:, 1].mean():.1f}%)")
    print(f"  S pressed: {labels_array[:, 2].sum()}/{len(labels_array)} ({100*labels_array[:, 2].mean():.1f}%)")
    print(f"  D pressed: {labels_array[:, 3].sum()}/{len(labels_array)} ({100*labels_array[:, 3].mean():.1f}%)")

    return sequences_array, labels_array


def normalize_sequences(sequences: np.ndarray) -> Tuple[np.ndarray, dict]:
    """
    Normalize sequences to zero mean and unit variance.
    Normalization is applied per-feature across all sequences and timesteps.

    Args:
        sequences: Sequence array of shape (N, seq_len, features)

    Returns:
        Tuple of (normalized_sequences, normalization_params)
        normalization_params contains mean and std for each feature
    """
    # Reshape to (N*seq_len, features) for normalization
    N, seq_len, features = sequences.shape
    reshaped = sequences.reshape(-1, features)

    # Compute mean and std per feature
    mean = reshaped.mean(axis=0)
    std = reshaped.std(axis=0)

    # Avoid division by zero
    std = np.where(std == 0, 1, std)

    # Normalize
    normalized_reshaped = (reshaped - mean) / std

    # Reshape back to (N, seq_len, features)
    normalized_sequences = normalized_reshaped.reshape(N, seq_len, features)

    params = {
        'mean': mean.tolist(),
        'std': std.tolist()
    }

    return normalized_sequences, params
