/**
 * QTI to PDF UI Handler
 * Manages UI interactions for QTI to PDF conversion
 */

class QTIToPDFUI {
    constructor() {
        this.converter = new QTIToPDFConverter();
        this.currentFile = null;
        this.pdfBlob = null;
        this.answerKeyPdfBlob = null;
        
        // Initialize UI elements
        this.initElements();
        this.attachEventListeners();
    }

    /**
     * Initialize UI element references
     */
    initElements() {
        // Main container
        this.elements = {
            container: document.getElementById('qti-to-pdf-container'),
            dropArea: document.getElementById('qti-drop-area'),
            fileInput: document.getElementById('qti-file-input'),
            fileInfo: document.getElementById('qti-file-info'),
            fileNameDisplay: document.getElementById('qti-file-name'),
            fileSizeDisplay: document.getElementById('qti-file-size'),
            removeFileBtn: document.getElementById('qti-remove-file'),
            titleInput: document.getElementById('qti-title-input'),
            includeAnswers: document.getElementById('qti-include-answers'),
            paperSize: document.getElementById('qti-paper-size'),
            collegeSelect: document.getElementById('qti-college-select'), // Added collegeSelect
            convertBtn: document.getElementById('qti-convert-btn'),
            previewArea: document.getElementById('qti-preview'),
            resultsSection: document.getElementById('qti-results-section'),
            conversionSummary: document.getElementById('qti-conversion-summary'),
            downloadBtn: document.getElementById('qti-download-btn'),
            downloadAnswerKeyBtn: document.getElementById('qti-download-answer-key-btn'),
            loadingOverlay: document.getElementById('qti-loading-overlay')
        };
        
        // If elements don't exist, create them
        if (!this.elements.container) {
            this.createUIElements();
        }
    }

    /**
     * Create UI elements if they don't exist
     * This is useful for integration into existing pages
     */
    createUIElements() {
        // Create a container div
        const container = document.createElement('div');
        container.className = 'qti-to-pdf-container';
        container.innerHTML = `
            <div class="qti-upload-section">
                <div id="qti-drop-area" class="drop-area">
                    <div class="drop-message">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <h3>Drag & Drop QTI Zip File</h3>
                        <p>or</p>
                        <label for="qti-file-input" class="file-input-label">Browse Files</label>
                        <input type="file" id="qti-file-input" accept=".zip" hidden>
                    </div>
                    <div id="qti-file-info" class="file-info hidden">
                        <div class="file-preview">
                            <i class="fas fa-file-archive"></i>
                            <div>
                                <h4 id="qti-file-name">filename.zip</h4>
                                <span id="qti-file-size">0 KB</span>
                            </div>
                        </div>
                        <button id="qti-remove-file" class="remove-file-btn">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="qti-options-section">
                <h3>PDF Options</h3>
                <div class="form-group">
                    <label for="qti-title-input">Document Title:</label>
                    <input type="text" id="qti-title-input" placeholder="Enter document title">
                </div>
                
                <div class="form-group">
                    <label for="qti-college-select">College:</label>
                    <select id="qti-college-select">
                        <option value="">Select College</option>
                        <option value="College of Arts and Sciences">College of Arts and Sciences</option>
                        <option value="College of Business">College of Business</option>
                        <option value="College of Education">College of Education</option>
                        <option value="College of Engineering">College of Engineering</option>
                        <option value="College of Health Sciences">College of Health Sciences</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Content Options:</label>
                    <div class="checkbox-group">
                        <div class="checkbox-item">
                            <input type="checkbox" id="qti-include-answers" checked>
                            <label for="qti-include-answers">Generate Answer Key</label>
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="qti-paper-size">Paper Size:</label>
                    <select id="qti-paper-size">
                        <option value="a4">A4 Paper</option>
                        <option value="letter">Letter (8.5" x 11")</option>
                        <option value="legal">Legal (8.5" x 14")</option>
                        <option value="short-bond">Short Bond Paper</option>
                        <option value="long-bond">Long Bond Paper</option>
                    </select>
                </div>
                
                <button id="qti-convert-btn" class="primary-btn" disabled>
                    <i class="fas fa-file-pdf"></i> Convert to PDF
                </button>
            </div>
            
            <div class="qti-preview-section">
                <h3>Preview</h3>
                <div id="qti-preview" class="preview-area">
                    <p class="placeholder-text">QTI content will appear here after upload</p>
                </div>
            </div>
            
            <div id="qti-results-section" class="qti-results-section hidden">
                <h3>Conversion Results</h3>
                <div id="qti-conversion-summary" class="conversion-summary"></div>
                <button id="qti-download-btn" class="secondary-btn">
                    <i class="fas fa-download"></i> Download PDF
                </button>
                <button id="qti-download-answer-key-btn" class="secondary-btn hidden">
                    <i class="fas fa-download"></i> Download Answer Key PDF
                </button>
            </div>
            
            <div id="qti-loading-overlay" class="loading-overlay hidden">
                <div class="spinner"></div>
                <p>Converting QTI to PDF...</p>
            </div>
        `;
        
        // Append to document or to a specified container
        document.body.appendChild(container);
        
        // Re-initialize elements after creating them
        this.initElements();
    }

