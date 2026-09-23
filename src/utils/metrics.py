"""
Evaluation and Telemetry Engine
Implements macro-averaged multi-class metrics, confusion matrices, and ROC derivations.
"""

import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix, roc_curve, auc
from sklearn.preprocessing import label_binarize
from typing import Dict, List, Tuple

def compute_classification_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """
    Computes strict unweighted macro averages for balanced evaluation across the four tumor classes.
    """
    accuracy = accuracy_score(y_true, y_pred)
    precision, recall, f1, _ = precision_recall_fscore_support(y_true, y_pred, average='macro', zero_division=0)
    
    return {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1_score": f1
    }

def generate_confusion_matrix(y_true: np.ndarray, y_pred: np.ndarray, classes: List[str], model_name: str, output_dir: str) -> None:
    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=classes, yticklabels=classes)
    plt.title(f'Confusion Matrix: {model_name}')
    plt.ylabel('Actual Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    plt.savefig(f"{output_dir}/{model_name}_confusion_matrix.png", dpi=300)
    plt.close()

def compute_macro_roc(y_true: np.ndarray, y_probs: np.ndarray, num_classes: int) -> Tuple[np.ndarray, np.ndarray, float]:
    """
    Aggregates per-class ROC curves into a single macro-average representation for clean cross-model overlay.
    """
    y_true_bin = label_binarize(y_true, classes=range(num_classes))
    
    fpr = dict()
    tpr = dict()
    roc_auc = dict()
    
    for i in range(num_classes):
        fpr[i], tpr[i], _ = roc_curve(y_true_bin[:, i], y_probs[:, i])
        roc_auc[i] = auc(fpr[i], tpr[i])
        
    all_fpr = np.unique(np.concatenate([fpr[i] for i in range(num_classes)]))
    mean_tpr = np.zeros_like(all_fpr)
    
    for i in range(num_classes):
        mean_tpr += np.interp(all_fpr, fpr[i], tpr[i])
        
    mean_tpr /= num_classes
    macro_auc = auc(all_fpr, mean_tpr)
    
    return all_fpr, mean_tpr, macro_auc

def plot_unified_roc_curves(model_roc_data: Dict[str, Tuple[np.ndarray, np.ndarray, float]], output_dir: str) -> None:
    plt.figure(figsize=(10, 8))
    
    colors = ['#1f77b4', '#ff7f0e', '#2ca02c']
    for (model_name, (fpr, tpr, roc_auc)), color in zip(model_roc_data.items(), colors):
        plt.plot(fpr, tpr, color=color, lw=2, label=f'{model_name} (Macro AUC = {roc_auc:.4f})')
        
    plt.plot([0, 1], [0, 1], 'k--', lw=2)
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title('Cross-Architecture ROC Overlay (Macro-Averaged)')
    plt.legend(loc="lower right")
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(f"{output_dir}/unified_roc_comparison.png", dpi=300)
    plt.close()

def plot_learning_curves(history: Dict[str, List[float]], model_name: str, output_dir: str) -> None:
    epochs = range(1, len(history['train_loss']) + 1)
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5))
    
    ax1.plot(epochs, history['train_loss'], label='Training Loss')
    ax1.plot(epochs, history['val_loss'], label='Validation Loss')
    ax1.set_title(f'{model_name}: Loss Dynamics')
    ax1.set_xlabel('Epochs')
    ax1.set_ylabel('Loss')
    ax1.legend()
    ax1.grid(alpha=0.3)
    
    ax2.plot(epochs, history['train_acc'], label='Training Accuracy')
    ax2.plot(epochs, history['val_acc'], label='Validation Accuracy')
    ax2.set_title(f'{model_name}: Accuracy Progression')
    ax2.set_xlabel('Epochs')
    ax2.set_ylabel('Accuracy')
    ax2.legend()
    ax2.grid(alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(f"{output_dir}/{model_name}_learning_curves.png", dpi=300)
    plt.close()