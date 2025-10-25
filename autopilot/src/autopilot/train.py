"""Training script for autopilot neural network."""

import argparse
import os
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from tqdm import tqdm

from autopilot.data_loader import load_telemetry_data, normalize_features
from autopilot.dataset import create_train_val_split
from autopilot.model import create_model, save_model
from autopilot.augmentation import augment_dataset


def calculate_accuracy(predictions: torch.Tensor, labels: torch.Tensor, threshold: float = 0.5) -> dict:
    """
    Calculate per-key accuracy metrics.

    Args:
        predictions: Model predictions as logits (batch_size, 4)
        labels: Ground truth labels (batch_size, 4)
        threshold: Threshold for binary classification

    Returns:
        Dictionary with accuracy for each key and overall accuracy
    """
    # Convert logits to probabilities, then to binary predictions
    probabilities = torch.sigmoid(predictions)
    pred_binary = (probabilities >= threshold).float()

    # Calculate per-key accuracy
    correct = (pred_binary == labels).float()

    accuracies = {
        'w_accuracy': correct[:, 0].mean().item(),
        'a_accuracy': correct[:, 1].mean().item(),
        's_accuracy': correct[:, 2].mean().item(),
        'd_accuracy': correct[:, 3].mean().item(),
        'overall_accuracy': correct.mean().item()
    }

    return accuracies


def train_epoch(model, train_loader, criterion, optimizer, device, verbose=True):
    """
    Train for one epoch.

    Args:
        model: Neural network model
        train_loader: Training data loader
        criterion: Loss function
        optimizer: Optimizer
        device: Device to train on
        verbose: Whether to show progress bar

    Returns:
        Dictionary with average loss and accuracy metrics
    """
    model.train()
    total_loss = 0
    all_accuracies = []

    # Disable progress bar in CI or when verbose=False
    progress_bar = tqdm(train_loader, desc="Training", disable=not verbose)

    for features, labels in progress_bar:
        features = features.to(device)
        labels = labels.to(device)

        # Forward pass
        optimizer.zero_grad()
        outputs = model(features)
        loss = criterion(outputs, labels)

        # Backward pass
        loss.backward()
        optimizer.step()

        # Track metrics
        total_loss += loss.item()
        accuracies = calculate_accuracy(outputs, labels)
        all_accuracies.append(accuracies)

        # Update progress bar
        if verbose:
            progress_bar.set_postfix({
                'loss': f"{loss.item():.4f}",
                'acc': f"{accuracies['overall_accuracy']:.3f}"
            })

    # Calculate average metrics
    avg_loss = total_loss / len(train_loader)
    avg_accuracies = {
        key: sum(acc[key] for acc in all_accuracies) / len(all_accuracies)
        for key in all_accuracies[0].keys()
    }
    avg_accuracies['loss'] = avg_loss

    return avg_accuracies


def validate(model, val_loader, criterion, device):
    """
    Validate the model.

    Args:
        model: Neural network model
        val_loader: Validation data loader
        criterion: Loss function
        device: Device to validate on

    Returns:
        Dictionary with average loss and accuracy metrics
    """
    model.eval()
    total_loss = 0
    all_accuracies = []

    with torch.no_grad():
        for features, labels in val_loader:
            features = features.to(device)
            labels = labels.to(device)

            # Forward pass
            outputs = model(features)
            loss = criterion(outputs, labels)

            # Track metrics
            total_loss += loss.item()
            accuracies = calculate_accuracy(outputs, labels)
            all_accuracies.append(accuracies)

    # Calculate average metrics
    avg_loss = total_loss / len(val_loader)
    avg_accuracies = {
        key: sum(acc[key] for acc in all_accuracies) / len(all_accuracies)
        for key in all_accuracies[0].keys()
    }
    avg_accuracies['loss'] = avg_loss

    return avg_accuracies


