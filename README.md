# NexGen NeuroVision: Brain Tumor Classification Pipeline

**Author:** Saad Ullah

## Overview
This repository contains a complete machine learning operations pipeline built to classify brain tumor types from raw magnetic resonance imaging scans. The project serves as an empirical comparison between spatial feature extraction and sequential feature extraction on image data. 

We engineered three distinct neural network architectures using PyTorch and evaluated them on the same hardware and dataset to determine which approach yields the highest reliability for medical diagnostics.

## Dataset Details
The models are trained on the Brain Tumor Classification dataset from Kaggle. 
* **Total Images:** 7200 scans 
* **Classes:** Glioma, Meningioma, Pituitary, and No Tumor
* **Balance:** Perfectly balanced with exactly 1800 images per class
* **Data Split:** 66 percent Training, 12 percent Validation, 22 percent Holdout Test

The data ingestion pipeline applies dynamic augmentation to the training set including random horizontal flips, rotational shifts, and color jitter to prevent overfitting. We enforce strict data isolation so the validation and test sets remain unaltered.

## Model Architectures
We implemented three separate models to test different mathematical approaches to image processing.

1. **Convolutional Neural Network (ResNet50)**
We used a transfer learning approach with a pretrained ResNet50 backbone. The base gradients are frozen to save compute resources, and we attached a custom multiple layer classification head with heavy dropout. This model evaluates the image spatially using two dimensional kernels.

2. **Long Short Term Memory**
To test sequential processing, the images are flattened into sequences of 224 rows. The LSTM processes these rows sequentially. It uses memory gates to retain information from the top of the image while scanning the bottom.

3. **Recurrent Neural Network**
A standard sequential network that processes the flattened image arrays identically to the LSTM but without the advanced memory gating mechanisms. 

## Empirical Results
The CNN heavily outperformed the sequential models. Flattening an image into a linear sequence destroys the geometric shape and localized context that define tumor boundaries. The CNN preserves this spatial geometry natively.

| Architecture | Accuracy | Precision | Recall | F1 Score | Trainable Parameters | Compute Time |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| CNN ResNet50 | 82.8% | 0.831 | 0.828 | 0.822 | 525,572 | 12 minutes |
| LSTM Sequential | 70.4% | 0.725 | 0.704 | 0.683 | 551,236 | 8 minutes |
| RNN Sequential | 56.8% | 0.554 | 0.568 | 0.516 | 144,196 | 8 minutes |

## Project Structure
```text
NexGen-NeuroVision/
├── data/
│   ├── raw/                 # Raw Kaggle images drop here
│   └── processed/           # Transformed tensors 
├── notebooks/
│   └── execution_engine.ipynb
├── outputs/
│   ├── models/              # Saved PyTorch weights (.pth)
│   ├── plots/               # Confusion matrices and ROC curves
│   └── reports/             # Telemetry CSV files
├── src/
│   ├── data/
│   │   └── dataset.py       # PyTorch Dataset and DataLoader logic
│   ├── models/
│   │   ├── cnn.py
│   │   ├── lstm.py
│   │   └── rnn.py
│   ├── utils/
│   │   └── metrics.py       # Scikit learn evaluation logic
│   └── train.py             # Main execution orchestrator
├── .gitignore
├── requirements.txt
└── README.md
```

## Local Installation and Execution

To run this pipeline on your local hardware or a cloud compute instance, follow these steps.

1. Clone the repository

    ```bash
    git clone [https://github.com/saadullah-cs/NexGen-NeuroVision.git](https://github.com/saadullah-cs/NexGen-NeuroVision.git)
    cd NexGen-NeuroVision
    ```

2. Provision the environment

    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows use: .\venv\Scripts\activate
    pip install -r requirements.txt
    ```

3. Ingest the dataset
   Ensure you have the Kaggle dataset downloaded. Place the Training and Testing folders directly into the `data/raw/` directory.

4. Execute the training orchestrator

   ```bash
   python -m src.train
   ```

The terminal will print the epoch telemetry in real time. Once convergence is reached, the evaluation engine will test the holdout set and flush all weights, comparative tables, and visual plots to the `outputs/` directory.