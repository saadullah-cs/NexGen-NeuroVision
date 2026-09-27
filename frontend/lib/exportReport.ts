import jsPDF from "jspdf";

interface ReportPayload {
  diagnosis: string;
  confidence: number;
  latency_ms: number;
  distribution?: Record<string, number>;
  imageDataUrl?: string;
  heatmapOverlay?: string;
  boundingBox?: { x: number; y: number; width: number; height: number } | null;
}

export const exportClinicalReport = async (payload: ReportPayload) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const timestamp = new Date().toISOString();
  const sessionToken = Math.random().toString(36).substring(2, 10).toUpperCase();

  // Header and Branding
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 210, 24, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("NEXGEN NEUROVISION", 14, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text("Clinical Diagnostic and Automated Telemetry Sheet", 14, 18);

  // Metadata Panel
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8);
  doc.text(`SESSION TOKEN: ${sessionToken}`, 140, 10);
  doc.text(`TIMESTAMP: ${timestamp}`, 140, 15);
  doc.text(`MODEL ENGINE: ResNet50 ONNX Graph`, 140, 20);

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 28, 196, 28);

  // Primary Clinical Finding Block
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("PRIMARY DIAGNOSIS FINDINGS", 14, 35);

  const isPositive = payload.diagnosis !== "No Tumor";
  doc.setFillColor(isPositive ? 254 : 240, isPositive ? 242 : 253, isPositive ? 242 : 244);
  doc.setDrawColor(isPositive ? 248 : 187, isPositive ? 113 : 247, isPositive ? 113 : 208);
  doc.roundedRect(14, 38, 182, 22, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(isPositive ? 190 : 22, isPositive ? 18 : 101, isPositive ? 60 : 52);
  doc.text(`CLASSIFICATION: ${payload.diagnosis.toUpperCase()}`, 18, 46);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Inference Confidence: ${(payload.confidence * 100).toFixed(2)}%  |  Execution Latency: ${payload.latency_ms} ms`,
    18,
    54
  );

  // Imagery Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("SCAN TELEMETRY AND ACTIVATION", 14, 68);

  if (payload.imageDataUrl) {
    try {
      doc.addImage(payload.imageDataUrl, "JPEG", 14, 72, 85, 85);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Source Input Scan (224x224 RGB)", 14, 161);
    } catch {
      doc.text("Image rendering failed", 14, 80);
    }
  }

  if (payload.heatmapOverlay) {
    try {
      doc.addImage(payload.heatmapOverlay, "PNG", 111, 72, 85, 85);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Grad-CAM Class Activation Map", 111, 161);
    } catch {
      doc.text("Activation map not present", 111, 80);
    }
  }

  // Distribution Table
  doc.line(14, 166, 196, 166);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("CLASS PROBABILITY DISTRIBUTION", 14, 173);

  if (payload.distribution) {
    let yOffset = 180;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    Object.entries(payload.distribution).forEach(([className, score]) => {
      const percentage = (score * 100).toFixed(2);
      doc.setTextColor(51, 65, 85);
      doc.text(className, 14, yOffset);

      // Simple bar visualizer
      doc.setFillColor(226, 232, 240);
      doc.rect(50, yOffset - 3, 100, 3, "F");

      doc.setFillColor(37, 99, 235); // Blue
      doc.rect(50, yOffset - 3, Math.max(1, score * 100), 3, "F");

      doc.text(`${percentage}%`, 155, yOffset);
      yOffset += 7;
    });
  }

  // Bounding Box Coordinates Block
  if (payload.boundingBox) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("LOCALIZATION COORDINATES", 14, 215);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const { x, y, width, height } = payload.boundingBox;
    doc.text(
      `Normalized Bounding Matrix: X: ${x} | Y: ${y} | Width: ${width} | Height: ${height}`,
      14,
      222
    );
  }

  // Disclaimer and Legal Compliance Footer
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 275, 196, 275);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Automated neural screening output. Intended for research and preliminary diagnostic triage assistance only.",
    14,
    280
  );

  doc.save(`NexGen_Diagnostics_${sessionToken}.pdf`);
};