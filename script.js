
import { pipeline } from
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";

const input = document.getElementById("vehicleInput");
const preview = document.getElementById("vehiclePreview");
const emptyPreview = document.getElementById("emptyPreview");
const studio = document.getElementById("studioPreview");

const studioSelect = document.getElementById("studioSelect");
const customColor = document.getElementById("customColor");
const customColorRow = document.getElementById("customColorRow");

const fileName = document.getElementById("fileName");
const status = document.getElementById("previewStatus");

const removeBgButton = document.getElementById("removeBgButton");
const removeButton = document.getElementById("removeButton");
const downloadButton = document.getElementById("downloadButton");

const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

const MAX_SIZE = 15 * 1024 * 1024;
const MODEL = "onnx-community/BEN2-ONNX";

let currentFile = null;
let currentURL = null;
let cutoutCanvas = null;
let aiEngine = null;
let isProcessing = false;

const backgrounds = {
  white: "#ffffff",
  grey: "#c5c8ce",
  dark: "#252a32",
  blue: "#14243b",
  black: "#090a0d"
};

function setStatus(message) {
  status.textContent = message;
}

function setProgress(percent, message) {
  progressContainer.hidden = false;
  progressBar.style.width = `${percent}%`;
  progressText.textContent = message;
}

function finishProgress() {
  progressContainer.hidden = true;
  progressBar.style.width = "0%";
}

function getBackgroundColor() {
  const selected = studioSelect.value;

  if (selected === "custom") {
    return customColor.value;
  }

  return backgrounds[selected];
}

function updateStudio() {
  const selected = studioSelect.value;

  studio.classList.remove(
    "grey", "dark", "blue", "black", "custom"
  );

  if (selected !== "white") {
    studio.classList.add(selected);
  }

  customColorRow.hidden = selected !== "custom";

  if (selected === "custom") {
    studio.style.background = customColor.value;
  } else {
    studio.style.background = backgrounds[selected];
  }
}

studioSelect.addEventListener("change", updateStudio);

customColor.addEventListener("input", updateStudio);

async function loadAI() {
  if (aiEngine) return aiEngine;

  setProgress(5, "Loading AI background removal engine...");

  try {
    aiEngine = await pipeline(
      "background-removal",
      MODEL
    );

    setProgress(100, "AI engine loaded successfully.");

    return aiEngine;

  } catch (error) {
    console.error("AI engine error:", error);
    throw new Error(
      "Unable to load the AI model. Check your internet connection and try again."
    );
  }
}

function clearImage() {
  if (currentURL) {
    URL.revokeObjectURL(currentURL);
  }

  currentURL = null;
  currentFile = null;
  cutoutCanvas = null;

  preview.removeAttribute("src");
  preview.hidden = true;

  emptyPreview.hidden = false;

  fileName.textContent = "No vehicle uploaded";

  setStatus("WAITING FOR IMAGE");

  removeBgButton.disabled = true;
  removeButton.disabled = true;
  downloadButton.disabled = true;

  finishProgress();
}

function loadImage(file) {
  if (!file) return;

  if (isProcessing) {
    alert("Wait until current processing finishes.");
    return;
  }

  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {
    alert("Please upload a PNG, JPG or WEBP image.");
    return;
  }

  if (file.size > MAX_SIZE) {
    alert("Maximum upload size is 15 MB.");
    return;
  }

  clearImage();

  currentFile = file;
  currentURL = URL.createObjectURL(file);

  preview.onload = () => {
    preview.hidden = false;
    emptyPreview.hidden = true;

    fileName.textContent = file.name;
    setStatus("IMAGE LOADED");

    removeBgButton.disabled = false;
    removeButton.disabled = false;

    downloadButton.disabled = true;
  };

  preview.onerror = () => {
    alert("Unable to load this image.");
    clearImage();
  };

  preview.src = currentURL;
}

input.addEventListener("change", (event) => {
  loadImage(event.target.files[0]);
});

const uploadArea = document.getElementById("uploadArea");

uploadArea.addEventListener("dragover", (event) => {
  event.preventDefault();
  uploadArea.classList.add("dragging");
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragging");
});

