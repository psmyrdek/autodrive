"""Weights & Biases integration for training visualization.

This module provides a clean interface for logging training metrics to W&B.
"""

from typing import Optional, Dict, Any
import wandb


class WandbLogger:
    """Logger for tracking training metrics with Weights & Biases."""

    def __init__(self, enabled: bool = True):
        """
        Initialize the W&B logger.

        Args:
            enabled: Whether to enable W&B logging (default: True)
        """
        self.enabled = enabled
        self.run = None

    def init(
        self,
        project: str = "autodrive-autopilot",
        name: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None,
        tags: Optional[list] = None
    ):
        """
        Initialize a W&B run.

        Args:
            project: W&B project name
            name: Run name (optional, auto-generated if not provided)
            config: Hyperparameters and configuration to log
            tags: Tags for organizing runs
        """
        if not self.enabled:
            return

        try:
            self.run = wandb.init(
                project=project,
                name=name,
                config=config,
                tags=tags,
                # Allows multiple runs in same process
                reinit=True
            )
            print(f"✓ Weights & Biases initialized: {self.run.url}")
        except Exception as e:
            print(f"⚠ Failed to initialize W&B: {e}")
            print("  Continuing without W&B logging...")
            self.enabled = False

    def log(self, metrics: Dict[str, Any], step: Optional[int] = None):
        """
        Log metrics to W&B.

        Args:
            metrics: Dictionary of metric names and values
            step: Optional step number (e.g., epoch number)
        """
        if not self.enabled or self.run is None:
            return

        try:
            if step is not None:
                wandb.log(metrics, step=step)
            else:
                wandb.log(metrics)
        except Exception as e:
            print(f"⚠ Failed to log metrics to W&B: {e}")

    def log_train_metrics(self, metrics: Dict[str, float], epoch: int):
        """
        Log training metrics with 'train/' prefix.

        Args:
            metrics: Training metrics dictionary
            epoch: Current epoch number
        """
        train_metrics = {f"train/{k}": v for k, v in metrics.items()}
        self.log(train_metrics, step=epoch)

    def log_val_metrics(self, metrics: Dict[str, float], epoch: int):
        """
        Log validation metrics with 'val/' prefix.

        Args:
            metrics: Validation metrics dictionary
            epoch: Current epoch number
        """
        val_metrics = {f"val/{k}": v for k, v in metrics.items()}
        self.log(val_metrics, step=epoch)

    def log_summary(self, summary: Dict[str, Any]):
        """
        Log summary metrics (best values, final results).

        Args:
            summary: Dictionary of summary metrics
        """
        if not self.enabled or self.run is None:
            return

        try:
            for key, value in summary.items():
                wandb.run.summary[key] = value
        except Exception as e:
            print(f"⚠ Failed to log summary to W&B: {e}")

    def finish(self):
        """Finish the W&B run."""
        if not self.enabled or self.run is None:
            return

        try:
            wandb.finish()
            print("✓ W&B run finished")
        except Exception as e:
            print(f"⚠ Failed to finish W&B run: {e}")

    def watch_model(self, model, log: str = "gradients", log_freq: int = 100):
        """
        Watch model gradients and parameters.

        Args:
            model: PyTorch model to watch
            log: What to log - "gradients", "parameters", "all", or None
            log_freq: Frequency of logging (in steps)
        """
        if not self.enabled or self.run is None:
            return

        try:
            wandb.watch(model, log=log, log_freq=log_freq)
        except Exception as e:
            print(f"⚠ Failed to watch model: {e}")


def create_logger(
    enabled: bool = True,
    project: str = "autodrive-autopilot",
    name: Optional[str] = None,
    config: Optional[Dict[str, Any]] = None,
    tags: Optional[list] = None
) -> WandbLogger:
    """
    Create and initialize a W&B logger.

    Args:
        enabled: Whether to enable W&B logging
        project: W&B project name
        name: Run name (optional)
        config: Hyperparameters and configuration to log
        tags: Tags for organizing runs

    Returns:
        Initialized WandbLogger instance
    """
    logger = WandbLogger(enabled=enabled)
    if enabled:
        logger.init(project=project, name=name, config=config, tags=tags)
    return logger
