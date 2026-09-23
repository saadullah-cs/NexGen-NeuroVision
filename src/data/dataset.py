"""
Data Ingestion and Augmentation Pipeline for NexGen NeuroVision
Author: Saad Ullah
Domain: Brain Tumor MRI Classification
"""

import os
from pathlib import Path
from typing import Tuple, List, Dict

import torch
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image
from sklearn.model_selection import train_test_split

class BrainTumorDataset(Dataset):
    """
    Custom PyTorch Dataset for loading Brain Tumor MRI images.
    """
    def __init__(self, file_paths: List[str], labels: List[int], transform: transforms.Compose = None):
        self.file_paths = file_paths
        self.labels = labels
        self.transform = transform

    def __len__(self) -> int:
        return len(self.file_paths)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        img_path = self.file_paths[idx]
        try:
            # Converting to RGB to ensure 3 channels regardless of raw grayscale format
            image = Image.open(img_path).convert("RGB")
        except Exception as e:
            raise IOError(f"Error loading image at {img_path}: {e}")

        if self.transform:
            image = self.transform(image)

        return image, self.labels[idx]

def get_transforms() -> Tuple[transforms.Compose, transforms.Compose]:
    """
    Defines the augmentation and preprocessing pipelines.
    Images are resized to 224x224 for compatibility with standard deep learning architectures.
    """
    # ImageNet standards for normalization
    mean = [0.485, 0.456, 0.406]
    std = [0.229, 0.224, 0.225]

    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=mean, std=std)
    ])

    # Validation/Test pipelines omit augmentation
    test_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=mean, std=std)
    ])

    return train_transform, test_transform

def build_dataloaders(
    data_dir: str = "data/raw", 
    batch_size: int = 32, 
    val_split: float = 0.15,
    num_workers: int = 4
) -> Tuple[DataLoader, DataLoader, DataLoader, Dict[str, int]]:
    """
    Parses the directory tree, stratifies the training set to create a validation set, 
    and constructs PyTorch DataLoaders.
    """
    train_dir = Path(data_dir) / "Training"
    test_dir = Path(data_dir) / "Testing"

    if not train_dir.exists() or not test_dir.exists():
        raise FileNotFoundError(f"Ensure '{data_dir}/Training' and '{data_dir}/Testing' exist.")

    classes = sorted([d.name for d in train_dir.iterdir() if d.is_dir()])
    class_to_idx = {cls_name: i for i, cls_name in enumerate(classes)}

    # Parsing of file paths
    train_val_paths, train_val_labels = [], []
    test_paths, test_labels = [], []

    for cls_name in classes:
        cls_idx = class_to_idx[cls_name]
        
        # Parsing of Training directory
        for img_path in (train_dir / cls_name).glob("*.*"):
            if img_path.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                train_val_paths.append(str(img_path))
                train_val_labels.append(cls_idx)
                
        # Parsing of Testing directory
        for img_path in (test_dir / cls_name).glob("*.*"):
            if img_path.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                test_paths.append(str(img_path))
                test_labels.append(cls_idx)

    # Stratified split to maintain perfect class balance in Validation set
    X_train, X_val, y_train, y_val = train_test_split(
        train_val_paths, train_val_labels, 
        test_size=val_split, 
        random_state=42, 
        stratify=train_val_labels
    )

    train_transform, test_transform = get_transforms()

    # Instantiation of datasets
    train_dataset = BrainTumorDataset(X_train, y_train, transform=train_transform)
    val_dataset = BrainTumorDataset(X_val, y_val, transform=test_transform)
    test_dataset = BrainTumorDataset(test_paths, test_labels, transform=test_transform)

    # Construction of DataLoaders
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=num_workers, pin_memory=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=num_workers, pin_memory=True)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=num_workers, pin_memory=True)

    print(f"Data Pipeline Established:")
    print(f" - Classes: {list(class_to_idx.keys())}")
    print(f" - Train samples: {len(train_dataset)}")
    print(f" - Validation samples: {len(val_dataset)}")
    print(f" - Test samples: {len(test_dataset)}")

    return train_loader, val_loader, test_loader, class_to_idx