/**
 * QTIExportUI - Manages user interface for exporting questions to QTI format
 */
class QTIExportUI {
    constructor(questionProcessor) {
        try {
            this.questionProcessor = questionProcessor;
            this.qtiExport = new QTIExport(questionProcessor);
            
            this.initUI();
            console.log('QTIExportUI: Initialized');
        } catch (error) {
            console.error('QTIExportUI: Error during initialization', error);
        }
    }
    
    initUI() {
        try {
            // Reference the Convert to QTI button
            this.convertBtn = document.getElementById('convert-btn');
            if (!this.convertBtn) {
                console.warn('QTIExportUI: Convert button element not found');
            }
            
            // Attach event listeners
            this.attachEventHandlers();
            
            // We DON'T need to create the export modal anymore
            // this.createExportModal(); // Comment out or remove this line
        } catch (error) {
            console.error('QTIExportUI: Error initializing UI', error);
        }
    }
    
    /**
     * Create modal dialog for export options
     */
    createExportModal() {
        try {
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
            
            // Add modal styles
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
            
            // Validate modal elements
            if (!this.closeModalBtn || !this.cancelExportBtn || !this.confirmExportBtn) {
                console.warn('QTIExportUI: One or more modal buttons not found');
            }
            
            // Add event listeners to modal buttons
            this.closeModalBtn?.addEventListener('click', () => this.hideExportModal());
            this.cancelExportBtn?.addEventListener('click', () => this.hideExportModal());
            this.confirmExportBtn?.addEventListener('click', () => this.performExport());
            
            // Close modal when clicking outside
            window.addEventListener('click', (e) => {
                if (e.target === this.exportModal) {
                    this.hideExportModal();
                }
            });
            
            console.log('QTIExportUI: Export modal created');
        } catch (error) {
            console.error('QTIExportUI: Error creating export modal', error);
        }
    }
    