uploadArea.addEventListener("drop", (event) => {
  event.preventDefault();
  uploadArea.classList.remove("dragging");

  loadImage(event.dataTransfer.files[0]);
});

removeButton.addEventListener("click", () => {
  if (isProcessing) return;

  clearImage();
  input.value = "";
});

async function removeBackground() {
  if (!currentFile || !currentURL || isProcessing) return;

  isProcessing = true;

  removeBgButton.disabled = true;
  removeButton.disabled = true;
  downloadButton.disabled = true;

  try {
    setStatus("AI PROCESSING");

    setProgress(5, "Preparing your vehicle image...");

    const remover = await loadAI();

    setProgress(35, "AI is detecting your vehicle...");

    const output = await remover([currentURL]);

    if (!output || !output[0]) {
      throw new Error("The AI did not return an image.");
    }

    setProgress(75, "Removing the original background...");

    const resultCanvas = output[0].toCanvas();

    if (!resultCanvas || !resultCanvas.width) {
      throw new Error("Unable to create the transparent image.");
    }

    cutoutCanvas = document.createElement("canvas");

    cutoutCanvas.width = resultCanvas.width;
    cutoutCanvas.height = resultCanvas.height;

    const context = cutoutCanvas.getContext("2d");

    context.clearRect(
      0,
      0,
      cutoutCanvas.width,
      cutoutCanvas.height
    );

    context.drawImage(resultCanvas, 0, 0);

    setProgress(90, "Preparing studio preview...");

    preview.src = cutoutCanvas.toDataURL("image/png");

    await new Promise((resolve, reject) => {
      preview.onload = resolve;
      preview.onerror = reject;
    });

    setProgress(100, "Background removed successfully!");

    setStatus("BACKGROUND REMOVED");

    downloadButton.disabled = false;

  } catch (error) {
    console.error("Background removal failed:", error);

    setStatus("PROCESSING FAILED");

    alert(
      error.message ||
      "Background removal failed. Please try again."
    );

  } finally {
    isProcessing = false;

    removeBgButton.disabled = !currentFile;
    removeButton.disabled = !currentFile;

    finishProgress();
  }
}

removeBgButton.addEventListener("click", removeBackground);

function createStudioCanvas() {
  if (!cutoutCanvas) {
    throw new Error("Remove the background before downloading.");
  }

  const canvas = document.createElement("canvas");

  canvas.width = cutoutCanvas.width;
  canvas.height = cutoutCanvas.height;

  const ctx = canvas.getContext("2d");

  const width = canvas.width;
  const height = canvas.height;

  const color = getBackgroundColor();

  // Studio background
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);

  // Subtle studio lighting
  const light = ctx.createRadialGradient(
    width * 0.5,
    height * 0.25,
    0,
    width * 0.5,
    height * 0.25,
    Math.max(width, height) * 0.8
  );

  light.addColorStop(0, "rgba(255,255,255,0.16)");
  light.addColorStop(1, "rgba(0,0,0,0.06)");

  ctx.fillStyle = light;
  ctx.fillRect(0, 0, width, height);

  // Soft floor shadow
  ctx.save();

  ctx.filter = `blur(${Math.max(8, width * 0.012)}px)`;
  ctx.fillStyle = "rgba(0,0,0,0.18)";

  ctx.beginPath();

  ctx.ellipse(
    width * 0.5,
    height * 0.88,
    width * 0.27,
    height * 0.035,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();
  ctx.restore();

  // Draw original vehicle cutout without reshaping
  ctx.drawImage(
    cutoutCanvas,
    0,
    0,
    width,
    height
  );

  return canvas;
}

downloadButton.addEventListener("click", () => {
  if (!cutoutCanvas) return;

  try {
    const finalCanvas = createStudioCanvas();

    finalCanvas.toBlob((blob) => {
      if (!blob) {
        alert("Unable to export image.");
        return;
      }

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = "GTA-Vehicle-Studio-HD.png";

      link.click();

      setTimeout(() => URL.revokeObjectURL(url), 1000);

    }, "image/png");

  } catch (error) {
    console.error(error);
    alert(error.message);
  }
});

updateStudio();
