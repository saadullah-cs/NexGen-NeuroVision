"""
NexGen NeuroVision Diagnostic Engine - LITE VERSION (Render Deployment)
Grad-CAM removed for strict <512MB RAM compliance.
"""

import os
import gc
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import torch
import torch.nn as nn
from torchvision.models import resnet50
import torch.nn.functional as F
import numpy as np
from PIL import Image
import io
import time

os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MALLOC_ARENA_MAX"] = "2"
torch.set_num_threads(1)

app = FastAPI(title="NexGen NeuroVision API (Lite)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

device = torch.device("cpu")
class_labels = ["Glioma", "Meningioma", "No Tumor", "Pituitary"]

class NeuroVisionCNN(nn.Module):
    def __init__(self, num_classes: int = 4):
        super(NeuroVisionCNN, self).__init__()
        self.model = resnet50(weights=None)
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

model = None

def load_model_into_ram():
    global model
    if model is None:
        print("First request detected. Initializing AI Engine (Lite) into RAM...")
        api_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.dirname(api_dir)
        weights_path = os.path.join(root_dir, "outputs", "models", "CNN_ResNet50_weights.pth")
        
        model = NeuroVisionCNN(num_classes=4)
        state_dict = torch.load(weights_path, map_location=device, weights_only=True)
        model.load_state_dict(state_dict)
        del state_dict

        for param in model.parameters():
            param.requires_grad = False
                
        model.to(device)
        model.eval() 
        gc.collect()
        print("AI Engine Ready.")

def transform_image(image_bytes: bytes):
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    resized = image.resize((224, 224))
    rgb_normalized = np.float32(resized) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    tensor_img = (rgb_normalized - mean) / std
    tensor_img = np.transpose(tensor_img, (2, 0, 1))
    tensor_img = torch.tensor(tensor_img, dtype=torch.float32).unsqueeze(0).to(device)
    return tensor_img

@app.post("/api/diagnose")
async def process_scan(file: UploadFile = File(...)):
    start_time = time.time()
    
    load_model_into_ram()
    
    image_bytes = await file.read()
    input_tensor = transform_image(image_bytes)

    with torch.no_grad():
        logits = model(input_tensor)
        probabilities = F.softmax(logits, dim=1).cpu().numpy()[0]
        
    predicted_idx = int(np.argmax(probabilities))
    predicted_class = class_labels[predicted_idx]
    confidence = float(probabilities[predicted_idx])
    
    latency = round((time.time() - start_time) * 1000, 2)

    del input_tensor
    gc.collect()

    return {
        "status": "success",
        "diagnosis": predicted_class,
        "confidence": confidence,
        "latency_ms": latency,
        "bounding_box": None,
        "heatmap_overlay": None,
        "distribution": {label: round(float(prob), 4) for label, prob in zip(class_labels, probabilities)}
    }