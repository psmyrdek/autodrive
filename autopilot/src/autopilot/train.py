"""Training script for autopilot neural network."""

import argparse
import os
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from tqdm import tqdm

from autopilot.data_loader import load_telemetry_sequences, normalize_sequences
from autopilot.dataset import create_train_val_split
from autopilot.model import create_model, save_model
from autopilot.wandb_logger import create_logger


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


def train_epoch(model, train_loader, criterion, optimizer, device, verbose=True, scheduler=None, label_smoothing=0.0):
    """
    Train for one epoch.

    Args:
        model: Neural network model
        train_loader: Training data loader
        criterion: Loss function
        optimizer: Optimizer
        device: Device to train on
        verbose: Whether to show progress bar
        scheduler: Learning rate scheduler (OneCycle, steps per batch)
        label_smoothing: Label smoothing factor (0.0 = no smoothing)

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

        # Apply label smoothing: smooth 1.0 -> (1-smoothing), 0.0 -> smoothing
        if label_smoothing > 0:
            labels_smoothed = labels * (1.0 - label_smoothing) + label_smoothing / 2.0
        else:
            labels_smoothed = labels

        # Forward pass
        optimizer.zero_grad()
        outputs = model(features)
        loss = criterion(outputs, labels_smoothed)

        # Backward pass
        loss.backward()
        optimizer.step()

        # Step the scheduler (OneCycle steps per batch)
        if scheduler is not None:
            scheduler.step()

        # Track metrics (use original labels for accuracy, not smoothed)
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
    quiet: bool = False,
    seq_len: int = 10,
    hidden_size: int = 128,
    num_layers: int = 2,
    fc_hidden: int = 64,
    dropout: float = 0.1,
    wandb: bool = True,
    early_stopping_patience: int = 5,
    weight_decay: float = 3e-4,
    label_smoothing: float = 0.05,
    use_scheduler: bool = True,
    max_lr: float = 3e-3
):
    """
    Train GRU-based autopilot model on sequence data.

    Args:
        telemetry_dir: Directory containing telemetry JSON files
        output_dir: Directory to save model checkpoints
        epochs: Number of training epochs
        batch_size: Batch size for training
        learning_rate: Base learning rate for optimizer (default: 0.001)
        val_split: Validation split ratio
        device: Device to train on (cuda/mps/cpu)
        quiet: Reduce logging output (auto-enabled in CI)
        seq_len: Sequence length for GRU (default: 10 timesteps = 500ms)
        hidden_size: GRU hidden size (default: 128)
        num_layers: Number of GRU layers (default: 2)
        fc_hidden: FC layer size after GRU (default: 64)
        dropout: Dropout rate (default: 0.1)
        early_stopping_patience: Stop training after N epochs without val loss improvement (default: 5)
        weight_decay: L2 regularization for AdamW (default: 3e-4)
        label_smoothing: Label smoothing factor for loss (default: 0.05)
        use_scheduler: Use OneCycle LR scheduler (default: True)
        max_lr: Maximum learning rate for OneCycle scheduler (default: 3e-3)
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
    print(f"Model type: GRU (sequence-based)")
    print(f"\n=== Regularization Settings ===")
    print(f"Weight decay (L2): {weight_decay:.2e}")
    print(f"Label smoothing: {label_smoothing:.3f}")
    print(f"Dropout: {dropout:.2f}")
    if early_stopping_patience > 0:
        print(f"Early stopping patience: {early_stopping_patience} epochs")
    else:
        print("Early stopping: disabled")

    # Initialize Weights & Biases logging
    config = {
        'epochs': epochs,
        'batch_size': batch_size,
        'learning_rate': learning_rate,
        'val_split': val_split,
        'seq_len': seq_len,
        'hidden_size': hidden_size,
        'num_layers': num_layers,
        'fc_hidden': fc_hidden,
        'dropout': dropout,
        'device': device,
        'model_type': 'GRU',
        'early_stopping_patience': early_stopping_patience,
        'weight_decay': weight_decay,
        'label_smoothing': label_smoothing,
        'use_scheduler': use_scheduler,
        'max_lr': max_lr if use_scheduler else None
    }
    logger = create_logger(
        enabled=wandb,
        project="autodrive-autopilot",
        config=config,
        tags=['gru', 'sequence-model']
    )

    # Load sequence data
    print("\n=== Loading Data ===")
    print(f"Loading sequences with seq_len={seq_len}")
    features, labels = load_telemetry_sequences(telemetry_dir, seq_len=seq_len)

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
    features_normalized, norm_params = normalize_sequences(features)
    print(f"Normalization params (per feature): mean shape={len(norm_params['mean'])}, std shape={len(norm_params['std'])}")

    # Create train/val split
    train_dataset, val_dataset = create_train_val_split(
        features_normalized, labels, val_split=val_split
    )

    # Create data loaders
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

    # Create GRU model
    print("\n=== Creating Model ===")
    model = create_model(
        input_size=10,  # 6 sensors + speed + 4 previous actions
        hidden_size=hidden_size,
        num_layers=num_layers,
        fc_hidden=fc_hidden,
        dropout=dropout
    )
    model.to(device)

    # Loss and optimizer
    # Use BCEWithLogitsLoss with pos_weight for handling class imbalance
    # This combines sigmoid + BCE for numerical stability and uses class weights
    # Label smoothing reduces overfitting by making targets (1-smoothing, smoothing) instead of (1, 0)
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weights)

    # Use AdamW (Adam with decoupled weight decay) for better regularization
    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate, weight_decay=weight_decay)

    # Learning rate scheduler (OneCycle for fast convergence with less overfitting)
    scheduler = None
    if use_scheduler:
        total_steps = len(train_loader) * epochs
        scheduler = torch.optim.lr_scheduler.OneCycleLR(
            optimizer,
            max_lr=max_lr,
            total_steps=total_steps,
            pct_start=0.03,  # 3% warmup
            anneal_strategy='cos',
            div_factor=max_lr / learning_rate,  # initial_lr = max_lr / div_factor
            final_div_factor=1e4  # final_lr = initial_lr / final_div_factor
        )
        print(f"Using OneCycle LR scheduler: base_lr={learning_rate:.2e}, max_lr={max_lr:.2e}")
    else:
        print(f"Using constant learning rate: {learning_rate:.2e}")

    # Training loop
    print(f"\n=== Training for {epochs} epochs ===")
    if quiet:
        print(f"Running in quiet mode (printing every {print_freq} epochs)")
    if early_stopping_patience > 0:
        print(f"Early stopping: patience={early_stopping_patience} epochs")

    best_val_loss = float('inf')
    best_val_acc = 0.0
    best_epoch = 0
    patience_counter = 0

    for epoch in range(epochs):
        # Train
        train_metrics = train_epoch(
            model, train_loader, criterion, optimizer, device,
            verbose=not quiet, scheduler=scheduler, label_smoothing=label_smoothing
        )

        # Validate
        val_metrics = validate(model, val_loader, criterion, device)

        # Log to W&B
        logger.log_train_metrics(train_metrics, epoch + 1)
        logger.log_val_metrics(val_metrics, epoch + 1)

        # Log current learning rate
        if scheduler is not None:
            current_lr = optimizer.param_groups[0]['lr']
            logger.log({'learning_rate': current_lr}, step=epoch + 1)

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

        # Save best model and early stopping
        if val_metrics['loss'] < best_val_loss:
            best_val_loss = val_metrics['loss']
            best_val_acc = val_metrics['overall_accuracy']
            best_epoch = epoch + 1
            patience_counter = 0  # Reset patience counter
            model_path = output_path / "best_model.pt"
            save_model(model, str(model_path), norm_params)
            if should_print or not quiet:
                print(f"✓ Saved best model (epoch {best_epoch}, val_loss: {best_val_loss:.4f}, val_acc: {best_val_acc:.3f})")
        else:
            patience_counter += 1
            if early_stopping_patience > 0 and patience_counter >= early_stopping_patience:
                print(f"\n⚠ Early stopping triggered at epoch {epoch + 1}")
                print(f"  No improvement in val_loss for {early_stopping_patience} epochs")
                print(f"  Best model from epoch {best_epoch} (val_loss: {best_val_loss:.4f}, val_acc: {best_val_acc:.3f})")
                break

    # Save final model
    final_model_path = output_path / "final_model.pt"
    save_model(model, str(final_model_path), norm_params)

    print(f"\n=== Training Complete ===")
    print(f"Best epoch: {best_epoch}/{epochs}")
    print(f"Best validation loss: {best_val_loss:.4f}")
    print(f"Best validation accuracy: {best_val_acc:.3f}")
    print(f"Models saved to {output_dir}/")

    # Log summary to W&B
    logger.log_summary({
        'best_epoch': best_epoch,
        'best_val_loss': best_val_loss,
        'best_val_accuracy': best_val_acc
    })
    logger.finish()


