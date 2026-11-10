
const input = document.getElementById("vehicleInput");
const preview = document.getElementById("vehiclePreview");
const emptyPreview = document.getElementById("emptyPreview");
const studio = document.getElementById("studioPreview");
const studioSelect = document.getElementById("studioSelect");
const fileName = document.getElementById("fileName");
const status = document.getElementById("previewStatus");
const downloadButton = document.getElementById("downloadButton");
const removeButton = document.getElementById("removeButton");
const uploadArea = document.querySelector(".upload-area");

let currentFile = null;
let currentURL = null;

const MAX_SIZE = 15 * 1024 * 1024;

function setStudio(value) {
  studio.classList.remove("grey", "dark", "blue");

  if (value !== "white") {
    studio.classList.add(value);
  }
}

studioSelect.addEventListener("change", () => {
  setStudio(studioSelect.value);
});

function clearImage() {
  if (currentURL) {
    URL.revokeObjectURL(currentURL);
  }

  currentURL = null;
  currentFile = null;

  preview.removeAttribute("src");
  preview.hidden = true;
  emptyPreview.hidden = false;

  fileName.textContent = "No vehicle uploaded";
  status.textContent = "WAITING FOR IMAGE";

  downloadButton.disabled = true;
  removeButton.disabled = true;
}

function loadImage(file) {
  if (!file) return;

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
    status.textContent = "IMAGE LOADED";

    downloadButton.disabled = false;
    removeButton.disabled = false;
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

  const file = event.dataTransfer.files[0];
  loadImage(file);
});

removeButton.addEventListener("click", () => {
  clearImage();
  input.value = "";
});

downloadButton.addEventListener("click", () => {
  if (!currentFile || !preview.complete) return;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = preview.naturalWidth;
  canvas.height = preview.naturalHeight;

  // Background selection
  const backgrounds = {
    white: "#ffffff",
    grey: "#bfc2c8",
    dark: "#20242d",
    blue: "#14243b"
  };

  ctx.fillStyle = backgrounds[studioSelect.value];
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Preserve original image pixels
  ctx.drawImage(
    preview,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const link = document.createElement("a");

  link.download = "gta-vehicle-studio.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

setStudio("white");
