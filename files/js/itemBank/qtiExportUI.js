/**
 * QTI Export UI Handler for Item Bank
 * Manages UI interactions for QTI export process
 */
class QTIExportUI {
    constructor(questionProcessor) {
        this.questionProcessor = questionProcessor;
        this.qtiExport = new QTIExport(questionProcessor);
        
        // Initialize UI elements
        this.initUI();
    }
    
    initUI() {
        // Reference the Convert to QTI button
        this.convertBtn = document.getElementById('convert-btn');
        
        // Attach event listener to the convert button
        this.attachEventHandlers();
        
        // We DON'T need to create the export modal anymore
        // this.createExportModal(); // Comment out or remove this line
    }
    
    /**
     * Create export modal dialog
     */
    createExportModal() {
        // Create modal container
        const modalContainer = document.createElement('div');
        modalContainer.id = 'qti-export-modal';
        modalContainer.className = 'modal-container';
        
        // Modal content HTML
        modalContainer.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-file-export"></i> Export to QTI</h2>
                    <button id="close-modal" class="close-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="qti-quiz-title">Quiz Title:</label>
                        <input type="text" id="qti-quiz-title" placeholder="Enter quiz title">
                    </div>
                    <div class="form-group">
                        <label for="qti-quiz-description">Quiz Description (optional):</label>
                        <textarea id="qti-quiz-description" placeholder="Enter quiz description"></textarea>
                    </div>
                    <div class="selected-questions-summary">
                        <p>Selected questions: <span id="qti-question-count">0</span></p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="cancel-export" class="btn secondary-btn"><i class="fas fa-times"></i> Cancel</button>
                    <button id="confirm-export" class="btn primary-btn"><i class="fas fa-download"></i> Export QTI</button>
                </div>
                <div id="export-loading" class="export-loading hidden">
                    <div class="loading-spinner"></div>
                    <p>Generating QTI package...</p>
                </div>
            </div>
        `;
        
        // Add modal styles if not already in CSS
        this.addModalStyles();
        
        // Add to document
        document.body.appendChild(modalContainer);
        
        // Store references to modal elements
        this.exportModal = modalContainer;
        this.closeModalBtn = document.getElementById('close-modal');
        this.cancelExportBtn = document.getElementById('cancel-export');
        this.confirmExportBtn = document.getElementById('confirm-export');
        this.quizTitleInput = document.getElementById('qti-quiz-title');
        this.quizDescriptionInput = document.getElementById('qti-quiz-description');
        this.questionCountSpan = document.getElementById('qti-question-count');
        this.exportLoading = document.getElementById('export-loading');
        
        // Add event listeners to modal buttons
        this.closeModalBtn.addEventListener('click', () => this.hideExportModal());
        this.cancelExportBtn.addEventListener('click', () => this.hideExportModal());
        this.confirmExportBtn.addEventListener('click', () => this.performExport());
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.exportModal) {
                this.hideExportModal();
            }
        });
    }
    
    /**
     * Add modal styles to the document if not already included in CSS
     */
    addModalStyles() {
        // Check if styles already exist
        if (document.getElementById('qti-export-modal-styles')) {
            return;
        }
        
        // Create style element
        const styleEl = document.createElement('style');
        styleEl.id = 'qti-export-modal-styles';
        
        // Add modal styles
        styleEl.textContent = `
            .modal-container {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                align-items: center;
                justify-content: center;
            }
            
            .modal-container.active {
                display: flex;
            }
            
            .modal-content {
                background-color: white;
                border-radius: 10px;
                width: 100%;
                max-width: 600px;
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
                animation: modalFadeIn 0.3s ease;
            }
            
            @keyframes modalFadeIn {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .modal-header {
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .modal-header h2 {
                margin: 0;
                color: #4a6cf7;
                font-size: 1.5rem;
                display: flex;
                align-items: center;
            }
            
            .modal-header h2 i {
                margin-right: 10px;
            }
            
            .modal-body {
                padding: 20px;
            }
            
            .modal-footer {
                padding: 20px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }
            
            .close-btn {
                background: none;
                border: none;
                font-size: 1.2rem;
                cursor: pointer;
                color: #6b7280;
                transition: color 0.3s ease;
            }
            
            .close-btn:hover {
                color: #ef4444;
            }
            
            .selected-questions-summary {
                background-color: #f3f4f6;
                padding: 15px;
                border-radius: 8px;
                margin-top: 15px;
            }
            
            .selected-questions-summary p {
                margin: 0;
                font-weight: 500;
            }
            
            .selected-questions-summary span {
                color: #4a6cf7;
                font-weight: 600;
            }
            
            .btn {
                padding: 10px 20px;
                border-radius: 6px;
                font-weight: 500;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }
            
            .btn i {
                margin-right: 8px;
            }
            
            .primary-btn {
                background-color: #4a6cf7;
                color: white;
                border: none;
            }
            
            .primary-btn:hover {
                background-color: #3451b2;
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }
            
            .secondary-btn {
                background-color: white;
                color: #6b7280;
                border: 1px solid #e5e7eb;
            }
            
            .secondary-btn:hover {
                background-color: #f3f4f6;
            }
            
            .export-loading {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(255, 255, 255, 0.9);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 10;
                border-radius: 10px;
            }
            
            .export-loading.hidden {
                display: none;
            }
            
            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f4f6;
                border-top: 4px solid #4a6cf7;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 15px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        
        // Add styles to document head
        document.head.appendChild(styleEl);
    }
    
    /**
     * Attach event handlers to UI elements
     */
    attachEventHandlers() {
        // Attach click handler to convert button
        this.convertBtn.addEventListener('click', this.handleConvertButtonClick.bind(this));
    }
    
    /**
     * Handle convert button click
     * @param {Event} e - Click event
     */
    handleConvertButtonClick(e) {
        e.preventDefault();
        
        // Get selected questions count
        const selectedQuestions = this.questionProcessor.getSelectedQuestions();
        
        if (selectedQuestions.length === 0) {
            alert('Please select at least one question to convert to QTI.');
            return;
        }
        
        // Check if there are any validation errors in the file preview
        if (window.excelFilePreview && window.excelFilePreview.hasErrors()) {
            // Show error message
            this.showErrorMessage('Please resolve all questionnaire issues before converting to QTI.');
            return;
        }
        
        // Instead of showing the modal, get values directly from the page
        const quizTitle = document.getElementById('quiz-title').value.trim();
        const quizDescription = document.getElementById('quiz-description').value.trim();
        
        // Validate title
        if (!quizTitle) {
            alert('Please enter a quiz title in the Quiz Details section.');
            document.getElementById('quiz-title').focus();
            return;
        }
        
        // Proceed directly to export
        this.directExport(quizTitle, quizDescription);
    }
    
    /**
     * Show error message
     * @param {String} message - Error message to show
     */
    showErrorMessage(message) {
        // Create toast message element
        const toast = document.createElement('div');
        toast.className = 'toast-message error-message';
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <div class="toast-content">${message}</div>
            <button class="toast-close"><i class="fas fa-times"></i></button>
        `;
        
        // Add styles if not already present
        this.addToastStyles();
        
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
     * Add toast message styles to document if not already present
     */
    addToastStyles() {
        if (document.getElementById('qti-toast-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'qti-toast-styles';
        style.textContent = `
            .toast-message {
                position: fixed;
                bottom: 20px;
                right: 20px;
                display: flex;
                align-items: center;
                min-width: 300px;
                max-width: 400px;
                padding: 12px 15px;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 9999;
                animation: slide-in 0.3s ease-out;
                background-color: white;
            }
            
            @keyframes slide-in {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            .error-message {
                border-left: 4px solid #ef4444;
            }
            
            .toast-icon {
                font-size: 1.5rem;
                margin-right: 12px;
                color: #ef4444;
            }
            
            .toast-content {
                flex: 1;
                font-size: 0.95rem;
                color: #1f2937;
            }
            
            .toast-close {
                background: none;
                border: none;
                color: #9ca3af;
                cursor: pointer;
                font-size: 0.9rem;
                padding: 0;
                margin-left: 10px;
                transition: color 0.2s;
            }
            
            .toast-close:hover {
                color: #4b5563;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Add this new method to handle direct export
    async directExport(quizTitle, quizDescription) {
        // Show a loading indicator (you can use the existing loading container)
        const loadingContainer = document.getElementById('loading-container');
        if (loadingContainer) loadingContainer.classList.add('active');
        
        try {
            // Generate QTI package
            const zipBlob = await this.qtiExport.exportQTI(quizTitle, quizDescription);
            
            // Generate download filename
            const filename = `${quizTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qti.zip`;
            
            // Trigger download
            this.downloadZipFile(zipBlob, filename);
            
            // Hide loading indicator
            if (loadingContainer) loadingContainer.classList.remove('active');
            
            // Show success message
            this.showSuccessMessage(`Successfully exported ${this.questionProcessor.getSelectedCount()} questions to QTI format.`);
        } catch (error) {
            console.error('Error exporting to QTI:', error);
            
            // Hide loading indicator
            if (loadingContainer) loadingContainer.classList.remove('active');
            
            // Show error message
            alert(`Error exporting to QTI: ${error.message}`);
        }
    }
    
    /**
     * Show the export modal dialog
     */
    showExportModal() {
        // Update question count
        const selectedQuestions = this.questionProcessor.getSelectedQuestions();
        this.questionCountSpan.textContent = selectedQuestions.length;
        
        // Clear previous values
        this.quizTitleInput.value = '';
        this.quizDescriptionInput.value = '';
        
        // Show modal
        this.exportModal.classList.add('active');
        
        // Focus the title input
        setTimeout(() => {
            this.quizTitleInput.focus();
        }, 100);
    }
    
    /**
     * Hide the export modal dialog
     */
    hideExportModal() {
        this.exportModal.classList.remove('active');
    }
    
    /**
     * Perform the export operation
     */
    async performExport() {
        // Get quiz title and description
        const quizTitle = this.quizTitleInput.value.trim();
        const quizDescription = this.quizDescriptionInput.value.trim();
        
        // Validate title
        if (!quizTitle) {
            alert('Please enter a quiz title.');
            this.quizTitleInput.focus();
            return;
        }
        
        // Show loading state
        this.exportLoading.classList.remove('hidden');
        this.confirmExportBtn.disabled = true;
        
        try {
            // Generate QTI package
            const zipBlob = await this.qtiExport.exportQTI(quizTitle, quizDescription);
            
            // Generate download filename
            const filename = `${quizTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qti.zip`;
            
            // Trigger download
            this.downloadZipFile(zipBlob, filename);
            
            // Hide loading state and modal
            this.exportLoading.classList.add('hidden');
            this.confirmExportBtn.disabled = false;
            this.hideExportModal();
            
            // Show success message
            this.showSuccessMessage(`Successfully exported ${this.questionProcessor.getSelectedCount()} questions to QTI format.`);
        } catch (error) {
            console.error('Error exporting to QTI:', error);
            
            // Hide loading state
            this.exportLoading.classList.add('hidden');
            this.confirmExportBtn.disabled = false;
            
            // Show error message
            alert(`Error exporting to QTI: ${error.message}`);
        }
    }
    
    /**
     * Download the zip file
     * @param {Blob} blob - Zip file blob
     * @param {String} filename - Download filename
     */
    downloadZipFile(blob, filename) {
        // Create a URL for the blob
        const url = URL.createObjectURL(blob);
        
        // Create a temporary link element
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        
        // Append to body, click, and remove
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up the object URL after download
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);
    }
    
    /**
     * Show a success message
     * @param {String} message - Success message text
     */
    showSuccessMessage(message) {
        // Create success message element
        const successEl = document.createElement('div');
        successEl.className = 'qti-export-success';
        successEl.innerHTML = `
            <div class="success-icon"><i class="fas fa-check-circle"></i></div>
            <p>${message}</p>
            <button class="close-success"><i class="fas fa-times"></i></button>
        `;
        
        // Add styles for success message if not exists
        if (!document.getElementById('qti-export-success-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'qti-export-success-styles';
            styleEl.textContent = `
                .qti-export-success {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    background-color: #10b981;
                    color: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    display: flex;
                    align-items: center;
                    max-width: 400px;
                    animation: slideIn 0.3s ease, fadeOut 0.3s ease 4.7s;
                    z-index: 1000;
                }
                
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                
                .qti-export-success .success-icon {
                    font-size: 1.5rem;
                    margin-right: 12px;
                    flex-shrink: 0;
                }
                
                .qti-export-success p {
                    margin: 0;
                    flex: 1;
                }
                
                .qti-export-success .close-success {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    opacity: 0.7;
                    transition: opacity 0.3s ease;
                    padding: 0;
                    margin-left: 10px;
                    font-size: 1rem;
                }
                
                .qti-export-success .close-success:hover {
                    opacity: 1;
                }
            `;
            document.head.appendChild(styleEl);
        }
        
        // Add to document
        document.body.appendChild(successEl);
        
        // Add close handler
        const closeBtn = successEl.querySelector('.close-success');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(successEl);
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(successEl)) {
                document.body.removeChild(successEl);
            }
        }, 5000);
    }
}

// Export the QTIExportUI class
window.QTIExportUI = QTIExportUI;