def train(
    telemetry_dir: str = "../server/telemetry",
    output_dir: str = "./models",
    epochs: int = 50,
    batch_size: int = 32,
    learning_rate: float = 0.001,
    val_split: float = 0.2,
    device: str = None,
    use_augmentation: bool = True,
    hidden_sizes: list = None,
    quiet: bool = False
):
    """
    Main training function.

    Args:
        telemetry_dir: Directory containing telemetry JSON files
        output_dir: Directory to save model checkpoints
        epochs: Number of training epochs
        batch_size: Batch size for training
        learning_rate: Learning rate for optimizer
        val_split: Validation split ratio
        device: Device to train on (cuda/mps/cpu)
        use_augmentation: Whether to use data augmentation
        hidden_sizes: Hidden layer sizes for the model
        quiet: Reduce logging output (auto-enabled in CI)
    """
    # Auto-detect CI environment
    is_ci = os.getenv('CI', 'false').lower() == 'true' or os.getenv('GITHUB_ACTIONS') == 'true'
    quiet = quiet or is_ci

    # Set print frequency (every N epochs) when quiet
    print_freq = 10 if quiet else 1
    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # Determine device
    if device is None:
        if torch.cuda.is_available():
            device = 'cuda'
        elif torch.backends.mps.is_available():
            device = 'mps'
        else:
            device = 'cpu'

    print(f"Using device: {device}")

    # Load data
    print("\n=== Loading Data ===")
    features, labels = load_telemetry_data(telemetry_dir)

    # Apply data augmentation
    if use_augmentation:
        print("\n=== Augmenting Data ===")
        features, labels = augment_dataset(features, labels, mirror=True, add_noise=True)

    # Calculate class weights to handle imbalanced data
    print("\n=== Calculating Class Weights ===")
    label_sums = labels.sum(axis=0)
    total_samples = len(labels)

    # Use sqrt formula for more moderate weighting: sqrt(total / count)
    # This prevents extreme penalties while still balancing classes
    # Cap maximum weight at 10.0 to prevent overwhelming the loss
    MAX_WEIGHT = 10.0
    pos_weights = torch.tensor([
        min(MAX_WEIGHT, np.sqrt(total_samples / (label_sums[i] + 1.0)))  # Add 1.0 to handle zero counts
        for i in range(4)
    ], dtype=torch.float32).to(device if device else 'cpu')

    print(f"Class distribution: W={label_sums[0]:.0f} ({label_sums[0]/total_samples*100:.1f}%), "
          f"A={label_sums[1]:.0f} ({label_sums[1]/total_samples*100:.1f}%), "
          f"S={label_sums[2]:.0f} ({label_sums[2]/total_samples*100:.1f}%), "
          f"D={label_sums[3]:.0f} ({label_sums[3]/total_samples*100:.1f}%)")
    print(f"Positive class weights: W={pos_weights[0]:.2f}, A={pos_weights[1]:.2f}, "
          f"S={pos_weights[2]:.2f}, D={pos_weights[3]:.2f}")

    # Normalize features
    print("\n=== Normalizing Features ===")
    features_normalized, norm_params = normalize_features(features)
    print(f"Normalization params: mean={norm_params['mean']}, std={norm_params['std']}")

    # Create train/val split
    train_dataset, val_dataset = create_train_val_split(
        features_normalized, labels, val_split=val_split
    )

    # Create data loaders
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

    # Create model
    print("\n=== Creating Model ===")
    model = create_model(hidden_sizes=hidden_sizes)
    model.to(device)

    # Loss and optimizer
    # Use BCEWithLogitsLoss with pos_weight for handling class imbalance
    # This combines sigmoid + BCE for numerical stability and uses class weights
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weights)
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)

    # Training loop
    print(f"\n=== Training for {epochs} epochs ===")
    if quiet:
        print(f"Running in quiet mode (printing every {print_freq} epochs)")

    best_val_loss = float('inf')
    best_val_acc = 0.0
    best_epoch = 0

    for epoch in range(epochs):
        # Train
        train_metrics = train_epoch(model, train_loader, criterion, optimizer, device, verbose=not quiet)

        # Validate
        val_metrics = validate(model, val_loader, criterion, device)

        # Print metrics at intervals or if it's the last epoch
        should_print = (epoch + 1) % print_freq == 0 or epoch == epochs - 1
        if should_print:
            print(f"\nEpoch {epoch + 1}/{epochs}")
            print(f"Train - Loss: {train_metrics['loss']:.4f}, Acc: {train_metrics['overall_accuracy']:.3f}")
            if not quiet:
                print(f"  W: {train_metrics['w_accuracy']:.3f}, A: {train_metrics['a_accuracy']:.3f}, "
                      f"S: {train_metrics['s_accuracy']:.3f}, D: {train_metrics['d_accuracy']:.3f}")
            print(f"Val   - Loss: {val_metrics['loss']:.4f}, Acc: {val_metrics['overall_accuracy']:.3f}")
            if not quiet:
                print(f"  W: {val_metrics['w_accuracy']:.3f}, A: {val_metrics['a_accuracy']:.3f}, "
                      f"S: {val_metrics['s_accuracy']:.3f}, D: {val_metrics['d_accuracy']:.3f}")

        # Save best model
        if val_metrics['loss'] < best_val_loss:
            best_val_loss = val_metrics['loss']
            best_val_acc = val_metrics['overall_accuracy']
            best_epoch = epoch + 1
            model_path = output_path / "best_model.pt"
            save_model(model, str(model_path), norm_params)
            if should_print or not quiet:
                print(f"✓ Saved best model (epoch {best_epoch}, val_loss: {best_val_loss:.4f}, val_acc: {best_val_acc:.3f})")

    # Save final model
    final_model_path = output_path / "final_model.pt"
    save_model(model, str(final_model_path), norm_params)

    print(f"\n=== Training Complete ===")
    print(f"Best epoch: {best_epoch}/{epochs}")
    print(f"Best validation loss: {best_val_loss:.4f}")
    print(f"Best validation accuracy: {best_val_acc:.3f}")
    print(f"Models saved to {output_dir}/")