def main():
    """Command line interface for training GRU autopilot model."""
    parser = argparse.ArgumentParser(description="Train GRU-based autopilot neural network")

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
        "--quiet",
        action="store_true",
        help="Reduce logging output (auto-enabled in CI environments)"
    )
    parser.add_argument(
        "--seq-len",
        type=int,
        default=10,
        help="Sequence length for GRU (default: 10 timesteps = 500ms)"
    )
    parser.add_argument(
        "--hidden-size",
        type=int,
        default=128,
        help="GRU hidden size (default: 128)"
    )
    parser.add_argument(
        "--num-layers",
        type=int,
        default=2,
        help="Number of GRU layers (default: 2)"
    )
    parser.add_argument(
        "--fc-hidden",
        type=int,
        default=64,
        help="FC layer size after GRU (default: 64)"
    )
    parser.add_argument(
        "--dropout",
        type=float,
        default=0.1,
        help="Dropout rate (default: 0.1)"
    )
    parser.add_argument(
        "--early-stopping-patience",
        type=int,
        default=5,
        help="Stop training after N epochs without val loss improvement (default: 5, 0 to disable)"
    )
    parser.add_argument(
        "--weight-decay",
        type=float,
        default=3e-4,
        help="L2 regularization weight decay for AdamW (default: 3e-4)"
    )
    parser.add_argument(
        "--label-smoothing",
        type=float,
        default=0.05,
        help="Label smoothing factor (default: 0.05, range: 0.0-0.5)"
    )
    parser.add_argument(
        "--no-scheduler",
        action="store_true",
        help="Disable OneCycle LR scheduler (use constant learning rate)"
    )
    parser.add_argument(
        "--max-lr",
        type=float,
        default=3e-3,
        help="Maximum learning rate for OneCycle scheduler (default: 3e-3)"
    )

    args = parser.parse_args()

    train(
        telemetry_dir=args.telemetry_dir,
        output_dir=args.output_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        val_split=args.val_split,
        device=args.device,
        quiet=args.quiet,
        seq_len=args.seq_len,
        hidden_size=args.hidden_size,
        num_layers=args.num_layers,
        fc_hidden=args.fc_hidden,
        dropout=args.dropout,
        early_stopping_patience=args.early_stopping_patience,
        weight_decay=args.weight_decay,
        label_smoothing=args.label_smoothing,
        use_scheduler=not args.no_scheduler,
        max_lr=args.max_lr
    )


if __name__ == "__main__":
    main()
