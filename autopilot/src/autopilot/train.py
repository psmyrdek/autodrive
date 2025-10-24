"""Training script for autopilot neural network."""

import argparse
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from tqdm import tqdm

from autopilot.data_loader import load_telemetry_data, normalize_features
from autopilot.dataset import create_train_val_split
from autopilot.model import create_model, save_model


def calculate_accuracy(predictions: torch.Tensor, labels: torch.Tensor, threshold: float = 0.5) -> dict:
    """
    Calculate per-key accuracy metrics.

    Args:
        predictions: Model predictions (batch_size, 4)
        labels: Ground truth labels (batch_size, 4)
        threshold: Threshold for binary classification

    Returns:
        Dictionary with accuracy for each key and overall accuracy
    """
    # Convert probabilities to binary predictions
    pred_binary = (predictions >= threshold).float()

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


def train_epoch(model, train_loader, criterion, optimizer, device):
    """
    Train for one epoch.

    Args:
        model: Neural network model
        train_loader: Training data loader
        criterion: Loss function
        optimizer: Optimizer
        device: Device to train on

    Returns:
        Dictionary with average loss and accuracy metrics
    """
    model.train()
    total_loss = 0
    all_accuracies = []

    progress_bar = tqdm(train_loader, desc="Training")

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
    device: str = None
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
    """
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
    model = create_model()
    model.to(device)

    # Loss and optimizer
    criterion = nn.BCELoss()  # Binary Cross Entropy for multi-label classification
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)

    # Training loop
    print(f"\n=== Training for {epochs} epochs ===")
    best_val_loss = float('inf')

    for epoch in range(epochs):
        print(f"\nEpoch {epoch + 1}/{epochs}")

        # Train
        train_metrics = train_epoch(model, train_loader, criterion, optimizer, device)

        # Validate
        val_metrics = validate(model, val_loader, criterion, device)

        # Print metrics
        print(f"Train - Loss: {train_metrics['loss']:.4f}, Acc: {train_metrics['overall_accuracy']:.3f}")
        print(f"  W: {train_metrics['w_accuracy']:.3f}, A: {train_metrics['a_accuracy']:.3f}, "
              f"S: {train_metrics['s_accuracy']:.3f}, D: {train_metrics['d_accuracy']:.3f}")

        print(f"Val   - Loss: {val_metrics['loss']:.4f}, Acc: {val_metrics['overall_accuracy']:.3f}")
        print(f"  W: {val_metrics['w_accuracy']:.3f}, A: {val_metrics['a_accuracy']:.3f}, "
              f"S: {val_metrics['s_accuracy']:.3f}, D: {val_metrics['d_accuracy']:.3f}")

        # Save best model
        if val_metrics['loss'] < best_val_loss:
            best_val_loss = val_metrics['loss']
            model_path = output_path / "best_model.pt"
            save_model(model, str(model_path), norm_params)
            print(f"✓ Saved best model (val_loss: {best_val_loss:.4f})")

    # Save final model
    final_model_path = output_path / "final_model.pt"
    save_model(model, str(final_model_path), norm_params)

    print(f"\n=== Training Complete ===")
    print(f"Best validation loss: {best_val_loss:.4f}")
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

    args = parser.parse_args()

    train(
        telemetry_dir=args.telemetry_dir,
        output_dir=args.output_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        val_split=args.val_split,
        device=args.device
    )


if __name__ == "__main__":
    main()
