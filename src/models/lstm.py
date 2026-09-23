"""
Long Short-Term Memory Network
Processes images as row-wise sequential data to capture long-range dependencies.
"""

import torch
import torch.nn as nn

class SequentialLSTM(nn.Module):
    def __init__(self, input_size: int = 672, hidden_size: int = 128, num_layers: int = 2, num_classes: int = 4):
        super(SequentialLSTM, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        
        self.classifier = nn.Sequential(
            nn.Linear(hidden_size, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, num_classes)
        )

    def forward(self, x):
        # x shape: [batch, 3, 224, 224] -> Reshape to [batch, 224, 672]
        batch_size, c, h, w = x.size()
        x = x.view(batch_size, h, w * c)
        
        # LSTM outputs: out = all hidden states, (hn, cn) = final hidden and cell states
        out, (hn, cn) = self.lstm(x)
        
        # Decoding the hidden state of the last time step
        last_time_step_out = out[:, -1, :]
        return self.classifier(last_time_step_out)