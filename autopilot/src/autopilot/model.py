"""Neural network model for autopilot control."""

import torch
import torch.nn as nn


class AutopilotNet(nn.Module):
    """
    Feedforward neural network for autopilot control.

    Architecture:
        Input (4) → FC(128) → ReLU → Dropout(0.1) → FC(64) → ReLU → Dropout(0.1) → FC(32) → ReLU → FC(4)

    Input features: [l_sensor_range, c_sensor_range, r_sensor_range, speed]
    Output: [w_logit, a_logit, s_logit, d_logit] - logits for each key press (apply sigmoid for probabilities)
    """

    def __init__(self, input_size: int = 4, hidden_sizes: list = None, output_size: int = 4):
        """
        Initialize the network.

        Args:
            input_size: Number of input features (default: 4)
            hidden_sizes: List of hidden layer sizes (default: [128, 64, 32])
            output_size: Number of output classes (default: 4 for WASD)
        """
        super().__init__()

        if hidden_sizes is None:
            hidden_sizes = [128, 64, 32]  # Increased capacity from [64, 32]

        layers = []

        # Input layer
        prev_size = input_size
        for i, hidden_size in enumerate(hidden_sizes):
            layers.extend([
                nn.Linear(prev_size, hidden_size),
                nn.ReLU(),
            ])
            # Only add dropout to deeper layers if we have enough data
            # With limited data, dropout can hurt performance
            if i < len(hidden_sizes) - 1:  # Skip dropout on last hidden layer
                layers.append(nn.Dropout(0.1))  # Reduced from 0.2
            prev_size = hidden_size

        # Output layer (no activation - outputs logits for BCEWithLogitsLoss)
        layers.append(nn.Linear(prev_size, output_size))

        self.network = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass through the network.

        Args:
            x: Input tensor of shape (batch_size, input_size)

        Returns:
            Output tensor of shape (batch_size, output_size) with logits (not probabilities)
        """
        return self.network(x)

    def predict_commands(self, x: torch.Tensor, threshold: float = 0.5) -> torch.Tensor:
        """
        Predict binary commands from input features.

        Args:
            x: Input tensor of shape (batch_size, input_size)
            threshold: Probability threshold for binary decision (default: 0.5)

        Returns:
            Binary tensor of shape (batch_size, output_size) with 0/1 values
        """
        logits = self.forward(x)
        probabilities = torch.sigmoid(logits)
        return (probabilities >= threshold).float()


def create_model(input_size: int = 4, hidden_sizes: list = None, output_size: int = 4) -> AutopilotNet:
    """
    Factory function to create an AutopilotNet model.

    Args:
        input_size: Number of input features
        hidden_sizes: List of hidden layer sizes
        output_size: Number of output classes

    Returns:
        Initialized AutopilotNet model
    """
    model = AutopilotNet(input_size, hidden_sizes, output_size)
    print("\nModel architecture:")
    print(model)

    # Count parameters
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)

    print(f"\nTotal parameters: {total_params:,}")
    print(f"Trainable parameters: {trainable_params:,}")

    return model


def save_model(model: AutopilotNet, path: str, normalization_params: dict = None):
    """
    Save model checkpoint.

    Args:
        model: Model to save
        path: Path to save the model
        normalization_params: Optional normalization parameters to save with model
    """
    checkpoint = {
        'model_state_dict': model.state_dict(),
        'model_config': {
            'input_size': 4,
            'output_size': 4
        }
    }

    if normalization_params is not None:
        checkpoint['normalization_params'] = normalization_params

    torch.save(checkpoint, path)
    print(f"Model saved to {path}")


def load_model(path: str, device: str = 'cpu') -> tuple:
    """
    Load model checkpoint.

    Args:
        path: Path to the saved model
        device: Device to load the model on

    Returns:
        Tuple of (model, normalization_params)
    """
    checkpoint = torch.load(path, map_location=device, weights_only=False)

    model = create_model(
        input_size=checkpoint['model_config']['input_size'],
        output_size=checkpoint['model_config']['output_size']
    )
    model.load_state_dict(checkpoint['model_state_dict'])
    model.to(device)
    model.eval()

    normalization_params = checkpoint.get('normalization_params', None)

    print(f"Model loaded from {path}")

    return model, normalization_params
