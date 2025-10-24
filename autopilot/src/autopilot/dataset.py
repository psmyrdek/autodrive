"""PyTorch Dataset for telemetry data."""

from typing import Tuple

import numpy as np
import torch
from torch.utils.data import Dataset


class TelemetryDataset(Dataset):
    """
    PyTorch Dataset for telemetry data.

    Features: [l_sensor_range, c_sensor_range, r_sensor_range, speed]
    Labels: [w_pressed, a_pressed, s_pressed, d_pressed] (multi-label binary classification)
    """

    def __init__(self, features: np.ndarray, labels: np.ndarray):
        """
        Initialize dataset.

        Args:
            features: Numpy array of shape (N, 4)
            labels: Numpy array of shape (N, 4)
        """
        self.features = torch.tensor(features, dtype=torch.float32)
        self.labels = torch.tensor(labels, dtype=torch.float32)

        assert len(self.features) == len(self.labels), \
            f"Features and labels must have same length: {len(self.features)} != {len(self.labels)}"

    def __len__(self) -> int:
        """Return the number of samples in the dataset."""
        return len(self.features)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Get a single sample.

        Args:
            idx: Index of the sample

        Returns:
            Tuple of (features, labels) as tensors
        """
        return self.features[idx], self.labels[idx]


def create_train_val_split(
    features: np.ndarray,
    labels: np.ndarray,
    val_split: float = 0.2,
    seed: int = 42
) -> Tuple[TelemetryDataset, TelemetryDataset]:
    """
    Create train and validation datasets with random split.

    Args:
        features: All features
        labels: All labels
        val_split: Fraction of data to use for validation (default: 0.2)
        seed: Random seed for reproducibility

    Returns:
        Tuple of (train_dataset, val_dataset)
    """
    # Set random seed for reproducibility
    np.random.seed(seed)

    # Create random indices
    n_samples = len(features)
    indices = np.random.permutation(n_samples)

    # Calculate split point
    val_size = int(n_samples * val_split)
    train_size = n_samples - val_size

    # Split indices
    train_indices = indices[:train_size]
    val_indices = indices[train_size:]

    # Create datasets
    train_dataset = TelemetryDataset(features[train_indices], labels[train_indices])
    val_dataset = TelemetryDataset(features[val_indices], labels[val_indices])

    print(f"\nDataset split:")
    print(f"  Training samples: {len(train_dataset)}")
    print(f"  Validation samples: {len(val_dataset)}")

    return train_dataset, val_dataset
