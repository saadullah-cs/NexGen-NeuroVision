"""
Primary Training and Evaluation Orchestrator
Author: Saad Ullah

Executes sequential training lifecycles for spatial and recurrent architectures,
extracting comparative metrics and computational footprints.
"""

import os
import time
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple

from src.data.dataset import build_dataloaders
from src.models.cnn import NeuroVisionCNN
from src.models.rnn import SequentialRNN
from src.models.lstm import SequentialLSTM
from src.utils.metrics import (
    compute_classification_metrics, 
    generate_confusion_matrix, 
    compute_macro_roc, 
    plot_unified_roc_curves, 
    plot_learning_curves
)

def count_parameters(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters() if p.requires_grad)

def train_epoch(model: nn.Module, loader: torch.utils.data.DataLoader, criterion: nn.Module, optimizer: optim.Optimizer, device: torch.device) -> Tuple[float, float]:
    model.train()
    running_loss, correct, total = 0.0, 0, 0
    
    for inputs, labels in loader:
        inputs, labels = inputs.to(device), labels.to(device)
        
        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        
        running_loss += loss.item() * inputs.size(0)
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()
        
    return running_loss / total, correct / total

@torch.no_grad()
def evaluate_epoch(model: nn.Module, loader: torch.utils.data.DataLoader, criterion: nn.Module, device: torch.device) -> Tuple[float, float, np.ndarray, np.ndarray, np.ndarray]:
    model.eval()
    running_loss, correct, total = 0.0, 0, 0
    all_preds, all_labels, all_probs = [], [], []
    
    for inputs, labels in loader:
        inputs, labels = inputs.to(device), labels.to(device)
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        
        running_loss += loss.item() * inputs.size(0)
        probs = torch.softmax(outputs, dim=1)
        _, predicted = outputs.max(1)
        
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()
        
        all_preds.extend(predicted.cpu().numpy())
        all_labels.extend(labels.cpu().numpy())
        all_probs.extend(probs.cpu().numpy())
        
    return running_loss / total, correct / total, np.array(all_labels), np.array(all_preds), np.array(all_probs)

def execute_pipeline():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Hardware Accelerator: {device.type.upper()}")
    
    train_loader, val_loader, test_loader, class_to_idx = build_dataloaders(batch_size=32, num_workers=0)
    classes = list(class_to_idx.keys())
    
    models = {
        "CNN_ResNet50": NeuroVisionCNN(num_classes=4, freeze_backbone=False),
        "RNN_Sequential": SequentialRNN(num_classes=4),
        "LSTM_Sequential": SequentialLSTM(num_classes=4)
    }
    
    epochs = 15
    criterion = nn.CrossEntropyLoss()
    
    metrics_register = []
    roc_telemetry = {}
    
    for name, model in models.items():
        print(f"\n{'='*50}\nInitializing Lifecycle: {name}\n{'='*50}")
        model = model.to(device)
        optimizer = optim.Adam(model.parameters(), lr=0.001, weight_decay=1e-4)
        
        history = {'train_loss': [], 'train_acc': [], 'val_loss': [], 'val_acc': []}
        start_time = time.time()
        
        for epoch in range(epochs):
            t_loss, t_acc = train_epoch(model, train_loader, criterion, optimizer, device)
            v_loss, v_acc, _, _, _ = evaluate_epoch(model, val_loader, criterion, device)
            
            history['train_loss'].append(t_loss)
            history['train_acc'].append(t_acc)
            history['val_loss'].append(v_loss)
            history['val_acc'].append(v_acc)
            
            print(f"Epoch {epoch+1:02d}/{epochs} | Train Loss: {t_loss:.4f} Acc: {t_acc:.4f} | Val Loss: {v_loss:.4f} Acc: {v_acc:.4f}")
            
        training_time = time.time() - start_time
        param_count = count_parameters(model)
        
        print(f"\nExecuting final evaluation on isolated test subset...")
        _, _, test_labels, test_preds, test_probs = evaluate_epoch(model, test_loader, criterion, device)
        
        test_metrics = compute_classification_metrics(test_labels, test_preds)
        test_metrics.update({
            "Model": name,
            "Parameters": f"{param_count:,}",
            "Training Time (s)": round(training_time, 2)
        })
        metrics_register.append(test_metrics)
        
        # State serialization and plotting
        torch.save(model.state_dict(), f"outputs/models/{name}_weights.pth")
        plot_learning_curves(history, name, "outputs/plots")
        generate_confusion_matrix(test_labels, test_preds, classes, name, "outputs/plots")
        
        fpr, tpr, macro_auc = compute_macro_roc(test_labels, test_probs, num_classes=4)
        roc_telemetry[name] = (fpr, tpr, macro_auc)
        
    plot_unified_roc_curves(roc_telemetry, "outputs/plots")
    
    df_results = pd.DataFrame(metrics_register)
    cols = ["Model", "accuracy", "precision", "recall", "f1_score", "Parameters", "Training Time (s)"]
    df_results = df_results[cols]
    
    df_results.to_csv("outputs/reports/comparative_metrics.csv", index=False)
    
    print(f"\n{'='*50}\nFinal Comparative Telemetry\n{'='*50}")
    print(df_results.to_markdown(index=False))
    print("\nArtifacts securely flushed to outputs/ directory.")

if __name__ == "__main__":
    execute_pipeline()