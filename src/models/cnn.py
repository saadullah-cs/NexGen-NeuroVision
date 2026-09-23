"""
Spatial Convolutional Network (ResNet50 Transfer Learning)
Architecture for direct 2D feature extraction.
"""

import torch.nn as nn
from torchvision.models import resnet50, ResNet50_Weights

class NeuroVisionCNN(nn.Module):
    def __init__(self, num_classes: int = 4, freeze_backbone: bool = False):
        super(NeuroVisionCNN, self).__init__()
        
        self.model = resnet50(weights=ResNet50_Weights.IMAGENET1K_V1)
        
        if freeze_backbone:
            for param in self.model.parameters():
                param.requires_grad = False
                
        in_features = self.model.fc.in_features
        self.model.fc = nn.Sequential(
            nn.Dropout(p=0.5),
            nn.Linear(in_features, 256),
            nn.ReLU(),
            nn.Dropout(p=0.3),
            nn.Linear(256, num_classes)
        )

    def forward(self, x):
        return self.model(x)