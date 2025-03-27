/**
 * Custom QTI to PDF Converter Script
 * This script is designed to work specifically with your HTML structure
 */

document.addEventListener("DOMContentLoaded", function () {
  // Core functionality from QTIToPDFConverter
  const converter = new QTIToPDFConverter();

  // DOM elements - using your specific IDs
  const elements = {
    dropArea: document.getElementById("dropArea"),
    fileInput: document.getElementById("qtiFile"),
    fileInfo: document.getElementById("fileInfo"),
    fileName: document.getElementById("file-name"),
    fileSize: document.getElementById("file-size"),
    removeFileBtn: document.getElementById("removeFile"),
    titleInput: document.getElementById("documentTitle"),
    collegeSelect: document.getElementById("collegeSelect"),
    includeAnswers: document.getElementById("includeAnswers"),
    paperSize: document.getElementById("paperSize"),
    generalDirections: document.getElementById("generalDirections"),
    convertBtn: document.getElementById("convertBtn"),
    downloadBtn: document.getElementById("downloadBtn"),
    resultsSection: document.getElementById("results-section"),
    conversionSummary: document.getElementById("conversion-summary"),
  };

  // Current file variable
  let currentFile = null;
  let pdfBlob = null;

  // ---- Event Listeners ----

  // Drag and drop functionality
  elements.dropArea.addEventListener("dragover", function (e) {
    e.preventDefault();
    e.stopPropagation();
    elements.dropArea.classList.add("highlight");
  });

  elements.dropArea.addEventListener("dragleave", function (e) {
    e.preventDefault();
    e.stopPropagation();
    elements.dropArea.classList.remove("highlight");
  });

  elements.dropArea.addEventListener("drop", function (e) {
    e.preventDefault();
    e.stopPropagation();
    elements.dropArea.classList.remove("highlight");

    const files = e.dataTransfer.files;
    if (files.length) {
      processFile(files[0]);
    }
  });

  // Click on drop area to browse files
  elements.dropArea.addEventListener("click", function (e) {
    // Only trigger if not clicking on the file info area or remove button
    if (
      elements.fileInfo.classList.contains("hidden") &&
      !e.target.closest("#removeFile") &&
      !e.target.closest(".file-info")
    ) {
      elements.fileInput.click();
    }
  });

  // File input change
  elements.fileInput.addEventListener("change", function (e) {
    const files = e.target.files;
    if (files.length) {
      processFile(files[0]);
    }
  });

  // Browse button
  const browseBtn = document.querySelector(".browse-btn");
  if (browseBtn) {
    browseBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      elements.fileInput.click();
    });
  }

  // Remove file button
  if (elements.removeFileBtn) {
    elements.removeFileBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      removeFile();
    });
  }

  // Convert button
  if (elements.convertBtn) {
    elements.convertBtn.addEventListener("click", async function () {
      await handleConversion();
    });
  }

  // Download button
  if (elements.downloadBtn) {
    elements.downloadBtn.addEventListener("click", function () {
      downloadPdf();
    });
  }

  // Title input for button validation
  if (elements.titleInput) {
    elements.titleInput.addEventListener("input", function () {
      updateButtonState();
    });
  }

  // ---- Functions ----

  /**
   * Process the uploaded file
   */
  function processFile(file) {
    // Check if it's a zip file
    if (!file.name.toLowerCase().endsWith(".zip")) {
      showMessage("Please upload a QTI zip file (.zip)", "error");
      return;
    }

    currentFile = file;

    // Update file info display
    elements.fileName.textContent = file.name;
    elements.fileSize.textContent = formatFileSize(file.size);
    elements.fileInfo.classList.remove("hidden");

    // Set default title from filename if empty
    if (!elements.titleInput.value) {
      const baseName = file.name.split(".")[0];
      elements.titleInput.value = baseName.replace(/_/g, " ");
    }

    // Update button state
    updateButtonState();
  }

  /**
   * Preview QTI content from zip file
   */
  async function previewQTIContent(file) {
    // Preview functionality removed as requested
  }

  /**
   * Render a simplified preview of questions
   */
  function renderQuestionPreview(questionsXml) {
    // Preview functionality removed as requested
  }

  /**
   * Handle the conversion process
   */
  async function handleConversion() {
    if (!currentFile || !elements.titleInput.value.trim()) {
      showMessage("Please upload a QTI zip file and provide a title", "error");
      return;
    }

    try {
      showLoading(true);

      // Get options from form
      const options = {
        title: elements.titleInput.value.trim(),
        includeAnswers: elements.includeAnswers.checked,
        paperSize: elements.paperSize.value,
        college: elements.collegeSelect.value,
        generalDirections: elements.generalDirections.value,
      };

      // Set converter options
      converter.setOptions(options);

      // Convert to PDF (now awaiting the async method)
      pdfBlob = await converter.convertToPDF(currentFile);

      // Update results section
      updateResults(true);

      showLoading(false);
    } catch (error) {
      console.error("Error converting to PDF:", error);
      showMessage(`Error converting to PDF: ${error.message}`, "error");
      showLoading(false);
    }
  }

  /**
   * Download the generated PDF
   */
  function downloadPdf() {
    if (!pdfBlob) {
      showMessage(
        "No PDF available for download. Please convert first.",
        "error"
      );
      return;
    }

    // Create a download link
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = elements.titleInput.value.trim() + ".pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Remove the current file
   */
  function removeFile() {
    currentFile = null;
    elements.fileInput.value = "";
    elements.fileInfo.classList.add("hidden");
    updateButtonState();
  }

  /**
   * Reset the form to initial state
   */
  function resetForm() {
    currentFile = null;
    elements.fileInput.value = "";
    elements.fileInfo.classList.add("hidden");
    updateButtonState();
  }

  /**
   * Update convert button state
   */
  function updateButtonState() {
    if (currentFile && elements.titleInput.value.trim()) {
      elements.convertBtn.disabled = false;
    } else {
      elements.convertBtn.disabled = true;
    }
  }

  /**
   * Update results section after conversion
   */
  function updateResults(success) {
    if (success) {
      // Show results section
      elements.resultsSection.classList.remove("hidden");

      // Update summary
      elements.conversionSummary.innerHTML = `
                <div class="success-message">
                    <i class="fas fa-check-circle"></i>
                    <p>QTI file successfully converted to PDF!</p>
                </div>
                <div class="conversion-details">
                    <p><strong>Title:</strong> ${elements.titleInput.value.trim()}</p>
                    <p><strong>College:</strong> ${
                      elements.collegeSelect.value
                    }</p>
                    <p><strong>Paper Size:</strong> ${
                      elements.paperSize.options[
                        elements.paperSize.selectedIndex
                      ].text
                    }</p>
                </div>
            `;

      // Enable download button
      elements.downloadBtn.disabled = false;
    } else {
      elements.resultsSection.classList.add("hidden");
    }
  }

  /**
   * Show loading state
   */
  function showLoading(show) {
    const loadingOverlay = document.getElementById("qti-loading-overlay");

    if (!loadingOverlay) {
      // Create loading overlay if it doesn't exist
      const overlay = document.createElement("div");
      overlay.id = "qti-loading-overlay";
      overlay.className = "loading-overlay";

      overlay.innerHTML = `
                <div class="spinner"></div>
                <p>Converting QTI to PDF...</p>
            `;

      document.body.appendChild(overlay);

      if (!show) {
        overlay.classList.add("hidden");
      }
    } else {
      if (show) {
        loadingOverlay.classList.remove("hidden");
      } else {
        loadingOverlay.classList.add("hidden");
      }
    }
  }

  /**
   * Show a message to the user
   */
  function showMessage(message, type = "info") {
    // Add styles if not already added
    addMessageStyles();

    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toast-container";
      document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    // Add icon based on type
    let icon = "info-circle";
    if (type === "error") icon = "exclamation-circle";
    if (type === "success") icon = "check-circle";

    toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${icon}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;

    // Add to container
    toastContainer.appendChild(toast);

    // Add close button functionality
    const closeBtn = toast.querySelector(".toast-close");
    closeBtn.addEventListener("click", function () {
      toast.classList.add("toast-hiding");
      setTimeout(() => {
        toastContainer.removeChild(toast);
      }, 300);
    });

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (toast.parentNode === toastContainer) {
        toast.classList.add("toast-hiding");
        setTimeout(() => {
          if (toast.parentNode === toastContainer) {
            toastContainer.removeChild(toast);
          }
        }, 300);
      }
    }, 5000);
  }

  /**
   * Add message toast styles if not present
   */
  function addMessageStyles() {
    if (document.getElementById("toast-styles")) return;

    const style = document.createElement("style");
    style.id = "toast-styles";
    style.textContent = `
            #toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 350px;
            }
            
            .toast {
                background: white;
                border-radius: 4px;
                padding: 12px 15px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                animation: toast-in 0.3s ease-out forwards;
                overflow: hidden;
                border-left: 4px solid #4a6cf7;
            }
            
            .toast.error {
                border-left-color: #f44336;
            }
            
            .toast.success {
                border-left-color: #4caf50;
            }
            
            .toast-content {
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
            }
            
            .toast-content i {
                font-size: 1.2rem;
                color: #4a6cf7;
            }
            
            .toast.error .toast-content i {
                color: #f44336;
            }
            
            .toast.success .toast-content i {
                color: #4caf50;
            }
            
            .toast-close {
                background: none;
                border: none;
                cursor: pointer;
                color: #888;
                padding: 0;
                margin-left: 10px;
                font-size: 0.9rem;
            }
            
            .toast-close:hover {
                color: #333;
            }
            
            .toast-hiding {
                animation: toast-out 0.3s ease-out forwards;
            }
            
            @keyframes toast-in {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes toast-out {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;

    document.head.appendChild(style);
  }

  /**
   * Format file size for display
   */
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " bytes";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  }

  /**
   * Clean HTML tags from text
   */
  function cleanHtml(html) {
    if (!html) return "";

    // Create a temporary div to parse HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    // Get text content
    let text = tempDiv.textContent || tempDiv.innerText || "";

    // Clean up whitespace
    text = text.replace(/\s+/g, " ").trim();

    return text;
  }

  // Initialize button state
  updateButtonState();

  // Log initialization
  console.log("QTI to PDF Converter initialized");
});
