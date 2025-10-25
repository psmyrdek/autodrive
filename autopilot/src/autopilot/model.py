"""Neural network model for autopilot control."""

import torch
import torch.nn as nn


class AutopilotGRU(nn.Module):
    """
    GRU-based recurrent neural network for autopilot control.

    Architecture:
        Input (batch, seq_len, 10) → GRU(2 layers, 128 hidden) → FC(64) → ReLU → Dropout(0.1) → FC(4)

    Input features per timestep: [l_sensor, ml_sensor, c_sensor, mr_sensor, r_sensor, speed,
                                   w_pressed_prev, a_pressed_prev, s_pressed_prev, d_pressed_prev]
    Output: [w_logit, a_logit, s_logit, d_logit] - logits for each key press (apply sigmoid for probabilities)
    """

    def __init__(
        self,
        input_size: int = 10,
        hidden_size: int = 128,
        num_layers: int = 2,
        fc_hidden: int = 64,
        output_size: int = 4,
        dropout: float = 0.1
    ):
        """
        Initialize the GRU network.

        Args:
            input_size: Number of input features per timestep (default: 10)
            hidden_size: GRU hidden state size (default: 128)
            num_layers: Number of GRU layers (default: 2)
            fc_hidden: Size of FC layer after GRU (default: 64)
            output_size: Number of output classes (default: 4 for WASD)
            dropout: Dropout rate (default: 0.1)
        """
        super().__init__()

        self.input_size = input_size
        self.hidden_size = hidden_size
        self.num_layers = num_layers

        # GRU layers
        self.gru = nn.GRU(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0
        )

        # Fully connected layers after GRU
        self.fc = nn.Sequential(
            nn.Linear(hidden_size, fc_hidden),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(fc_hidden, output_size)
        )

    def forward(self, x: torch.Tensor, hidden: torch.Tensor = None) -> torch.Tensor:
        """
        Forward pass through the network.

        Args:
            x: Input tensor of shape (batch_size, seq_len, input_size)
            hidden: Optional hidden state of shape (num_layers, batch_size, hidden_size)

        Returns:
            Output tensor of shape (batch_size, output_size) with logits (not probabilities)
        """
        # x shape: (batch, seq_len, input_size)
        # GRU output shape: (batch, seq_len, hidden_size)
        gru_out, _ = self.gru(x, hidden)

        # Take the output from the last timestep
        # Shape: (batch, hidden_size)
        last_output = gru_out[:, -1, :]

        # Pass through FC layers
        # Shape: (batch, output_size)
        logits = self.fc(last_output)

        return logits

    def predict_commands(self, x: torch.Tensor, threshold: float = 0.5) -> torch.Tensor:
        """
        Predict binary commands from input features.

        Args:
            x: Input tensor of shape (batch_size, seq_len, input_size)
            threshold: Probability threshold for binary decision (default: 0.5)

        Returns:
            Binary tensor of shape (batch_size, output_size) with 0/1 values
        """
        logits = self.forward(x)
        probabilities = torch.sigmoid(logits)
        return (probabilities >= threshold).float()


def create_model(
    input_size: int = 10,
    output_size: int = 4,
    hidden_size: int = 128,
    num_layers: int = 2,
    fc_hidden: int = 64,
    dropout: float = 0.1
):
    """
    Create GRU-based autopilot model.

    Args:
        input_size: Number of input features (default: 10)
        output_size: Number of output classes (default: 4 for WASD)
        hidden_size: GRU hidden size (default: 128)
        num_layers: Number of GRU layers (default: 2)
        fc_hidden: FC layer size after GRU (default: 64)
        dropout: Dropout rate (default: 0.1)

    Returns:
        Initialized AutopilotGRU model
    """
    model = AutopilotGRU(
        input_size=input_size,
        hidden_size=hidden_size,
        num_layers=num_layers,
        fc_hidden=fc_hidden,
        output_size=output_size,
        dropout=dropout
    )

    print("\nModel architecture:")
    print(model)

    # Count parameters
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)

    print(f"\nTotal parameters: {total_params:,}")
    print(f"Trainable parameters: {trainable_params:,}")

    return model


def save_model(model: AutopilotGRU, path: str, normalization_params: dict = None):
    """
    Save GRU model checkpoint.

    Args:
        model: AutopilotGRU model to save
        path: Path to save the model
        normalization_params: Optional normalization parameters to save with model
    """
    if not isinstance(model, AutopilotGRU):
        raise ValueError(f"Expected AutopilotGRU model, got {type(model)}")

    checkpoint = {
        'model_state_dict': model.state_dict(),
        'model_config': {
            'input_size': model.input_size,
            'hidden_size': model.hidden_size,
            'num_layers': model.num_layers,
            'fc_hidden': model.fc[0].out_features,  # First FC layer after GRU
            'output_size': model.fc[-1].out_features,  # Last FC layer
        }
    }

    if normalization_params is not None:
        checkpoint['normalization_params'] = normalization_params

    torch.save(checkpoint, path)
    print(f"Model saved to {path}")


def load_model(path: str, device: str = 'cpu') -> tuple:
    """
    Load GRU model checkpoint.

    Args:
        path: Path to the saved model
        device: Device to load the model on

    Returns:
        Tuple of (model, normalization_params)
    """
    checkpoint = torch.load(path, map_location=device, weights_only=False)
    config = checkpoint['model_config']

    model = create_model(
        input_size=config['input_size'],
        hidden_size=config.get('hidden_size', 128),
        num_layers=config.get('num_layers', 2),
        fc_hidden=config.get('fc_hidden', 64),
        output_size=config['output_size']
    )

    model.load_state_dict(checkpoint['model_state_dict'])
    model.to(device)
    model.eval()

    normalization_params = checkpoint.get('normalization_params', None)

    print(f"GRU model loaded from {path}")

    return model, normalization_params
