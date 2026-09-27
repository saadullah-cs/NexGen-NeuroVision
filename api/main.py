"""
NexGen NeuroVision Diagnostic Engine
Provides classification, class activation mapping, and lesion localization.
"""

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import torch
import torch.nn.functional as F
import numpy as np
from PIL import Image
import io
import time
import base64
import cv2
from pathlib import Path
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from pytorch_grad_cam.utils.image import show_cam_on_image

from src.models.cnn import NeuroVisionCNN

app = FastAPI(title="NexGen NeuroVision Diagnostics")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
class_labels = ["Glioma", "Meningioma", "No Tumor", "Pituitary"]

# trained model
weights_path = Path("outputs/models/CNN_ResNet50_weights.pth")
model = NeuroVisionCNN(num_classes=4, freeze_backbone=False)
model.load_state_dict(torch.load(weights_path, map_location=device, weights_only=True))
model.to(device)
model.eval()

# final convolutional layer of ResNet50 for activation maps
target_layers = [model.model.layer4[-1]]
cam = GradCAM(model=model, target_layers=target_layers)

def transform_image(image_bytes: bytes):
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    original_w, original_h = image.size
    resized = image.resize((224, 224))
    
    rgb_normalized = np.float32(resized) / 255.0
    
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    tensor_img = (rgb_normalized - mean) / std
    tensor_img = np.transpose(tensor_img, (2, 0, 1))
    tensor_img = torch.tensor(tensor_img, dtype=torch.float32).unsqueeze(0).to(device)
    
    return tensor_img, rgb_normalized, (original_w, original_h)

@app.post("/api/diagnose")
async def process_scan(file: UploadFile = File(...)):
    start_time = time.time()
    image_bytes = await file.read()
    input_tensor, rgb_normalized, (orig_w, orig_h) = transform_image(image_bytes)

    # Forward Pass & Probability Extraction
    with torch.no_grad():
        logits = model(input_tensor)
        probabilities = F.softmax(logits, dim=1).cpu().numpy()[0]
        
    predicted_idx = int(np.argmax(probabilities))
    predicted_class = class_labels[predicted_idx]
    confidence = float(probabilities[predicted_idx])
    
    # Grad-CAM Activation Mapping
    targets = [ClassifierOutputTarget(predicted_idx)]
    grayscale_cam = cam(input_tensor=input_tensor, targets=targets)[0, :]
    
    # Dynamic Bounding Box Extraction via Contour Thresholding
    bounding_box = None
    if predicted_class != "No Tumor":
        # Binary mask of the upper 60% activation zone
        mask = (grayscale_cam > 0.6).astype(np.uint8) * 255
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(largest_contour)
            
            # Coordinates relative to the 224x224 input grid
            bounding_box = {
                "x": round(float(x) / 224.0, 4),
                "y": round(float(y) / 224.0, 4),
                "width": round(float(w) / 224.0, 4),
                "height": round(float(h) / 224.0, 4)
            }

    # Heatmap Visualization
    cam_image = show_cam_on_image(rgb_normalized, grayscale_cam, use_rgb=True)
    
    if bounding_box:
        bx = int(bounding_box["x"] * 224)
        by = int(bounding_box["y"] * 224)
        bw = int(bounding_box["width"] * 224)
        bh = int(bounding_box["height"] * 224)
        cv2.rectangle(cam_image, (bx, by), (bx + bw, by + bh), (255, 0, 80), 2)

    _, buffer = cv2.imencode(".png", cv2.cvtColor(cam_image, cv2.COLOR_RGB2BGR))
    heatmap_base64 = base64.b64encode(buffer).decode("utf-8")
    
    latency = round((time.time() - start_time) * 1000, 2)

    return {
        "status": "success",
        "diagnosis": predicted_class,
        "confidence": confidence,
        "latency_ms": latency,
        "bounding_box": bounding_box,
        "distribution": {label: round(float(prob), 4) for label, prob in zip(class_labels, probabilities)},
        "heatmap_overlay": f"data:image/png;base64,{heatmap_base64}"
    }

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)