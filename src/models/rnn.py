"""
Simple Recurrent Neural Network
Processes images as row-wise sequential data.
"""

import torch
import torch.nn as nn

class SequentialRNN(nn.Module):
    def __init__(self, input_size: int = 672, hidden_size: int = 128, num_layers: int = 2, num_classes: int = 4):
        """
        Input size calculation: 224 width * 3 channels = 672 features per time step.
        Sequence length = 224 (height/rows).
        """
        super(SequentialRNN, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        # batch_first=True expects input shape [batch_size, seq_length, features]
        self.rnn = nn.RNN(input_size, hidden_size, num_layers, batch_first=True, nonlinearity='relu')
        
        self.classifier = nn.Sequential(
            nn.Linear(hidden_size, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, num_classes)
        )

    def forward(self, x):
        # x shape: [batch, channels, height, width] -> [batch, 3, 224, 224]
        batch_size, c, h, w = x.size()
        
        # Reshape to [batch, seq_length (height), features (width * channels)]
        x = x.view(batch_size, c, h * w)            # [batch, 3, 50176]
        x = x.view(batch_size, h, w * c)            # [batch, 224, 672]
        
        # RNN outputs: out = hidden states for all time steps, hn = final hidden state
        out, hn = self.rnn(x)
        
        # Decoding the hidden state of the last time step
        last_time_step_out = out[:, -1, :]
        return self.classifier(last_time_step_out)