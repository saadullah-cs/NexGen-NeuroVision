"""
NexGen NeuroVision Diagnostic Engine
Optimized for low-memory cloud containerization (<512MB RAM) via Lazy Loading.
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
import base64
import cv2
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from pytorch_grad_cam.utils.image import show_cam_on_image

os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MALLOC_ARENA_MAX"] = "2"
torch.set_num_threads(1)

app = FastAPI(title="NexGen NeuroVision API")

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
cam = None

def load_model_into_ram():
    global model, cam
    if model is None:
        print("First request detected. Initializing AI Engine into RAM...")
        api_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.dirname(api_dir)
        
        weights_path = os.path.join(root_dir, "outputs", "models", "CNN_ResNet50_weights.pth")
        
        model = NeuroVisionCNN(num_classes=4)
        
        state_dict = torch.load(weights_path, map_location=device, weights_only=True)
        model.load_state_dict(state_dict)
        del state_dict
        
        for name, param in model.named_parameters():
            if "layer4" not in name and "fc" not in name:
                param.requires_grad = False
            else:
                param.requires_grad = True 
                
        model.to(device)
        model.eval() 
        
        target_layers = [model.model.layer4[-1]]
        cam = GradCAM(model=model, target_layers=target_layers)
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
    return tensor_img, rgb_normalized, image.size

@app.post("/api/diagnose")
async def process_scan(file: UploadFile = File(...)):
    start_time = time.time()
    
    load_model_into_ram()
    
    image_bytes = await file.read()
    input_tensor, rgb_normalized, _ = transform_image(image_bytes)

    with torch.no_grad():
        logits = model(input_tensor)
        probabilities = F.softmax(logits, dim=1).cpu().numpy()[0]
        
    predicted_idx = int(np.argmax(probabilities))
    predicted_class = class_labels[predicted_idx]
    confidence = float(probabilities[predicted_idx])
    
    targets = [ClassifierOutputTarget(predicted_idx)]
    grayscale_cam = cam(input_tensor=input_tensor, targets=targets)[0, :]
    
    bounding_box = None
    if predicted_class != "No Tumor":
        mask = (grayscale_cam > 0.6).astype(np.uint8) * 255
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(largest_contour)
            bounding_box = {
                "x": round(float(x) / 224.0, 4),
                "y": round(float(y) / 224.0, 4),
                "width": round(float(w) / 224.0, 4),
                "height": round(float(h) / 224.0, 4)
            }

    cam_image = show_cam_on_image(rgb_normalized, grayscale_cam, use_rgb=True)
    if bounding_box:
        bx, by = int(bounding_box["x"] * 224), int(bounding_box["y"] * 224)
        bw, bh = int(bounding_box["width"] * 224), int(bounding_box["height"] * 224)
        cv2.rectangle(cam_image, (bx, by), (bx + bw, by + bh), (255, 0, 80), 2)

    _, buffer = cv2.imencode(".png", cv2.cvtColor(cam_image, cv2.COLOR_RGB2BGR))
    heatmap_base64 = base64.b64encode(buffer).decode("utf-8")
    latency = round((time.time() - start_time) * 1000, 2)

    del input_tensor
    del grayscale_cam
    gc.collect()

    return {
        "status": "success",
        "diagnosis": predicted_class,
        "confidence": confidence,
        "latency_ms": latency,
        "bounding_box": bounding_box,
        "distribution": {label: round(float(prob), 4) for label, prob in zip(class_labels, probabilities)},
        "heatmap_overlay": f"data:image/png;base64,{heatmap_base64}"
    }