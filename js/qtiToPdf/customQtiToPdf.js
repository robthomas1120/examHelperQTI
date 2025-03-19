/**
 * Custom QTI to PDF Converter Script
 * This script is designed to work specifically with your HTML structure
 */

document.addEventListener('DOMContentLoaded', function() {
    // Core functionality from QTIToPDFConverter
    const converter = new QTIToPDFConverter();

    // DOM elements - using your specific IDs
    const elements = {
        dropArea: document.getElementById('dropArea'),
        fileInput: document.getElementById('qtiFile'),
        fileInfo: document.getElementById('fileInfo'),
        fileName: document.getElementById('file-name'),
        fileSize: document.getElementById('file-size'),
        removeFileBtn: document.getElementById('removeFile'),
        titleInput: document.getElementById('documentTitle'),
        includeAnswers: document.getElementById('includeAnswers'),
        paperSize: document.getElementById('paperSize'),
        previewArea: document.getElementById('qti-preview'),
        convertBtn: document.getElementById('convertBtn'),
        downloadBtn: document.getElementById('downloadBtn'),
        resultsSection: document.getElementById('results-section'),
        conversionSummary: document.getElementById('conversion-summary')
    };

    // Current file variable
    let currentFile = null;
    let pdfBlob = null;

    // ---- Event Listeners ----

    // Drag and drop functionality
    elements.dropArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.dropArea.classList.add('highlight');
    });

    elements.dropArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.dropArea.classList.remove('highlight');
    });

    elements.dropArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.dropArea.classList.remove('highlight');
        
        const files = e.dataTransfer.files;
        if (files.length) {
            processFile(files[0]);
        }
    });

    // Click on drop area to browse files
    elements.dropArea.addEventListener('click', function(e) {
        // Only trigger if not clicking on the file info area or remove button
        if (elements.fileInfo.classList.contains('hidden') && 
            !e.target.closest('#removeFile') &&
            !e.target.closest('.file-info')) {
            
            elements.fileInput.click();
        }
    });

    // File input change
    elements.fileInput.addEventListener('change', function(e) {
        const files = e.target.files;
        if (files.length) {
            processFile(files[0]);
        }
    });

    // Browse button
    const browseBtn = document.querySelector('.browse-btn');
    if (browseBtn) {
        browseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            elements.fileInput.click();
        });
    }

    // Remove file button
    if (elements.removeFileBtn) {
        elements.removeFileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            removeFile();
        });
    }

    // Convert button
    if (elements.convertBtn) {
        elements.convertBtn.addEventListener('click', function() {
            handleConversion();
        });
    }

    // Download button
    if (elements.downloadBtn) {
        elements.downloadBtn.addEventListener('click', function() {
            downloadPdf();
        });
    }

    // Title input for button validation
    if (elements.titleInput) {
        elements.titleInput.addEventListener('input', function() {
            updateButtonState();
        });
    }

    // ---- Functions ----

    /**
     * Process the uploaded file
     */
    function processFile(file) {
        // Check if it's a zip file
        if (!file.name.toLowerCase().endsWith('.zip')) {
            showMessage('Please upload a QTI zip file (.zip)', 'error');
            return;
        }

        currentFile = file;

        // Update file info display
        elements.fileName.textContent = file.name;
        elements.fileSize.textContent = formatFileSize(file.size);
        elements.fileInfo.classList.remove('hidden');

        // Set default title from filename if empty
        if (!elements.titleInput.value) {
            const baseName = file.name.split('.')[0];
            elements.titleInput.value = baseName.replace(/_/g, ' ');
        }

        // Try to preview QTI content
        previewQTIContent(file);

        // Update button state
        updateButtonState();
    }

    /**
     * Preview QTI content from zip file
     */
    async function previewQTIContent(file) {
        try {
            showLoading(true);

            // Read the zip file
            const zip = await JSZip.loadAsync(file);

            // Look for questions.xml or similar file
            let questionsFile = null;

            for (const [path, zipEntry] of Object.entries(zip.files)) {
                const lowercasePath = path.toLowerCase();
                if (lowercasePath.includes("questions.xml") || 
                    lowercasePath.includes("assessment.xml")) {
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
            renderQuestionPreview(questionsXml);

            showLoading(false);
        } catch (error) {
            console.error("Error previewing QTI content:", error);
            elements.previewArea.innerHTML = `<p class="error-text">Error previewing QTI content: ${error.message}</p>`;
            showLoading(false);
        }
    }

    /**
     * Render a simplified preview of questions
     */
    function renderQuestionPreview(questionsXml) {
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
                    questionText = cleanHtml(materialNode.textContent);
                }

                // Get question type
                const typeNode = item.querySelector("fieldlabel");
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
            elements.previewArea.innerHTML = previewHtml;
        } catch (error) {
            console.error("Error rendering question preview:", error);
            elements.previewArea.innerHTML = `<p class="error-text">Error rendering preview: ${error.message}</p>`;
        }
    }

    /**
     * Handle the conversion process
     */
    async function handleConversion() {
        if (!currentFile || !elements.titleInput.value.trim()) {
            showMessage('Please upload a QTI zip file and provide a title', 'error');
            return;
        }

        try {
            showLoading(true);

            // Get options from form
            const options = {
                title: elements.titleInput.value.trim(),
                includeAnswers: elements.includeAnswers.checked,
                paperSize: elements.paperSize.value
            };

            // Set converter options
            converter.setOptions(options);

            // Convert to PDF
            pdfBlob = await converter.convertToPDF(currentFile);

            // Update results section
            updateResults(true);

            showLoading(false);
        } catch (error) {
            console.error("Error converting to PDF:", error);
            showMessage(`Error converting to PDF: ${error.message}`, 'error');
            showLoading(false);
        }
    }

    /**
     * Download the generated PDF
     */
    function downloadPdf() {
        if (!pdfBlob) {
            showMessage('No PDF available for download. Please convert first.', 'error');
            return;
        }

        // Create filename from title
        const title = elements.titleInput.value.trim();
        const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${sanitizedTitle}_exam.pdf`;

        // Create download link
        const url = URL.createObjectURL(pdfBlob);
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
     * Remove the current file
     */
    function removeFile() {
        currentFile = null;
        elements.fileInput.value = '';
        elements.fileInfo.classList.add('hidden');
        elements.previewArea.innerHTML = '<p class="placeholder-text">QTI content will appear here after upload</p>';
        updateButtonState();
    }

    /**
     * Update convert button state
     */
    function updateButtonState() {
        if (elements.convertBtn) {
            elements.convertBtn.disabled = !currentFile || !elements.titleInput.value.trim();
        }
    }

    /**
     * Update results section after conversion
     */
    function updateResults(success) {
        if (success) {
            // Show results section
            elements.resultsSection.classList.remove('hidden');

            // Update summary
            const paperSizeText = elements.paperSize.options[elements.paperSize.selectedIndex].text;

            elements.conversionSummary.innerHTML = `
                <div class="success-message">
                    <i class="fas fa-check-circle"></i>
                    Successfully converted QTI to PDF
                </div>
                <p><strong>Title:</strong> ${elements.titleInput.value}</p>
                <p><strong>Paper Size:</strong> ${paperSizeText}</p>
                <p><strong>Answers Included:</strong> ${elements.includeAnswers.checked ? 'Yes' : 'No'}</p>
            `;

            // Scroll to results
            elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * Show loading state
     */
    function showLoading(show) {
        // Create or find loading overlay
        let loadingOverlay = document.getElementById('loading-overlay');
        
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loading-overlay';
            loadingOverlay.className = 'loading-overlay hidden';
            loadingOverlay.innerHTML = `
                <div class="spinner"></div>
                <p>Converting QTI to PDF...</p>
            `;
            document.body.appendChild(loadingOverlay);
        }
        
        if (show) {
            loadingOverlay.classList.remove('hidden');
        } else {
            loadingOverlay.classList.add('hidden');
        }
    }

    /**
     * Show a message to the user
     */
    function showMessage(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `message-toast ${type}-toast`;
        toast.innerHTML = `
            <div class="toast-icon"><i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i></div>
            <div class="toast-message">${message}</div>
            <div class="toast-close"><i class="fas fa-times"></i></div>
        `;

        // Add close handler
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(toast);
        });

        // Add styles if not already present
        addMessageStyles();

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
     * Add message toast styles if not present
     */
    function addMessageStyles() {
        if (document.getElementById('message-toast-styles')) return;

        const style = document.createElement('style');
        style.id = 'message-toast-styles';
        style.textContent = `
            .message-toast {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background-color: white;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                padding: 15px;
                border-radius: 5px;
                display: flex;
                align-items: center;
                min-width: 300px;
                max-width: 400px;
                z-index: 1001;
                animation: slideIn 0.3s ease;
            }
            
            .error-toast {
                border-left: 4px solid #e53e3e;
            }
            
            .info-toast {
                border-left: 4px solid #4299e1;
            }
            
            .success-toast {
                border-left: 4px solid #48bb78;
            }
            
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            .toast-icon {
                margin-right: 15px;
                font-size: 1.5rem;
                flex-shrink: 0;
            }
            
            .error-toast .toast-icon {
                color: #e53e3e;
            }
            
            .info-toast .toast-icon {
                color: #4299e1;
            }
            
            .success-toast .toast-icon {
                color: #48bb78;
            }
            
            .toast-message {
                flex: 1;
                font-size: 0.95rem;
            }
            
            .toast-close {
                cursor: pointer;
                color: #718096;
                padding: 5px;
                margin-left: 10px;
                transition: color 0.3s ease;
            }
            
            .toast-close:hover {
                color: #e53e3e;
            }
            
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            
            .loading-overlay.hidden {
                display: none;
            }
            
            .spinner {
                width: 50px;
                height: 50px;
                border: 5px solid #f3f3f3;
                border-top: 5px solid #4a6cf7;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 15px;
            }
            
            .loading-overlay p {
                color: white;
                font-size: 1.1rem;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Format file size for display
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Clean HTML tags from text
     */
    function cleanHtml(html) {
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

    // Initialize button state
    updateButtonState();

    // Log initialization
    console.log('QTI to PDF converter initialized');
});

/**
 * QTI to PDF Converter Class
 */
class QTIToPDFConverter {
    constructor() {
        this.jszip = JSZip;
        this.jspdf = jspdf.jsPDF;
        this.questions = [];
        this.title = "Exam";
        this.includeAnswers = true;
        this.includeImages = false;
        this.paperSize = "a4"; // Default paper size
        
        // Paper size configurations
        this.paperSizes = {
            "a4": {
                width: 210,
                height: 297,
                unit: "mm",
                orientation: "portrait"
            },
            "letter": {
                width: 215.9,
                height: 279.4,
                unit: "mm",
                orientation: "portrait"
            },
            "legal": {
                width: 215.9,
                height: 355.6,
                unit: "mm",
                orientation: "portrait"
            },
            "short-bond": {
                width: 215.9,
                height: 279.4, // 8.5" x 11"
                unit: "mm",
                orientation: "portrait"
            },
            "long-bond": {
                width: 215.9,
                height: 355.6, // 8.5" x 14"
                unit: "mm",
                orientation: "portrait"
            }
        };
    }

    /**
     * Set PDF options
     * @param {Object} options - PDF generation options
     */
    setOptions(options) {
        if (options.title) this.title = options.title;
        if (options.includeAnswers !== undefined) this.includeAnswers = options.includeAnswers;
        if (options.paperSize) this.paperSize = options.paperSize;
    }

    /**
     * Convert QTI zip file to PDF
     * @param {File} file - QTI zip file
     * @returns {Promise<Blob>} - Promise resolving to PDF blob
     */
    async convertToPDF(file) {
        try {
            // Extract questions from QTI zip file
            await this.extractQuestionsFromZip(file);
            
            // Generate PDF with questions
            const pdfBlob = await this.generatePDF();
            
            return pdfBlob;
        } catch (error) {
            console.error("Error converting QTI to PDF:", error);
            throw error;
        }
    }

    /**
     * Extract questions from QTI zip file
     * @param {File} file - QTI zip file
     */
    async extractQuestionsFromZip(file) {
        try {
            // Read zip file
            const zipData = await this.jszip.loadAsync(file);
            
            // Look for questions.xml or similar file
            let questionsFile = null;
            let metadataFile = null;
            
            // Search for files in zip
            for (const [path, zipEntry] of Object.entries(zipData.files)) {
                const lowercasePath = path.toLowerCase();
                if (lowercasePath.includes("questions.xml") || lowercasePath.includes("assessment.xml")) {
                    questionsFile = zipEntry;
                }
                if (lowercasePath.includes("meta") || lowercasePath.includes("metadata")) {
                    metadataFile = zipEntry;
                }
            }
            
            if (!questionsFile) {
                throw new Error("No questions file found in QTI package");
            }
            
            // Get questions file content
            const questionsXml = await questionsFile.async("text");
            
            // Parse questions XML
            this.parseQuestionsXml(questionsXml);
            
            // Parse metadata if available
            if (metadataFile) {
                const metadataXml = await metadataFile.async("text");
                this.parseMetadataXml(metadataXml);
            }
            
            // Extract images if includeImages is true
            if (this.includeImages) {
                await this.extractImages(zipData);
            }
        } catch (error) {
            console.error("Error extracting questions from zip:", error);
            throw error;
        }
    }

    /**
     * Parse questions XML
     * @param {String} xml - Questions XML content
     */
    parseQuestionsXml(xml) {
        try {
            // Parse XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, "text/xml");
            
            // Extract assessment title if available
            const assessmentNode = xmlDoc.querySelector("assessment");
            if (assessmentNode && assessmentNode.getAttribute("title")) {
                this.title = assessmentNode.getAttribute("title");
            }
            
            // Extract questions
            const itemNodes = xmlDoc.querySelectorAll("item");
            this.questions = [];
            
            itemNodes.forEach((itemNode, index) => {
                // Get question type
                const typeNode = itemNode.querySelector("fieldlabel");
                let questionType = "unknown";
                
                if (typeNode && typeNode.textContent.trim() === "question_type") {
                    const typeValueNode = typeNode.parentNode.querySelector("fieldentry");
                    if (typeValueNode) {
                        questionType = typeValueNode.textContent.trim();
                    }
                }
                
                // Get question text
                const materialNode = itemNode.querySelector("material mattext");
                let questionText = "";
                
                if (materialNode) {
                    questionText = this.cleanHtml(materialNode.textContent);
                }
                
                // Get answer options based on question type
                let options = [];
                let correctAnswer = null;
                
                if (questionType.includes("multiple_choice")) {
                    // Get options
                    const responseLabels = itemNode.querySelectorAll("response_label");
                    responseLabels.forEach((label) => {
                        const id = label.getAttribute("ident");
                        const textNode = label.querySelector("mattext");
                        const text = textNode ? this.cleanHtml(textNode.textContent) : "";
                        
                        options.push({
                            id: id,
                            text: text,
                            correct: false
                        });
                    });
                    
                    // Find correct answer(s)
                    const respConditions = itemNode.querySelectorAll("respcondition");
                    let foundCorrectAnswer = false;
                    
                    respConditions.forEach((condition) => {
                        const setvarNode = condition.querySelector("setvar[varname='SCORE'][action='Set']");
                        
                        if (setvarNode && parseFloat(setvarNode.textContent) > 0) {
                            const varequals = condition.querySelectorAll("varequal");
                            
                            varequals.forEach((varequal) => {
                                const responseId = varequal.textContent.trim();
                                foundCorrectAnswer = true;
                                
                                // Mark option as correct
                                options.forEach((option) => {
                                    if (option.id === responseId) {
                                        option.correct = true;
                                    }
                                });
                            });
                        }
                    });
                    
                    // If no correct answers were found, this might be a different format
                    // Try to find correct answers through response_lid/render_choice
                    if (!foundCorrectAnswer) {
                        // Reset all options to not correct first
                        options.forEach(option => option.correct = false);
                        
                        // Try to find correct answers in a different way
                        const correctPattern = itemNode.querySelector("setvar[varname='SCORE'][action='Set'][textContent^='1']");
                        if (correctPattern) {
                            const parentCondition = correctPattern.closest("respcondition");
                            if (parentCondition) {
                                const correctVarequals = parentCondition.querySelectorAll("varequal");
                                correctVarequals.forEach(varequal => {
                                    const correctId = varequal.textContent.trim();
                                    options.forEach(option => {
                                        if (option.id === correctId) {
                                            option.correct = true;
                                        }
                                    });
                                });
                            }
                        }
                    }
                } else if (questionType.includes("true_false")) {
                    // Handle true/false questions
                    const respCondition = itemNode.querySelector("respcondition");
                    const varequal = respCondition ? respCondition.querySelector("varequal") : null;
                    
                    // Add True/False options
                    options = [
                        { id: "true", text: "True", correct: false },
                        { id: "false", text: "False", correct: false }
                    ];
                    
                    if (varequal) {
                        const correctId = varequal.textContent.trim();
                        
                        // Find if True or False is correct
                        const responseLabels = itemNode.querySelectorAll("response_label");
                        responseLabels.forEach((label) => {
                            const id = label.getAttribute("ident");
                            const textNode = label.querySelector("mattext");
                            const text = textNode ? this.cleanHtml(textNode.textContent).toLowerCase() : "";
                            
                            if (id === correctId) {
                                correctAnswer = text.includes("true") ? "true" : "false";
                                
                                // Mark the correct option
                                options.forEach((option) => {
                                    option.correct = (option.id === correctAnswer);
                                });
                            }
                        });
                    }
                } else if (questionType.includes("essay")) {
                    // Essay questions have no options or correct answers
                } else if (questionType.includes("short_answer") || questionType.includes("fill_in")) {
                    // Get correct answers for fill-in-the-blank
                    const respConditions = itemNode.querySelectorAll("respcondition");
                    const correctAnswers = [];
                    
                    respConditions.forEach((condition) => {
                        const varequal = condition.querySelector("varequal");
                        if (varequal) {
                            correctAnswers.push(varequal.textContent.trim());
                        }
                    });
                    
                    if (correctAnswers.length > 0) {
                        correctAnswer = correctAnswers.join(", ");
                    }
                } else if (questionType.includes("multiple_answers")) {
                    // Get options
                    const responseLabels = itemNode.querySelectorAll("response_label");
                    responseLabels.forEach((label) => {
                        const id = label.getAttribute("ident");
                        const textNode = label.querySelector("mattext");
                        const text = textNode ? this.cleanHtml(textNode.textContent) : "";
                        
                        options.push({
                            id: id,
                            text: text,
                            correct: false
                        });
                    });
                    
                    // Find correct answers - for multiple_answers, we need to look at the <and> structure
                    const respConditions = itemNode.querySelectorAll("respcondition");
                    
                    respConditions.forEach((condition) => {
                        const setvarNode = condition.querySelector("setvar[varname='SCORE'][action='Set']");
                        
                        if (setvarNode && parseFloat(setvarNode.textContent) > 0) {
                            // Look for the <and> element that contains the correct answers
                            const andElement = condition.querySelector("and");
                            
                            if (andElement) {
                                // Get all direct varequal children (these are the correct answers)
                                const directVarequals = Array.from(andElement.children).filter(
                                    child => child.tagName === "varequal"
                                );
                                
                                // Mark these options as correct
                                directVarequals.forEach(varequal => {
                                    const responseId = varequal.textContent.trim();
                                    options.forEach(option => {
                                        if (option.id === responseId) {
                                            option.correct = true;
                                        }
                                    });
                                });
                                
                                // Get all <not> elements (these contain incorrect answers)
                                const notElements = andElement.querySelectorAll("not");
                                
                                // Make sure these options are marked as incorrect
                                notElements.forEach(notElement => {
                                    const varequal = notElement.querySelector("varequal");
                                    if (varequal) {
                                        const responseId = varequal.textContent.trim();
                                        options.forEach(option => {
                                            if (option.id === responseId) {
                                                option.correct = false;
                                            }
                                        });
                                    }
                                });
                            }
                        }
                    });
                }
                
                // Add question to array
                this.questions.push({
                    id: itemNode.getAttribute("ident") || `question_${index + 1}`,
                    type: questionType,
                    text: questionText,
                    options: options,
                    correctAnswer: correctAnswer,
                    index: index + 1
                });
            });
            
            console.log("Parsed questions:", this.questions);
        } catch (error) {
            console.error("Error parsing questions XML:", error);
            throw error;
        }
    }

    /**
     * Parse metadata XML
     * @param {String} xml - Metadata XML content
     */
    parseMetadataXml(xml) {
        try {
            // Parse XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, "text/xml");
            
            // Extract title
            const titleNode = xmlDoc.querySelector("title");
            if (titleNode && titleNode.textContent) {
                this.title = titleNode.textContent.trim();
            }
            
            // Extract description if needed
            const descriptionNode = xmlDoc.querySelector("description");
            if (descriptionNode && descriptionNode.textContent) {
                this.description = this.cleanHtml(descriptionNode.textContent);
            }
        } catch (error) {
            console.error("Error parsing metadata XML:", error);
            // Continue without metadata - not critical
        }
    }

    /**
     * Extract images from zip file
     * @param {JSZip} zipData - ZIP file data
     */
    async extractImages(zipData) {
        try {
            const imageFiles = {};
            
            // Find image files in zip
            for (const [path, zipEntry] of Object.entries(zipData.files)) {
                const lowercasePath = path.toLowerCase();
                if (
                    !zipEntry.dir && 
                    (lowercasePath.endsWith(".jpg") || 
                     lowercasePath.endsWith(".jpeg") || 
                     lowercasePath.endsWith(".png") || 
                     lowercasePath.endsWith(".gif"))
                ) {
                    // Extract image data
                    const imageData = await zipEntry.async("blob");
                    
                    // Convert to data URL
                    const dataUrl = await this.blobToDataUrl(imageData);
                    
                    // Store in imageFiles object
                    const filename = path.split("/").pop();
                    imageFiles[filename] = dataUrl;
                }
            }
            
            // Store extracted images
            this.imageFiles = imageFiles;
        } catch (error) {
            console.error("Error extracting images:", error);
            // Continue without images - not critical
            this.imageFiles = {};
        }
    }
    
    /**
     * Convert Blob to Data URL
     * @param {Blob} blob - Image blob
     * @returns {Promise<String>} - Data URL
     */
    blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    
    /**
     * Generate PDF with extracted questions
     * @returns {Promise<Blob>} - PDF blob
     */
    async generatePDF() {
        // Get paper size configuration
        const paperConfig = this.paperSizes[this.paperSize] || this.paperSizes.a4;
        
        // Create new PDF document
        const pdf = new this.jspdf({
            orientation: paperConfig.orientation,
            unit: paperConfig.unit,
            format: [paperConfig.width, paperConfig.height]
        });
        
        // Set metadata
        pdf.setProperties({
            title: this.title,
            subject: "QTI Exam",
            author: "QTI to PDF Converter",
            creator: "QTI to PDF Converter"
        });
        
        // Margin settings
        const margin = {
            top: 20,
            right: 20,
            bottom: 20,
            left: 20
        };
        
        // Available width for content
        const contentWidth = paperConfig.width - margin.left - margin.right;
        
        // Current Y position
        let y = margin.top;
        
        // Add title
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        
        // Center the title
        const titleWidth = pdf.getStringUnitWidth(this.title) * 16 / pdf.internal.scaleFactor;
        const titleX = (paperConfig.width - titleWidth) / 2;
        
        pdf.text(this.title, titleX, y);
        y += 10;
        
        // Add description if available
        if (this.description) {
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
            
            const descLines = pdf.splitTextToSize(this.description, contentWidth);
            pdf.text(descLines, margin.left, y);
            y += descLines.length * 5 + 5;
        }
        
        // Add exam details
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Date: ${new Date().toLocaleDateString()}`, margin.left, y);
        pdf.text(`Number of Questions: ${this.questions.length}`, margin.left, y + 5);
        y += 15;
        
        // Draw a horizontal line
        pdf.setLineWidth(0.5);
        pdf.line(margin.left, y, paperConfig.width - margin.right, y);
        y += 10;
        
        // Process each question
        for (let i = 0; i < this.questions.length; i++) {
            const question = this.questions[i];
            
            // Check if we need a new page
            if (y > paperConfig.height - margin.bottom - 40) {
                pdf.addPage();
                y = margin.top;
                
                // Always add page number
                this.addPageNumber(pdf);
            }
            
            // Question number and text
            pdf.setFontSize(12);
            pdf.setFont("helvetica", "bold");
            pdf.text(`${i + 1}. `, margin.left, y);
            
            // Question text (indented)
            const questionIndent = margin.left + 7;
            pdf.setFont("helvetica", "normal");
            
            // Check if question text contains HTML, and clean it
            const cleanedText = this.cleanHtml(question.text || '');
            
            // Split long text to fit page width
            const textLines = pdf.splitTextToSize(cleanedText, contentWidth - 7);
            pdf.text(textLines, questionIndent, y);
            
            // Move down based on number of lines
            y += textLines.length * 5 + 5;
            
            // Process answer options based on question type
            if (question.type.includes("multiple_choice")) {
                pdf.setFontSize(10);
                
                // Draw options
                for (let j = 0; j < question.options.length; j++) {
                    const option = question.options[j];
                    
                    // Check if we need a new page
                    if (y > paperConfig.height - margin.bottom - 20) {
                        pdf.addPage();
                        y = margin.top;
                        
                        // Always add page number
                        this.addPageNumber(pdf);
                    }
                    
                    // Option letter (A, B, C, etc.)
                    const optionLetter = String.fromCharCode(65 + j);
                    
                    // Draw checkbox/circle for the option
                    pdf.circle(margin.left + 3, y - 1.5, 1.5, 'S');
                    
                    // If including answers and this is the correct answer
                    if (this.includeAnswers && option.correct) {
                        // Fill the circle for correct answer
                        pdf.circle(margin.left + 3, y - 1.5, 0.8, 'F');
                    }
                    
                    // Option text
                    const optionText = `${optionLetter}. ${this.cleanHtml(option.text || '')}`;
                    const optionIndent = margin.left + 7;
                    
                    // Split long option text
                    const optionLines = pdf.splitTextToSize(optionText, contentWidth - 10);
                    pdf.text(optionLines, optionIndent, y);
                    
                    // Move down based on number of lines
                    y += optionLines.length * 5 + 3;
                }
            } else if (question.type.includes("true_false")) {
                // For true/false questions, add one underline before the question number
                // Go back to the question number position
                const questionY = y - textLines.length * 5 - 5; // Go back to the question number position
                
                // Draw one underline before the question number
                pdf.setDrawColor(0, 0, 0);
                pdf.setLineWidth(0.5);
                
                // Calculate the position for the underline (before the question number)
                const underlineX = margin.left - 15;
                const underlineWidth = 12;
                
                // Draw one underline
                pdf.line(underlineX, questionY, underlineX + underlineWidth, questionY);
                
                // If including answers, indicate the correct answer
                if (this.includeAnswers) {
                    // Find the correct answer
                    const correctAnswer = question.options.find(option => option.correct);
                    if (correctAnswer) {
                        pdf.setFontSize(10);
                        pdf.setTextColor(70, 130, 180); // Steel Blue color for answers
                        pdf.text(`Answer: ${correctAnswer.text}`, margin.left, y);
                        pdf.setTextColor(0, 0, 0); // Reset to black
                        y += 8;
                    }
                }
            } else if (question.type.includes("essay")) {
                // Add blank lines for essay response
                pdf.setDrawColor(200, 200, 200);
                
                for (let j = 0; j < 10; j++) {
                    // Check if we need a new page
                    if (y > paperConfig.height - margin.bottom - 15) {
                        pdf.addPage();
                        y = margin.top;
                    }
                    
                    // Draw a line for writing
                    pdf.line(margin.left, y + 4, paperConfig.width - margin.right, y + 4);
                    y += 8;
                }
                
                pdf.setDrawColor(0, 0, 0);
            } else if (question.type.includes("short_answer") || question.type.includes("fill_in")) {
                // Add blank space for short answer - no underlines
                
                // Check if we need a new page
                if (y > paperConfig.height - margin.bottom - 15) {
                    pdf.addPage();
                    y = margin.top;
                    
                    // Always add page number
                    this.addPageNumber(pdf);
                }
                
                // Add some space instead of drawing a line
                y += 8;
                
                // Show correct answer if enabled
                if (this.includeAnswers && question.correctAnswer) {
                    pdf.setFontSize(10);
                    pdf.setTextColor(70, 130, 180); // Steel Blue color for answers
                    pdf.text(`Answer: ${question.correctAnswer}`, margin.left, y);
                    pdf.setTextColor(0, 0, 0); // Reset to black
                    y += 8;
                }
            } else if (question.type.includes("multiple_answers")) {
                // For multiple answer questions, display options normally in the exam
                // But in the answer key, show the correct answers as text
                
                // Check if we need a new page
                if (y > paperConfig.height - margin.bottom - 15) {
                    pdf.addPage();
                    y = margin.top;
                    
                    // Always add page number
                    this.addPageNumber(pdf);
                }
                
                // Display options normally
                for (let j = 0; j < question.options.length; j++) {
                    const option = question.options[j];
                    
                    // Check if we need a new page
                    if (y > paperConfig.height - margin.bottom - 10) {
                        pdf.addPage();
                        y = margin.top;
                        
                        // Always add page number
                        this.addPageNumber(pdf);
                    }
                    
                    // Option letter (A, B, C, etc.)
                    const optionLetter = String.fromCharCode(65 + j);
                    
                    // Draw checkbox/circle for the option
                    pdf.rect(margin.left + 2, y - 3, 3, 3, 'S');
                    
                    // If including answers and this is the correct answer
                    if (this.includeAnswers && option.correct) {
                        // Draw an X in the square for correct answer
                        pdf.setLineWidth(0.3);
                        pdf.line(margin.left + 2, y - 3, margin.left + 5, y);
                        pdf.line(margin.left + 5, y - 3, margin.left + 2, y);
                        pdf.setLineWidth(0.2);
                    }
                    
                    // Option text
                    const optionText = `${optionLetter}. ${this.cleanHtml(option.text)}`;
                    const optionIndent = margin.left + 7;
                    
                    // Split long option text
                    const optionLines = pdf.splitTextToSize(optionText, paperConfig.width - optionIndent - margin.right);
                    
                    // Add option text
                    pdf.text(optionLines, optionIndent, y);
                    
                    // Move down for next option
                    y += 5 + (optionLines.length - 1) * 5;
                }
                
                // If including answers, show correct answers as text
                if (this.includeAnswers && !question.type.includes("multiple_answers")) {
                    // Get correct answers
                    const correctAnswers = question.options
                        .filter(option => option.correct)
                        .map(option => option.text);
                    
                    if (correctAnswers.length > 0) {
                        // Add some space
                        y += 3;
                        
                        // Show correct answers
                        pdf.setFontSize(10);
                        pdf.setTextColor(70, 130, 180); // Steel Blue color for answers
                        
                        // Format answer text
                        const answerText = `Answer: ${correctAnswers.join(', ')}`;
                        const answerLines = pdf.splitTextToSize(answerText, paperConfig.width - margin.left - margin.right);
                        
                        // Add answer text
                        pdf.text(answerLines, margin.left, y);
                        
                        // Move down and reset text color
                        y += 5 + (answerLines.length - 1) * 5;
                        pdf.setTextColor(0, 0, 0); // Reset to black
                    }
                }
                
                // Add space after question
                y += 5;
                
                pdf.setDrawColor(0, 0, 0);
            }
            
            // Add extra space between questions
            y += 5;
        }
        
        // Add page number to the last page
        this.addPageNumber(pdf);
        
        // Return the PDF as a blob
        return pdf.output("blob");
    }

    /**
     * Add page number to PDF
     * @param {jsPDF} pdf - PDF document
     */
    addPageNumber(pdf) {
        const pageNum = pdf.internal.getNumberOfPages();
        const paperConfig = this.paperSizes[this.paperSize] || this.paperSizes.a4;
        
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Page ${pageNum}`, paperConfig.width / 2, paperConfig.height - 10, { align: "center" });
    }

    /**
     * Clean HTML tags from text while preserving some basic formatting
     * @param {String} html - HTML text
     * @returns {String} - Cleaned text
     */
    cleanHtml(html) {
        if (!html) return "";
        
        // Simple HTML cleaning - replace some common tags with text equivalents
        let cleaned = html
            .replace(/<p>/gi, "")
            .replace(/<\/p>/gi, "\n")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<div>/gi, "")
            .replace(/<\/div>/gi, "\n")
            .replace(/<li>/gi, "• ")
            .replace(/<\/li>/gi, "\n")
            .replace(/<strong>/gi, "")
            .replace(/<\/strong>/gi, "")
            .replace(/<em>/gi, "")
            .replace(/<\/em>/gi, "")
            .replace(/<u>/gi, "")
            .replace(/<\/u>/gi, "")
            .replace(/<ul>/gi, "\n")
            .replace(/<\/ul>/gi, "\n")
            .replace(/<ol>/gi, "\n")
            .replace(/<\/ol>/gi, "\n");
            
        // Remove any remaining HTML tags
        cleaned = cleaned.replace(/<[^>]*>/g, "");
        
        // Decode HTML entities
        const textarea = document.createElement("textarea");
        textarea.innerHTML = cleaned;
        cleaned = textarea.value;
        
        // Trim whitespace and remove excessive newlines
        cleaned = cleaned.trim().replace(/\n{3,}/g, "\n\n");
        
        return cleaned;
    }
}