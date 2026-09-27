"""
ONNX Serialization Engine
Extracts PyTorch weights and compiles a static execution graph.
"""

import torch
from pathlib import Path
from models.cnn import NeuroVisionCNN

def export_model():
    print("Initializing architecture for export...")
    model = NeuroVisionCNN(num_classes=4, freeze_backbone=True)
    
    weights_path = Path("outputs/models/CNN_ResNet50_weights.pth")
    if not weights_path.exists():
        raise FileNotFoundError("PyTorch weights not found. Ensure training completed successfully.")
        
    model.load_state_dict(torch.load(weights_path, map_location="cpu", weights_only=True))
    model.eval()

    # The exact input tensor shape expected by the model
    dummy_input = torch.randn(1, 3, 224, 224)
    export_path = "outputs/models/resnet50_neurovision.onnx"

    print("Compiling ONNX graph...")
    torch.onnx.export(
        model,
        dummy_input,
        export_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["input_tensor"],
        output_names=["classification_output"],
        dynamic_axes={
            "input_tensor": {0: "batch_size"},
            "classification_output": {0: "batch_size"}
        }
    )
    
    print(f"Serialization complete. Production engine saved to {export_path}")

if __name__ == "__main__":
    export_model()