def main():
    """Command line interface for training."""
    parser = argparse.ArgumentParser(description="Train autopilot neural network")

    parser.add_argument(
        "--telemetry-dir",
        type=str,
        default="../server/telemetry",
        help="Directory containing telemetry JSON files"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="./models",
        help="Directory to save model checkpoints"
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=50,
        help="Number of training epochs"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=32,
        help="Batch size for training"
    )
    parser.add_argument(
        "--learning-rate",
        type=float,
        default=0.001,
        help="Learning rate for optimizer"
    )
    parser.add_argument(
        "--val-split",
        type=float,
        default=0.2,
        help="Validation split ratio"
    )
    parser.add_argument(
        "--device",
        type=str,
        choices=['cuda', 'mps', 'cpu'],
        default=None,
        help="Device to train on (auto-detect if not specified)"
    )
    parser.add_argument(
        "--no-augmentation",
        action="store_true",
        help="Disable data augmentation"
    )
    parser.add_argument(
        "--hidden-sizes",
        type=str,
        default=None,
        help="Hidden layer sizes as JSON array (e.g., '[128, 64, 32]')"
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Reduce logging output (auto-enabled in CI environments)"
    )

    args = parser.parse_args()

    # Parse hidden sizes if provided
    hidden_sizes = None
    if args.hidden_sizes:
        import json
        try:
            hidden_sizes = json.loads(args.hidden_sizes)
            if not isinstance(hidden_sizes, list) or not all(isinstance(x, int) for x in hidden_sizes):
                raise ValueError("Hidden sizes must be a list of integers")
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Error parsing hidden-sizes: {e}")
            print("Expected format: '[128, 64, 32]'")
            return

    train(
        telemetry_dir=args.telemetry_dir,
        output_dir=args.output_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        val_split=args.val_split,
        device=args.device,
        use_augmentation=not args.no_augmentation,
        hidden_sizes=hidden_sizes,
        quiet=args.quiet
    )


if __name__ == "__main__":
    main()