    /**
     * Add modal styles to document head
     */
    addModalStyles() {
        try {
            // Check if styles already exist
            if (document.getElementById('qti-export-modal-styles')) {
                console.log('QTIExportUI: Modal styles already exist');
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
            console.log('QTIExportUI: Modal styles added to document');
        } catch (error) {
            console.error('QTIExportUI: Error adding modal styles', error);
        }
    }
    
    /**
     * Set up event handlers for UI interactions
     */
    attachEventHandlers() {
        try {
            // Attach click handler to convert button if it exists
            if (this.convertBtn) {
                this.convertBtn.addEventListener('click', this.handleConvertButtonClick.bind(this));
                console.log('QTIExportUI: Attached convert button handler');
            } else {
                console.warn('QTIExportUI: Cannot attach handler to missing convert button');
            }
        } catch (error) {
            console.error('QTIExportUI: Error attaching event handlers', error);
        }
    }
    
    /**
     * Process click on convert button
     */
    handleConvertButtonClick(e) {
        try {
            e.preventDefault();
            console.log('QTIExportUI: Convert button clicked');
            
            // Get selected questions count
            const selectedQuestions = this.questionProcessor.getSelectedQuestions();
            const selectedCount = selectedQuestions.length;
            console.log(`QTIExportUI: ${selectedCount} questions selected for export`);
            
            if (selectedCount === 0) {
                console.warn('QTIExportUI: No questions selected for export');
                alert('Please select at least one question to convert to QTI.');
                return;
            }
            
            // Check for validation errors in file preview
            if (window.excelFilePreview && window.excelFilePreview.hasErrors()) {
                console.warn('QTIExportUI: File preview has validation errors');
                this.showErrorMessage('Please resolve all questionnaire issues before converting to QTI.');
                return;
            }
            
            // Get quiz details from the page
            const quizTitleElement = document.getElementById('quiz-title');
            const quizDescriptionElement = document.getElementById('quiz-description');
            
            if (!quizTitleElement) {
                console.error('QTIExportUI: Quiz title element not found');
                alert('Could not find quiz title field. Please reload the page.');
                return;
            }
            
            const quizTitle = quizTitleElement.value.trim();
            const quizDescription = quizDescriptionElement ? quizDescriptionElement.value.trim() : '';
            
            // Validate title
            if (!quizTitle) {
                console.warn('QTIExportUI: No quiz title provided');
                alert('Please enter a quiz title in the Quiz Details section.');
                quizTitleElement.focus();
                return;
            }
            
            console.log(`QTIExportUI: Starting export for "${quizTitle}"`);
            
            // Proceed directly to export
            this.directExport(quizTitle, quizDescription);
        } catch (error) {
            console.error('QTIExportUI: Error handling convert button click', error);
            alert('An error occurred while preparing to export. Please try again.');
        }
    }
    
    /**
     * Display error message toast
     */
    showErrorMessage(message) {
        try {
            console.warn(`QTIExportUI: Showing error message: ${message}`);
            
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
        } catch (error) {
            console.error('QTIExportUI: Error showing error message', error);
        }
    }
    
    /**
     * Add styles for toast notifications
     */
    addToastStyles() {
        try {
            if (document.getElementById('qti-toast-styles')) {
                return;
            }
            
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
            console.log('QTIExportUI: Toast styles added to document');
        } catch (error) {
            console.error('QTIExportUI: Error adding toast styles', error);
        }
    }
    
    /**
     * Export questions directly without modal
     */
    async directExport(quizTitle, quizDescription) {
        console.log(`QTIExportUI: Starting direct export for "${quizTitle}"`);
        
        // Show loading indicator
        const loadingContainer = document.getElementById('loading-container');
        if (loadingContainer) {
            loadingContainer.classList.add('active');
            console.log('QTIExportUI: Loading indicator shown');
        } else {
            console.warn('QTIExportUI: Loading container not found');
        }
        
        try {
            // Generate QTI package
            console.log('QTIExportUI: Generating QTI package...');
            const zipBlob = await this.qtiExport.exportQTI(quizTitle, quizDescription);
            
            // Generate download filename
            const filename = `${quizTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qti.zip`;
            console.log(`QTIExportUI: QTI package generated, filename: ${filename}`);
            
            // Trigger download
            this.downloadZipFile(zipBlob, filename);
            
            // Hide loading indicator
            if (loadingContainer) {
                loadingContainer.classList.remove('active');
            }
            
            // Show success message
            const questionCount = this.questionProcessor.getSelectedCount();
            this.showSuccessMessage(`Successfully exported ${questionCount} questions to QTI format.`);
        } catch (error) {
            console.error('QTIExportUI: Error during direct export:', error);
            
            // Hide loading indicator
            if (loadingContainer) {
                loadingContainer.classList.remove('active');
            }
            
            // Show error message
            alert(`Error exporting to QTI: ${error.message}`);
        }
    }
    
    /**
     * Display export modal dialog
     */
    showExportModal() {
        try {
            if (!this.exportModal) {
                console.error('QTIExportUI: Export modal not initialized');
                return;
            }
            
            // Update question count
            const selectedQuestions = this.questionProcessor.getSelectedQuestions();
            if (this.questionCountSpan) {
                this.questionCountSpan.textContent = selectedQuestions.length;
            }
            
            // Clear previous values
            if (this.quizTitleInput) this.quizTitleInput.value = '';
            if (this.quizDescriptionInput) this.quizDescriptionInput.value = '';
            
            // Show modal
            this.exportModal.classList.add('active');
            console.log('QTIExportUI: Export modal displayed');
            
            // Focus the title input
            setTimeout(() => {
                if (this.quizTitleInput) this.quizTitleInput.focus();
            }, 100);
        } catch (error) {
            console.error('QTIExportUI: Error showing export modal', error);
        }
    }
    
    /**
     * Hide export modal dialog
     */
    hideExportModal() {
        try {
            if (this.exportModal) {
                this.exportModal.classList.remove('active');
                console.log('QTIExportUI: Export modal hidden');
            }
        } catch (error) {
            console.error('QTIExportUI: Error hiding export modal', error);
        }
    }
    
    /**
     * Process export from modal dialog
     */
    async performExport() {
        try {
            console.log('QTIExportUI: Export initiated from modal');
            
            // Get quiz title and description
            const quizTitle = this.quizTitleInput?.value.trim() || '';
            const quizDescription = this.quizDescriptionInput?.value.trim() || '';
            
            // Validate title
            if (!quizTitle) {
                console.warn('QTIExportUI: No quiz title provided in modal');
                alert('Please enter a quiz title.');
                if (this.quizTitleInput) this.quizTitleInput.focus();
                return;
            }
            
            // Show loading state
            if (this.exportLoading) this.exportLoading.classList.remove('hidden');
            if (this.confirmExportBtn) this.confirmExportBtn.disabled = true;
            
            console.log(`QTIExportUI: Generating QTI package for "${quizTitle}"...`);
            
            // Generate QTI package
            const zipBlob = await this.qtiExport.exportQTI(quizTitle, quizDescription);
            
            // Generate download filename
            const filename = `${quizTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qti.zip`;
            console.log(`QTIExportUI: QTI package generated, filename: ${filename}`);
            
            // Trigger download
            this.downloadZipFile(zipBlob, filename);
            
            // Hide loading state and modal
            if (this.exportLoading) this.exportLoading.classList.add('hidden');
            if (this.confirmExportBtn) this.confirmExportBtn.disabled = false;
            this.hideExportModal();
            
            // Show success message
            const questionCount = this.questionProcessor.getSelectedCount();
            this.showSuccessMessage(`Successfully exported ${questionCount} questions to QTI format.`);
        } catch (error) {
            console.error('QTIExportUI: Error performing export from modal:', error);
            
            // Hide loading state
            if (this.exportLoading) this.exportLoading.classList.add('hidden');
            if (this.confirmExportBtn) this.confirmExportBtn.disabled = false;
            
            // Show error message
            alert(`Error exporting to QTI: ${error.message}`);
        }
    }
    
    /**
     * Trigger file download
     */
    downloadZipFile(blob, filename) {
        try {
            if (!blob) {
                console.error('QTIExportUI: No blob provided for download');
                return;
            }
            
            console.log(`QTIExportUI: Downloading ${filename} (${(blob.size / 1024).toFixed(2)} KB)`);
            
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
            
            console.log('QTIExportUI: Download initiated');
        } catch (error) {
            console.error('QTIExportUI: Error downloading zip file', error);
            alert('Error downloading the file. Please try again.');
        }
    }
    
    /**
     * Display success notification
     */
    showSuccessMessage(message) {
        try {
            console.log(`QTIExportUI: Showing success message: ${message}`);
            
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
        } catch (error) {
            console.error('QTIExportUI: Error showing success message', error);
        }
    }
}

// Export the QTIExportUI class
window.QTIExportUI = QTIExportUI;