    /**
     * Attach event listeners to UI elements
     */
    attachEventListeners() {
        // File drag and drop
        if (this.elements.dropArea) {
            this.elements.dropArea.addEventListener('dragover', this.handleDragOver.bind(this));
            this.elements.dropArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
            this.elements.dropArea.addEventListener('drop', this.handleFileDrop.bind(this));
            this.elements.dropArea.addEventListener('click', this.handleDropAreaClick.bind(this));
        }
        
        // File input change
        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        }
        
        // Remove file button
        if (this.elements.removeFileBtn) {
            this.elements.removeFileBtn.addEventListener('click', this.handleRemoveFile.bind(this));
        }
        
        // Convert button
        if (this.elements.convertBtn) {
            this.elements.convertBtn.addEventListener('click', this.handleConvertClick.bind(this));
        }
        
        // Download button
        if (this.elements.downloadBtn) {
            this.elements.downloadBtn.addEventListener('click', this.handleDownloadClick.bind(this));
        }
        
        // Download answer key button
        if (this.elements.downloadAnswerKeyBtn) {
            this.elements.downloadAnswerKeyBtn.addEventListener('click', this.handleDownloadAnswerKeyClick.bind(this));
        }
        
        // Option changes
        if (this.elements.titleInput) {
            this.elements.titleInput.addEventListener('input', this.updateButtonState.bind(this));
        }
    }

    /**
     * Handle drag over event
     * @param {DragEvent} e - Drag event
     */
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        this.elements.dropArea.classList.add('dragover');
    }

    /**
     * Handle drag leave event
     * @param {DragEvent} e - Drag event
     */
    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this.elements.dropArea.classList.remove('dragover');
    }

    /**
     * Handle file drop event
     * @param {DragEvent} e - Drop event
     */
    handleFileDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.elements.dropArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length) {
            this.processFile(files[0]);
        }
    }

    /**
     * Handle drop area click
     * @param {MouseEvent} e - Click event
     */
    handleDropAreaClick(e) {
        if (this.elements.fileInfo.classList.contains('hidden')) {
            this.elements.fileInput.click();
        }
    }

    /**
     * Handle file selection from input
     * @param {Event} e - Change event
     */
    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length) {
            this.processFile(files[0]);
        }
    }

    /**
     * Handle remove file button click
     * @param {MouseEvent} e - Click event
     */
    handleRemoveFile(e) {
        e.stopPropagation(); // Prevent triggering drop area click
        
        // Clear the file
        this.currentFile = null;
        this.elements.fileInput.value = '';
        
        // Update UI
        this.elements.fileInfo.classList.add('hidden');
        this.elements.previewArea.innerHTML = '<p class="placeholder-text">QTI content will appear here after upload</p>';
        
        // Disable convert button
        this.updateButtonState();
    }

    /**
     * Process the selected file
     * @param {File} file - The selected file
     */
    async processFile(file) {
        // Check if it's a zip file
        if (!file.name.toLowerCase().endsWith('.zip')) {
            this.showError('Please upload a QTI zip file (.zip)');
            return;
        }
        
        this.currentFile = file;
        
        // Update file info display
        this.elements.fileNameDisplay.textContent = file.name;
        this.elements.fileSizeDisplay.textContent = this.formatFileSize(file.size);
        this.elements.fileInfo.classList.remove('hidden');
        
        // Set default title from filename
        if (!this.elements.titleInput.value) {
            const baseName = file.name.split('.')[0];
            this.elements.titleInput.value = baseName.replace(/_/g, ' ');
        }
        
        // Try to preview the QTI content
        this.previewQTIContent(file);
        
        // Update button state
        this.updateButtonState();
    }

    /**
     * Preview QTI content
     * @param {File} file - The QTI zip file
     */
    async previewQTIContent(file) {
        try {
            this.showLoading(true);
            
            // Read the zip file
            const zip = await JSZip.loadAsync(file);
            
            // Look for questions.xml or similar file
            let questionsFile = null;
            
            for (const [path, zipEntry] of Object.entries(zip.files)) {
                const lowercasePath = path.toLowerCase();
                if (lowercasePath.includes("questions.xml") || lowercasePath.includes("assessment.xml")) {
                    questionsFile = zipEntry;
                    break;
                }
            }
            
            if (!questionsFile) {
                throw new Error("No questions file found in QTI package");
            }
            
            // Get questions file content
            const questionsXml = await questionsFile.async("text");
            
            // Show a simplified preview
            this.renderQuestionPreview(questionsXml);
            
            this.showLoading(false);
        } catch (error) {
            console.error("Error previewing QTI content:", error);
            this.elements.previewArea.innerHTML = `<p class="error-text">Error previewing QTI content: ${error.message}</p>`;
            this.showLoading(false);
        }
    }

    /**
     * Render a simplified preview of the questions
     * @param {String} questionsXml - XML content
     */
    renderQuestionPreview(questionsXml) {
        try {
            // Parse XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(questionsXml, "text/xml");
            
            // Extract title
            let title = "QTI Exam";
            const assessmentNode = xmlDoc.querySelector("assessment");
            if (assessmentNode && assessmentNode.getAttribute("title")) {
                title = assessmentNode.getAttribute("title");
            }
            
            // Extract question items
            const itemNodes = xmlDoc.querySelectorAll("item");
            
            // Create preview HTML
            let previewHtml = `
                <div class="preview-title">${title}</div>
                <div class="preview-summary">Total Questions: ${itemNodes.length}</div>
                <div class="preview-questions">
            `;
            
            // Add the first few questions to the preview
            const maxPreviewQuestions = 3;
            const previewCount = Math.min(itemNodes.length, maxPreviewQuestions);
            
            for (let i = 0; i < previewCount; i++) {
                const item = itemNodes[i];
                
                // Get question text
                const materialNode = item.querySelector("material mattext");
                let questionText = "";
                
                if (materialNode) {
                    questionText = this.cleanHtml(materialNode.textContent);
                }
                
                // Get question type
                const typeNode = item.querySelector("fieldlabel:contains('question_type'), fieldlabel");
                let questionType = "unknown";
                
                if (typeNode && typeNode.textContent.trim() === "question_type") {
                    const typeValueNode = typeNode.parentNode.querySelector("fieldentry");
                    if (typeValueNode) {
                        questionType = typeValueNode.textContent.trim();
                    }
                }
                
                // Format question type label
                let typeLabel = "Question";
                if (questionType.includes("multiple_choice")) {
                    typeLabel = "Multiple Choice";
                } else if (questionType.includes("multiple_answers")) {
                    typeLabel = "Multiple Answer";
                } else if (questionType.includes("true_false")) {
                    typeLabel = "True/False";
                } else if (questionType.includes("essay")) {
                    typeLabel = "Essay";
                } else if (questionType.includes("short_answer") || questionType.includes("fill_in")) {
                    typeLabel = "Fill in the Blank";
                }
                
                // Add question to preview
                previewHtml += `
                    <div class="preview-question">
                        <div class="preview-question-number">${i + 1}</div>
                        <div class="preview-question-type">${typeLabel}</div>
                        <div class="preview-question-text">${questionText}</div>
                    </div>
                `;
            }
            
            // Add more indicator if needed
            if (itemNodes.length > maxPreviewQuestions) {
                previewHtml += `
                    <div class="preview-more">
                        ... and ${itemNodes.length - maxPreviewQuestions} more questions
                    </div>
                `;
            }
            
            previewHtml += '</div>';
            
            // Add preview to DOM
            this.elements.previewArea.innerHTML = previewHtml;
        } catch (error) {
            console.error("Error rendering question preview:", error);
            this.elements.previewArea.innerHTML = `<p class="error-text">Error rendering preview: ${error.message}</p>`;
        }
    }

    /**
     * Handle convert button click
     * @param {MouseEvent} e - Click event
     */
    async handleConvertClick(e) {
        if (!this.currentFile || !this.elements.titleInput.value.trim()) {
            this.showError('Please upload a QTI zip file and provide a title');
            return;
        }
        
        try {
            this.showLoading(true);
            
            // Get options from form
            const options = {
                title: this.elements.titleInput.value.trim(),
                includeAnswers: false, // Always exclude answers from the exam PDF
                paperSize: this.elements.paperSize.value,
                college: this.elements.collegeSelect.value
            };
            
            // Set converter options
            this.converter.setOptions(options);
            
            // Convert to PDF (exam without answers)
            const examPdfBlob = await this.converter.convertToPDF(this.currentFile);
            
            // Store exam PDF blob for download
            this.pdfBlob = examPdfBlob;
            
            // Generate answer key PDF if option is checked
            if (this.elements.includeAnswers.checked) {
                // Create a new instance for the answer key
                const answerKeyConverter = new QTIToPDFConverter();
                
                // Set options for answer key (include answers)
                const answerKeyOptions = {
                    title: this.elements.titleInput.value.trim() + " - Answer Key",
                    includeAnswers: true, // Include answers in the answer key
                    paperSize: this.elements.paperSize.value,
                    college: this.elements.collegeSelect.value
                };
                
                answerKeyConverter.setOptions(answerKeyOptions);
                
                // Convert to PDF (answer key with answers)
                const answerKeyPdfBlob = await answerKeyConverter.convertToPDF(this.currentFile);
                
                // Store answer key PDF blob
                this.answerKeyPdfBlob = answerKeyPdfBlob;
            }
            
            // Update results section
            this.updateResults(true);
            
            this.showLoading(false);
        } catch (error) {
            console.error("Error converting to PDF:", error);
            this.showError(`Error converting to PDF: ${error.message}`);
            this.showLoading(false);
        }
    }

    /**
     * Handle download button click
     * @param {MouseEvent} e - Click event
     */
    handleDownloadClick(e) {
        if (!this.pdfBlob) {
            this.showError('No PDF available for download. Please convert first.');
            return;
        }
        
        // Create filename from title
        const title = this.elements.titleInput.value.trim();
        const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${sanitizedTitle}_exam.pdf`;
        
        // Create download link
        const url = URL.createObjectURL(this.pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);
    }

    /**
     * Handle download answer key button click
     * @param {MouseEvent} e - Click event
     */
    handleDownloadAnswerKeyClick(e) {
        if (!this.answerKeyPdfBlob) {
            this.showError('No answer key PDF available for download. Please convert first.');
            return;
        }
        
        // Create filename from title
        const title = this.elements.titleInput.value.trim();
        const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${sanitizedTitle}_answer_key.pdf`;
        
        // Create download link
        const url = URL.createObjectURL(this.answerKeyPdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);
    }

    /**
     * Update convert button state
     */
    updateButtonState() {
        if (this.elements.convertBtn) {
            this.elements.convertBtn.disabled = !this.currentFile || !this.elements.titleInput.value.trim();
        }
    }

    /**
     * Update results section
     * @param {Boolean} success - Whether conversion was successful
     */
    updateResults(success) {
        if (success) {
            // Show results section
            this.elements.resultsSection.classList.remove('hidden');
            
            // Update summary
            const paperSize = this.elements.paperSize.options[this.elements.paperSize.selectedIndex].text;
            const college = this.elements.collegeSelect.options[this.elements.collegeSelect.selectedIndex].text;
            
            this.elements.conversionSummary.innerHTML = `
                <div class="success-message">
                    <i class="fas fa-check-circle"></i>
                    Successfully converted QTI to PDF
                </div>
                <p><strong>Title:</strong> ${this.elements.titleInput.value}</p>
                <p><strong>College:</strong> ${college}</p>
                <p><strong>Paper Size:</strong> ${paperSize}</p>
                <p><strong>Answer Key Generated:</strong> ${this.elements.includeAnswers.checked ? 'Yes' : 'No'}</p>
            `;
            
            // Show download answer key button if answer key was generated
            if (this.answerKeyPdfBlob) {
                this.elements.downloadAnswerKeyBtn.classList.remove('hidden');
            }
            
            // Scroll to results
            this.elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * Show error message
     * @param {String} message - Error message
     */
    showError(message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'qti-error-toast';
        toast.innerHTML = `
            <div class="toast-icon"><i class="fas fa-exclamation-circle"></i></div>
            <div class="toast-message">${message}</div>
            <div class="toast-close"><i class="fas fa-times"></i></div>
        `;
        
        // Add close handler
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(toast);
        });
        
        // Add to document
        document.body.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 5000);
    }

    /**
     * Show or hide loading overlay
     * @param {Boolean} show - Whether to show loading
     */
    showLoading(show) {
        if (show) {
            this.elements.loadingOverlay.classList.remove('hidden');
        } else {
            this.elements.loadingOverlay.classList.add('hidden');
        }
    }

    /**
     * Format file size
     * @param {Number} bytes - File size in bytes
     * @returns {String} - Formatted file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Clean HTML tags from text
     * @param {String} html - HTML text
     * @returns {String} - Cleaned text
     */
    cleanHtml(html) {
        if (!html) return "";
        
        // Simple HTML cleaning
        let cleaned = html
            .replace(/<p>/gi, "")
            .replace(/<\/p>/gi, " ")
            .replace(/<br\s*\/?>/gi, " ")
            .replace(/<div>/gi, "")
            .replace(/<\/div>/gi, " ")
            .replace(/<li>/gi, "• ")
            .replace(/<\/li>/gi, " ");
            
        // Remove any remaining HTML tags
        cleaned = cleaned.replace(/<[^>]*>/g, "");
        
        // Decode HTML entities
        const textarea = document.createElement("textarea");
        textarea.innerHTML = cleaned;
        cleaned = textarea.value;
        
        // Trim and limit length for preview
        cleaned = cleaned.trim();
        if (cleaned.length > 150) {
            cleaned = cleaned.substring(0, 150) + "...";
        }
        
        return cleaned;
    }
}

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Create and initialize QTIToPDFUI
    window.qtiToPdfUI = new QTIToPDFUI();
});

// Export the QTIToPDFUI class
window.QTIToPDFUI = QTIToPDFUI;