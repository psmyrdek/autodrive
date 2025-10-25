"""Data augmentation utilities for telemetry data."""

import numpy as np


def mirror_telemetry(features: np.ndarray, labels: np.ndarray) -> tuple:
    """
    Mirror telemetry data by swapping left/right sensors and A/D keys.
    This effectively doubles the training data by creating mirrored driving scenarios.

    Args:
        features: Array of shape (N, 6) - [l_sensor, ml_sensor, c_sensor, mr_sensor, r_sensor, speed]
        labels: Array of shape (N, 4) - [w_pressed, a_pressed, s_pressed, d_pressed]

    Returns:
        Tuple of (mirrored_features, mirrored_labels)
    """
    mirrored_features = features.copy()
    mirrored_labels = labels.copy()

    # Swap left and right sensor readings
    # L (0) <-> R (4), ML (1) <-> MR (3), C (2) stays same, speed (5) stays same
    mirrored_features[:, [0, 4]] = mirrored_features[:, [4, 0]]  # Swap L and R
    mirrored_features[:, [1, 3]] = mirrored_features[:, [3, 1]]  # Swap ML and MR

    # Swap A and D key presses
    mirrored_labels[:, [1, 3]] = mirrored_labels[:, [3, 1]]  # Swap columns 1 and 3

    return mirrored_features, mirrored_labels


def add_sensor_noise(features: np.ndarray, noise_level: float = 2.0) -> np.ndarray:
    """
    Add small Gaussian noise to sensor readings to improve robustness.
    Speed is not modified as it's more reliable.

    Args:
        features: Array of shape (N, 6) - [l_sensor, ml_sensor, c_sensor, mr_sensor, r_sensor, speed]
        noise_level: Standard deviation of Gaussian noise (default: 2.0 pixels)

    Returns:
        Features with added noise
    """
    noisy_features = features.copy()

    # Add noise only to sensor readings (first 5 columns), not speed
    sensor_noise = np.random.normal(0, noise_level, size=(len(features), 5))
    noisy_features[:, :5] += sensor_noise

    # Clamp sensor values to valid range [0, 1500]
    noisy_features[:, :5] = np.clip(noisy_features[:, :5], 0, 1500)

    return noisy_features


def augment_dataset(features: np.ndarray, labels: np.ndarray,
                    mirror: bool = True, add_noise: bool = True,
                    noise_level: float = 2.0) -> tuple:
    """
    Augment telemetry dataset with various techniques.

    Args:
        features: Original features
        labels: Original labels
        mirror: Whether to add mirrored data
        add_noise: Whether to add noisy versions
        noise_level: Noise level if add_noise is True

    Returns:
        Tuple of (augmented_features, augmented_labels)
    """
    augmented_features = [features]
    augmented_labels = [labels]

    # Add mirrored data
    if mirror:
        mirrored_f, mirrored_l = mirror_telemetry(features, labels)
        augmented_features.append(mirrored_f)
        augmented_labels.append(mirrored_l)

    # Add noisy versions (both original and mirrored if applicable)
    if add_noise:
        noisy_features = add_sensor_noise(features, noise_level)
        augmented_features.append(noisy_features)
        augmented_labels.append(labels.copy())

        if mirror:
            noisy_mirrored_f = add_sensor_noise(mirrored_f, noise_level)
            augmented_features.append(noisy_mirrored_f)
            augmented_labels.append(mirrored_l.copy())

    # Concatenate all augmented data
    final_features = np.concatenate(augmented_features, axis=0)
    final_labels = np.concatenate(augmented_labels, axis=0)

    print(f"Augmentation increased dataset from {len(features)} to {len(final_features)} samples")

    return final_features, final_labels
