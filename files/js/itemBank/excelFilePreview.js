/**
 * Excel File Preview for ItemBank
 * Provides CSV/Excel file preview functionality with editing capabilities
 */

class ExcelFilePreview {
    constructor() {
        // DOM Elements - will be set in initialize()
        this.dropArea = null;
        this.fileInput = null;
        this.fileInfo = null;
        this.fileName = null;
        this.fileSize = null;
        this.removeFileBtn = null;
        this.previewElement = null;
        this.pendingEdits = {}; // Store edits for each sheet
        
        // State variables
        this.currentFile = null;
        this.questionData = null;
        this.workbook = null;
        this.currentSheetIndex = 1; // Start with the second sheet (index 1) to skip instructions
        this.sheetNavContainer = null;
        this.downloadBtn = null;
        this.editedData = null;  // Store edited data
        this.editedHeaders = null; // Store headers for edited data
        this.currentEditCell = null; // Track which cell is being edited
        this.unsavedChangesNotification = null;

        // Track validation errors
        this.hasValidationErrors = false;
        
        // Bind methods
        this.handleDragOver = this.handleDragOver.bind(this);
        this.handleDragLeave = this.handleDragLeave.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
        this.handleFileSelect = this.handleFileSelect.bind(this);
        this.removeFile = this.removeFile.bind(this);
        this.triggerFileInput = this.triggerFileInput.bind(this);
        this.processFile = this.processFile.bind(this);
        this.handleCellClick = this.handleCellClick.bind(this);
        this.handleCellEdit = this.handleCellEdit.bind(this);
        this.downloadEditedFile = this.downloadEditedFile.bind(this);
    }

    /**
     * Initialize the preview with DOM elements
     * @param {Object} elements - Object containing DOM elements references
     */
    initialize(elements) {
        // Set DOM elements
        this.dropArea = elements.dropArea || document.getElementById('dropArea');
        this.fileInput = elements.fileInput || document.getElementById('excelFile');
        this.fileInfo = elements.fileInfo || document.getElementById('fileInfo');
        this.fileName = elements.fileName || document.getElementById('file-name');
        this.fileSize = elements.fileSize || document.getElementById('file-size');
        this.removeFileBtn = elements.removeFileBtn || document.getElementById('removeFile');
        this.previewElement = elements.previewElement || document.getElementById('questions-container');

        // Create download button if it doesn't exist
        this.createDownloadButton();

        // Attach event listeners
        this.attachEventListeners();
    }

/**
 * Create download button for edited file
 */
createDownloadButton() {
    // Check if button already exists
    let existingBtn = document.getElementById('download-edited-file-btn');
    if (existingBtn) {
        this.downloadBtn = existingBtn;
        return;
    }

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'download-button-container';
    buttonContainer.style.cssText = 'margin-top: 15px; text-align: right; display: flex; gap: 10px; justify-content: flex-end;';

    // Create commit changes button
    const commitBtn = document.createElement('button');
    commitBtn.id = 'commit-changes-btn';
    commitBtn.className = 'commit-btn';
    commitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    commitBtn.style.cssText = `
        background-color: #4a6cf7;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: background-color 0.3s ease;
    `;
    commitBtn.addEventListener('mouseenter', () => {
        commitBtn.style.backgroundColor = '#3451b2';
    });
    commitBtn.addEventListener('mouseleave', () => {
        commitBtn.style.backgroundColor = '#4a6cf7';
    });
    commitBtn.addEventListener('click', this.commitChanges.bind(this));
    commitBtn.disabled = true;
    this.commitBtn = commitBtn; // Store reference

    // Inside createDownloadButton method where you add event listener:
    commitBtn.addEventListener('click', () => {
        this.commitChanges.bind(this)();
        
        // Additional direct cleanup to handle the notification
        const elements = document.querySelectorAll('div');
        for (let i = 0; i < elements.length; i++) {
            const elem = elements[i];
            if (elem.textContent && 
                elem.textContent.includes('You have unsaved changes') &&
                elem.textContent.includes('Save Changes button')) {
                elem.remove();
            }
        }
    });

    // Create download button
    this.downloadBtn = document.createElement('button');
    this.downloadBtn.id = 'download-edited-file-btn';
    this.downloadBtn.className = 'download-btn';
    this.downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download Edited File';
    this.downloadBtn.style.cssText = `
        background-color: #ffb81c;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: background-color 0.3s ease;
    `;
    this.downloadBtn.addEventListener('mouseenter', () => {
        this.downloadBtn.style.backgroundColor = '#e6a619';
    });
    this.downloadBtn.addEventListener('mouseleave', () => {
        this.downloadBtn.style.backgroundColor = '#ffb81c';
    });
    this.downloadBtn.addEventListener('click', this.downloadEditedFile);
    this.downloadBtn.disabled = true;
    
    // Add buttons to container
    buttonContainer.appendChild(commitBtn);
    buttonContainer.appendChild(this.downloadBtn);
    
    // Add button container after the preview element
    if (this.previewElement && this.previewElement.parentNode) {
        this.previewElement.parentNode.insertBefore(buttonContainer, this.previewElement.nextSibling);
    }
}

/**
 * Commit changes to the question data with comprehensive error handling
 * Updated to handle edits across multiple exam types/sheets
 */
commitChanges() {
    console.log('Starting commitChanges process');
    
    // First, check if we have any edits to commit
    if (!this.editedData || !this.editedHeaders) {
        console.warn('No edited data or headers available for commit');
        this.showMessage('No changes to commit', 'error');
        return;
    }
    
    console.log(`Committing changes for ${this.editedData.length} rows with ${this.editedHeaders.length} columns`);
    
    try {
        // Step 1: If we have a workbook, update it with the edited data for all sheets
        if (this.workbook) {
            try {
                console.log('Updating workbook with edited data for all sheets');
                
                // Save current sheet edits to workbook before proceeding
                const currentSheetName = this.workbook.SheetNames[this.currentSheetIndex];
                if (currentSheetName && this.editedData && this.editedHeaders) {
                    console.log(`Updating current sheet: ${currentSheetName}`);
                    const sheet = this.workbook.Sheets[currentSheetName];
                    if (sheet) {
                        // Create new worksheet from edited data
                        const wsData = [this.editedHeaders, ...this.editedData];
                        const newSheet = XLSX.utils.aoa_to_sheet(wsData);
                        
                        // Replace the sheet in the workbook
                        this.workbook.Sheets[currentSheetName] = newSheet;
                        console.log(`Updated sheet: ${currentSheetName}`);
                    }
                }
                
                // Apply any pending edits for other sheets that might be stored
                if (this.pendingEdits && Object.keys(this.pendingEdits).length > 0) {
                    console.log('Applying pending edits for other sheets:', Object.keys(this.pendingEdits));
                    
                    for (const sheetIndex in this.pendingEdits) {
                        // Skip current sheet as we already processed it
                        if (parseInt(sheetIndex) === this.currentSheetIndex) continue;
                        
                        const editData = this.pendingEdits[sheetIndex];
                        if (editData.data && editData.headers) {
                            const pendingSheetName = this.workbook.SheetNames[sheetIndex];
                            if (pendingSheetName) {
                                console.log(`Applying pending edits to sheet: ${pendingSheetName}`);
                                const pendingSheet = this.workbook.Sheets[pendingSheetName];
                                if (pendingSheet) {
                                    // Create new worksheet from edited data
                                    const wsData = [editData.headers, ...editData.data];
                                    const newSheet = XLSX.utils.aoa_to_sheet(wsData);
                                    
                                    // Replace the sheet in the workbook
                                    this.workbook.Sheets[pendingSheetName] = newSheet;
                                    console.log(`Updated sheet from pending edits: ${pendingSheetName}`);
                                }
                            }
                        }
                    }
                }
            } catch (workbookError) {
                console.error('Error updating workbook with edited data:', workbookError);
            }
        } else {
            console.log('No workbook available, skipping workbook update');
        }
        
        // Step 2: Update the fileHandler's processedData for all question types
        try {
            if (window.app && window.app.fileHandler) {
                console.log('Updating fileHandler processedData for all question types');
                
                // Process current sheet question type
                let currentQuestionType = null;
                if (this.workbook && this.currentSheetIndex !== undefined) {
                    const sheetName = this.workbook.SheetNames[this.currentSheetIndex];
                    if (sheetName) {
                        // Try to determine question type from sheet name
                        if (sheetName.includes('MC')) currentQuestionType = 'MC';
                        else if (sheetName.includes('MA')) currentQuestionType = 'MA';
                        else if (sheetName.includes('TF')) currentQuestionType = 'TF';
                        else if (sheetName.includes('ESS')) currentQuestionType = 'ESS';
                        else if (sheetName.includes('FIB')) currentQuestionType = 'FIB';
                    }
                }
                
                // Add currently edited data to processed questions
                if (currentQuestionType && window.app.fileHandler.processedData[currentQuestionType]) {
                    console.log(`Processing current question type: ${currentQuestionType}`);
                    // Re-process the edited data
                    const processedCurrentQuestions = this.processEditedData(currentQuestionType);
                    
                    // Update processed data
                    window.app.fileHandler.processedData[currentQuestionType] = processedCurrentQuestions;
                    
                    // Update 'all' array for current question type
                    window.app.fileHandler.processedData.all = window.app.fileHandler.processedData.all.filter(
                        q => q.type !== currentQuestionType
                    );
                    window.app.fileHandler.processedData.all.push(...processedCurrentQuestions);
                }
                
                // Process pending edits for other question types
                if (this.pendingEdits && Object.keys(this.pendingEdits).length > 0) {
                    console.log('Processing pending edits for other question types');
                    
                    for (const sheetIndex in this.pendingEdits) {
                        // Skip current sheet as we already processed it
                        if (parseInt(sheetIndex) === this.currentSheetIndex) continue;
                        
                        const sheetName = this.workbook.SheetNames[sheetIndex];
                        if (!sheetName) continue;
                        
                        // Determine question type from sheet name
                        let questionType = null;
                        if (sheetName.includes('MC')) questionType = 'MC';
                        else if (sheetName.includes('MA')) questionType = 'MA';
                        else if (sheetName.includes('TF')) questionType = 'TF';
                        else if (sheetName.includes('ESS')) questionType = 'ESS';
                        else if (sheetName.includes('FIB')) questionType = 'FIB';
                        
                        if (questionType && window.app.fileHandler.processedData[questionType]) {
                            console.log(`Processing pending question type: ${questionType}`);
                            
                            // Temporarily set edited data to the pending sheet data
                            const tempEditedData = this.editedData;
                            const tempEditedHeaders = this.editedHeaders;
                            
                            // Set data for the pending sheet
                            this.editedData = this.pendingEdits[sheetIndex].data;
                            this.editedHeaders = this.pendingEdits[sheetIndex].headers;
                            
                            // Process the pending edited data
                            const processedPendingQuestions = this.processEditedData(questionType);
                            
                            // Update processed data for this question type
                            window.app.fileHandler.processedData[questionType] = processedPendingQuestions;
                            
                            // Update 'all' array for this question type
                            window.app.fileHandler.processedData.all = window.app.fileHandler.processedData.all.filter(
                                q => q.type !== questionType
                            );
                            window.app.fileHandler.processedData.all.push(...processedPendingQuestions);
                            
                            // Restore original edited data
                            this.editedData = tempEditedData;
                            this.editedHeaders = tempEditedHeaders;
                        }
                    }
                }
                
                // Update the question processor with the new data
                if (window.app.questionProcessor) {
                    console.log('Updating question processor with all changes');
                    window.app.questionProcessor.setQuestions(window.app.fileHandler.processedData);
                }
                
                // Refresh the UI
                if (window.app.uiController) {
                    console.log('Refreshing UI with updated data');
                    window.app.uiController.renderQuestions();
                    
                    // Re-render selected questions if any
                    if (window.app.questionProcessor.getSelectedCount() > 0) {
                        window.app.uiController.renderSelectedQuestions();
                    }
                }
            }
        } catch (fileHandlerError) {
            console.error('Error updating fileHandler processed data:', fileHandlerError);
        }
        
        // Step 3: Remove all unsaved changes notifications
        try {
            console.log('Removing unsaved changes notifications');
            // Direct DOM query to find any element containing the notification text
            const elements = document.querySelectorAll('div');
            for (let i = 0; i < elements.length; i++) {
                const elem = elements[i];
                if (elem.textContent && 
                    elem.textContent.includes('You have unsaved changes') &&
                    elem.textContent.includes('Save Changes button')) {
                    console.log('Found unsaved changes notification by text content, removing:', elem);
                    elem.remove();
                }
            }
            
            // Also check for the class-based notification
            const classNotifications = document.querySelectorAll('.unsaved-changes-notification');
            classNotifications.forEach(notification => {
                console.log('Found unsaved changes notification by class, removing:', notification);
                notification.remove();
            });
            
            // Clear the reference
            this.unsavedChangesNotification = null;
        } catch (e) {
            console.error('Error removing notifications:', e);
        }
        
        // Step 4: Clear pending edits since they're now applied
        this.pendingEdits = {};
        
        // Step 5: Disable commit button until there are new changes
        if (this.commitBtn) {
            this.commitBtn.disabled = true;
        }
        
        // Step 6: Show success message
        console.log('Commit completed successfully, showing success message');
        this.showMessage('All changes saved successfully!', 'success');
        
    } catch (error) {
        console.error('Fatal error in commitChanges method:', error);
        this.showMessage(`Error committing changes: ${error.message}`, 'error');
    }
}
    /**
     * Attach event listeners to DOM elements
     */
    attachEventListeners() {
        // Only attach these listeners if they're not already attached
        if (this.dropArea && !this.dropArea.hasAttribute('data-excel-preview-initialized')) {
            this.dropArea.addEventListener('dragover', this.handleDragOver);
            this.dropArea.addEventListener('dragleave', this.handleDragLeave);
            this.dropArea.addEventListener('drop', this.handleDrop);
            
            // DON'T attach click handler - let the original UIController handle this
            // this.dropArea.addEventListener('click', this.triggerFileInput);
            
            // Mark as initialized
            this.dropArea.setAttribute('data-excel-preview-initialized', 'true');
        }

        // Only attach this if not already attached
        if (this.fileInput && !this.fileInput.hasAttribute('data-excel-preview-initialized')) {
            this.fileInput.addEventListener('change', this.handleFileSelect);
            this.fileInput.setAttribute('data-excel-preview-initialized', 'true');
        }

        if (this.removeFileBtn && !this.removeFileBtn.hasAttribute('data-excel-preview-initialized')) {
            this.removeFileBtn.addEventListener('click', this.removeFile);
            this.removeFileBtn.setAttribute('data-excel-preview-initialized', 'true');
        }

        // Listen for document clicks to manage cell editing
        document.addEventListener('click', (e) => {
            // If clicking outside an active edit cell, save the edit
            if (this.currentEditCell && !e.target.matches('.edit-input')) {
                this.finishEditing();
            }
        });

        // Listen for key presses while editing
        document.addEventListener('keydown', (e) => {
            if (!this.currentEditCell) return;
            
            if (e.key === 'Enter') {
                e.preventDefault();
                this.finishEditing();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelEditing();
            }
        });
    }

    /**
     * Handle drag over event
     * @param {DragEvent} e - Drag event
     */
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dropArea.classList.add('dragover');
    }

    /**
     * Handle drag leave event
     * @param {DragEvent} e - Drag event
     */
    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dropArea.classList.remove('dragover');
    }

    /**
     * Handle file drop event
     * @param {DragEvent} e - Drop event
     */
    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dropArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length) {
            this.processFile(files[0]);
        }
    }

    /**
     * Trigger file input when drop area is clicked
     * @param {MouseEvent} e - Click event
     */
    triggerFileInput(e) {
        // Only trigger file input if not clicking on file info or remove button
        if (this.fileInfo.classList.contains('hidden') || 
            (!e.target.closest('#fileInfo') && !e.target.closest('#removeFile'))) {
            this.fileInput.click();
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
     * Process the uploaded file
     * @param {File} file - The file to process
     */
    async processFile(file) {
        // Check file type
        const validTypes = [
            'text/csv', 
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        
        // Also check file extension as a fallback
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const validExtensions = ['csv', 'xls', 'xlsx'];
        
        if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
            alert('Please upload a CSV or Excel file');
            return;
        }

        this.currentFile = file;
        
        // Show file info
        this.fileName.textContent = file.name;
        this.fileSize.textContent = this.formatFileSize(file.size);
        this.fileInfo.classList.remove('hidden');
        
        // Show loading state on the drop area
        this.dropArea.classList.add('loading');
        
        try {
            // Read and preview file
            await this.previewFile(file);
            
            // Auto-fill quiz title from filename if it's available
            const quizTitleInput = document.getElementById('quiz-title');
            if (quizTitleInput && !quizTitleInput.value) {
                const baseName = file.name.split('.')[0];
                quizTitleInput.value = baseName.replace(/_/g, ' ');
            }
            
            // Hide loading state
            this.dropArea.classList.remove('loading');
            
            // Show summary section if it exists
            const summarySection = document.getElementById('summary-section');
            if (summarySection) {
                summarySection.classList.remove('hidden');
            }
            
            // Update statistics if the method exists
            if (typeof window.updateSummaryStats === 'function') {
                window.updateSummaryStats();
            }
            
            // Enable download button
            if (this.downloadBtn) {
                this.downloadBtn.disabled = false;
            }
            
            // Show success message
            this.showMessage('File successfully loaded and previewed!', 'success');
            
            // Return the processed question data
            return this.questionData;
        } catch (error) {
            console.error('Error processing file:', error);
            this.dropArea.classList.remove('loading');
            this.showMessage(`Error processing file: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * Preview the uploaded file
     * @param {File} file - The file to preview
     */
    async previewFile(file) {
        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'loading-message';
        loadingMessage.innerHTML = '<div class="loading-spinner"></div><p>Loading preview...</p>';
        this.previewElement.innerHTML = '';
        this.previewElement.appendChild(loadingMessage);
        
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        try {
            if (fileExtension === 'csv') {
                this.questionData = await this.previewCSV(file);
            } else if (['xls', 'xlsx'].includes(fileExtension)) {
                this.questionData = await this.processExcelFile(file);
            } else {
                throw new Error('Unsupported file format');
            }
        } catch (error) {
            console.error('Error previewing file:', error);
            this.previewElement.innerHTML = `<p class="error-text">Error previewing file: ${error.message}</p>`;
            throw error;
        }
    }

    /**
     * Preview CSV file
     * @param {File} file - The CSV file to preview
     * @returns {Promise<Array>} - Promise resolving to processed question data
     */
    previewCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const content = e.target.result;
                
                Papa.parse(content, {
                    skipEmptyLines: true,
                    complete: (results) => {
                        // Get data
                        const data = results.data;
                        
                        if (data.length < 2) {
                            this.previewElement.innerHTML = '<p>No data found in CSV file or invalid format</p>';
                            reject(new Error('No valid data found'));
                            return;
                        }
                        
                        // Get headers (first row)
                        const headers = data[0];
                        
                        // Get data rows (skip first row)
                        const rows = data.slice(1);
                        
                        // Filter out empty rows
                        const nonEmptyRows = rows.filter(row => 
                            row.some(cell => cell !== null && cell !== undefined && cell !== '')
                        );
                        
                        // Find non-empty columns
                        const nonEmptyColumnIndices = this.findNonEmptyColumnIndices(headers, nonEmptyRows);
                        
                        // Filter headers to only include non-empty columns
                        const filteredHeaders = nonEmptyColumnIndices.map(index => headers[index] || `Column ${index + 1}`);
                        
                        // Save a copy of the data for editing
                        this.editedData = JSON.parse(JSON.stringify(nonEmptyRows));
                        this.editedHeaders = JSON.parse(JSON.stringify(filteredHeaders));
                        
                        // Check if this is a TF (True/False) sheet based on headers or content
                        const isTFSheet = file.name.toLowerCase().includes('tf') || 
                                         headers.some(h => h && (h.toLowerCase().includes('true') || h.toLowerCase().includes('false'))) ||
                                         rows.some(row => row[0] === 'TF');
                                         
                        // Check if this is a MA (Multiple Answer) sheet based on headers or content
                        const isMASheet = file.name.toLowerCase().includes('ma') || 
                                         file.name.toLowerCase().includes('multiple answer') ||
                                         rows.some(row => row[0] === 'MA');
                        
                        // Display table with filtered headers and rows
                        this.displayTable(filteredHeaders, nonEmptyRows, nonEmptyColumnIndices, isTFSheet, isMASheet);
                        
                        // Save full data for conversion and return
                        resolve(results.data.slice(1)); // Skip the first row for conversion
                    },
                    error: (error) => {
                        this.previewElement.innerHTML = `<p class="error-text">Error parsing CSV: ${error.message}</p>`;
                        reject(error);
                    }
                });
            };
            
            reader.onerror = (error) => {
                reject(error);
            };
            
            reader.readAsText(file);
        });
    }

/**
 * Process Excel file
 * @param {File} file - The Excel file to process
 * @returns {Promise<Array>} - Promise resolving to processed question data
 */
async processExcelFile(file) {
    console.log(`Starting to process Excel file: ${file.name}, size: ${file.size} bytes`);
    
    try {
        // Read file as array buffer
        console.log('Reading file as array buffer...');
        const arrayBuffer = await this.readFileAsArrayBuffer(file);
        console.log('Successfully read file as array buffer');
        
        // Parse workbook
        console.log('Parsing Excel workbook...');
        this.workbook = XLSX.read(arrayBuffer, { type: 'array' });
        console.log(`Workbook parsed successfully. Found ${this.workbook.SheetNames.length} sheets: ${this.workbook.SheetNames.join(', ')}`);
        
        // Get all sheet names (skip first sheet if it's Instructions)
        const firstSheetName = this.workbook.SheetNames[0].toLowerCase();
        const startIndex = (firstSheetName === 'instructions' || firstSheetName.includes('instruction')) ? 1 : 0;
        console.log(`First sheet name: "${firstSheetName}". Starting from sheet index: ${startIndex}`);
        
        // Make sure we have valid sheets
        if (this.workbook.SheetNames.length <= startIndex) {
            console.error('Excel file validation failed: No data sheets found after skipping instructions');
            throw new Error('Excel file does not contain any data sheets');
        }
        
        // Get sheet names to display
        const sheetNames = this.workbook.SheetNames.slice(startIndex);
        console.log(`Sheets to display: ${sheetNames.join(', ')}`);
        
        // Create sheet navigation
        console.log('Creating sheet navigation UI...');
        try {
            this.createSheetNavigation(sheetNames);
            console.log('Sheet navigation created successfully');
        } catch (navError) {
            console.error('Error creating sheet navigation:', navError);
        }
        
        // Set current sheet index to display first non-instruction sheet
        this.currentSheetIndex = startIndex;
        console.log(`Setting current sheet index to ${this.currentSheetIndex}`);
        
        // Pre-validate TF sheets
        console.log('Pre-validating TF sheets...');
        for (let i = startIndex; i < this.workbook.SheetNames.length; i++) {
            const sheetName = this.workbook.SheetNames[i];
            if (sheetName.includes('TF')) {
                console.log(`Found TF sheet: ${sheetName}, validating...`);
                const sheet = this.workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                
                if (jsonData.length > 1) {
                    const headers = jsonData[0];
                    const rows = jsonData.slice(1);
                    const nonEmptyRows = rows.filter(row => 
                        row.some(cell => cell !== null && cell !== undefined && cell !== '')
                    );
                    const columnIndices = this.findNonEmptyColumnIndices(headers, nonEmptyRows);
                    
                    // Store the data for this sheet
                    if (!this.pendingEdits) {
                        this.pendingEdits = {};
                    }
                    this.pendingEdits[i] = {
                        data: nonEmptyRows,
                        headers: headers
                    };
                }
            }
        }
        
        // Display the first non-skipped sheet
        console.log(`Attempting to display sheet at index ${this.currentSheetIndex}...`);
        try {
            this.displaySheet(this.currentSheetIndex);
            console.log(`Successfully displayed sheet "${this.workbook.SheetNames[this.currentSheetIndex]}"`);
        } catch (displayError) {
            console.error(`Error displaying sheet ${this.currentSheetIndex}:`, displayError);
            this.previewElement.innerHTML = `<p class="error-text">Error displaying sheet: ${displayError.message}</p>`;
        }
        
        // Return processed data for all sheets
        console.log('Processing all sheets...');
        const processedData = this.processAllSheets(startIndex);
        console.log(`Successfully processed ${processedData.length} sheets`);
        return processedData;
        
    } catch (error) {
        console.error('Critical error processing Excel file:', error);
        console.error('Error stack:', error.stack);
        console.error('File details:', {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified).toISOString()
        });
        
        if (this.workbook) {
            console.log('Workbook was created before error. Sheet names:', this.workbook.SheetNames);
        } else {
            console.log('Error occurred before workbook could be created');
        }
        
        this.previewElement.innerHTML = `<p class="error-text">Error processing Excel file: ${error.message}</p>`;
        throw error;
    }
}

    /**
     * Read file as array buffer
     * @param {File} file - File to read
     * @returns {Promise<ArrayBuffer>} - Promise resolving to array buffer
     */
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            
            reader.onerror = (e) => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Create sheet navigation UI
     * @param {Array<String>} sheetNames - Array of sheet names
     */
    createSheetNavigation(sheetNames) {
        // Remove existing navigation if any
        if (this.sheetNavContainer) {
            this.sheetNavContainer.remove();
        }
        
        // Create container
        this.sheetNavContainer = document.createElement('div');
        this.sheetNavContainer.className = 'sheet-navigation';
        
        // Create sheet buttons
        sheetNames.forEach((name, index) => {
            const button = document.createElement('button');
            button.textContent = name;
            button.className = 'sheet-button';
            
            // Set active state for first sheet
            if (index === 0) {
                button.setAttribute('data-active', 'true');
            }
            
            // Add click handler
            button.addEventListener('click', () => {
                // Calculate the real sheet index
                const sheetIndex = index + (this.workbook.SheetNames[0].toLowerCase() === 'instructions' ? 1 : 0);
                
                // Update active states
                this.updateActiveButton(button);
                
                // Display selected sheet
                this.displaySheet(sheetIndex);
            });
            
            this.sheetNavContainer.appendChild(button);
        });
        
        // Append to preview container
        if (this.previewElement && this.previewElement.parentNode) {
            this.previewElement.parentNode.insertBefore(this.sheetNavContainer, this.previewElement);
        }
    }

    /**
     * Update active button state
     * @param {HTMLElement} activeButton - New active button
     */
    updateActiveButton(activeButton) {
        // Remove active state from all buttons
        const buttons = this.sheetNavContainer.querySelectorAll('.sheet-button');
        buttons.forEach(button => {
            button.removeAttribute('data-active');
        });
        
        // Set active state for selected button
        activeButton.setAttribute('data-active', 'true');
    }

    /**
     * Display sheet content
     * @param {Number} sheetIndex - Index of sheet to display
     */
    displaySheet(sheetIndex) {
        try {
            // Store pending edits for current sheet before switching
            if (this.currentSheetIndex !== undefined && this.editedData && this.editedHeaders) {
                if (!this.pendingEdits) {
                    this.pendingEdits = {};
                }
                
                // Store the current sheet's edited data before switching
                this.pendingEdits[this.currentSheetIndex] = {
                    data: JSON.parse(JSON.stringify(this.editedData)),
                    headers: JSON.parse(JSON.stringify(this.editedHeaders))
                };
                
                console.log(`Stored pending edits for sheet index ${this.currentSheetIndex}`);
            }

            // Update current sheet index
            this.currentSheetIndex = sheetIndex;
            
            // Get sheet
            const sheetName = this.workbook.SheetNames[sheetIndex];
            const sheet = this.workbook.Sheets[sheetName];
            
            // Convert to JSON (with headers)
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            
            // Ensure we have data
            if (jsonData.length <= 1) {
                this.previewElement.innerHTML = '<p>No data found in this sheet or invalid format</p>';
                return;
            }
            
            // Get headers (first row)
            let headers = jsonData[0].map(header => header || '');
            
            // Get data rows (skip first row)
            let rows = jsonData.slice(1);
            
            // Filter out completely empty rows
            let nonEmptyRows = rows.filter(row => 
                row.some(cell => cell !== null && cell !== undefined && cell !== '')
            );

            // Check if we have pending edits for this sheet
            if (this.pendingEdits && this.pendingEdits[sheetIndex]) {
                console.log(`Found pending edits for sheet ${sheetIndex}, using edited data`);
                // Use the pending edits instead of the original data
                nonEmptyRows = this.pendingEdits[sheetIndex].data;
                headers = this.pendingEdits[sheetIndex].headers;
            }
            
            // Find non-empty columns
            let nonEmptyColumnIndices = this.findNonEmptyColumnIndices(headers, nonEmptyRows);
            
            // Filter headers to only include non-empty columns
            let filteredHeaders = nonEmptyColumnIndices.map(index => headers[index] || `Column ${index + 1}`);
            
            // Save a copy of the data for editing
            this.editedData = JSON.parse(JSON.stringify(nonEmptyRows));
            this.editedHeaders = filteredHeaders;
            
            // Check if this is a TF sheet
            const isTFSheet = sheetName.includes('TF');
            
            // If this is a TF sheet, validate it immediately
            if (isTFSheet) {
                console.log('Validating TF sheet on display...');
                // Find the Choice1 column index
                const choice1Index = headers.findIndex(h => h.toLowerCase() === 'choice1');
                
                if (choice1Index !== -1) {
                    // Validate each row's Choice1 value
                    nonEmptyRows.forEach((row, rowIndex) => {
                        const value = row[choice1Index];
                        if (value) {
                            const normalizedValue = value.toString().trim().toLowerCase();
                            if (normalizedValue !== 'true' && normalizedValue !== 'false') {
                                // Mark this row for error highlighting
                                nonEmptyRows[rowIndex] = { ...row, hasError: true };
                            }
                        }
                    });
                }
            }
            
            // Check if this is a MA (Multiple Answer) sheet
            const isMASheet = sheetName.toUpperCase().includes('MA') || 
                             sheetName.toLowerCase().includes('multiple answer');
            
            // Display table with validation
            this.displayTable(filteredHeaders, nonEmptyRows, nonEmptyColumnIndices, isTFSheet, isMASheet);
            
            // If this is a TF sheet, immediately update error notifications
            if (isTFSheet) {
                this.updateErrorNotificationsOnly();
            }
        } catch (error) {
            console.error(`Error displaying sheet ${sheetIndex}:`, error);
            this.previewElement.innerHTML = `<p class="error-text">Error displaying sheet: ${error.message}</p>`;
        }
    }

    /**
     * Process all sheets for conversion
     * @param {Number} startIndex - Index to start processing from
     * @returns {Array} - Array of question data for all sheets
     */
    processAllSheets(startIndex = 0) {
        const allQuestionData = [];
        
        // Process each sheet
        for (let i = startIndex; i < this.workbook.SheetNames.length; i++) {
            const sheetName = this.workbook.SheetNames[i];
            const sheet = this.workbook.Sheets[sheetName];
            
            // Convert to JSON (with headers in row 1)
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            
            // Skip if sheet is empty
            if (jsonData.length <= 1) continue;
            
            // Get data rows (skip first row as it's headers)
            const rows = jsonData.slice(1);
            
            // Filter out completely empty rows
            const nonEmptyRows = rows.filter(row => 
                row.some(cell => cell !== null && cell !== undefined && cell !== '')
            );
            
            // Add rows to question data
            nonEmptyRows.forEach(row => {
                // Skip empty rows
                if (row.length === 0) return;
                
                // Ensure all cells are strings
                const processedRow = row.map(cell => {
                    if (cell === null || cell === undefined) {
                        return '';
                    }
                    return String(cell);
                });
                
                // Add to question data array
                allQuestionData.push(processedRow);
            });
        }
        
        return allQuestionData;
    }

    /**
     * Find indices of non-empty columns
     * @param {Array} headers - Header row
     * @param {Array} rows - Data rows
     * @returns {Array} - Array of column indices that contain data
     */
    findNonEmptyColumnIndices(headers, rows) {
        const indices = [];
        
        // Check each column
        for (let colIndex = 0; colIndex < headers.length; colIndex++) {
            // Check if any row has data in this column
            const hasData = rows.some(row => {
                return row[colIndex] !== undefined && 
                       row[colIndex] !== null && 
                       row[colIndex].toString().trim() !== '';
            });
            
            // Include header columns that have data
            if (hasData) {
                indices.push(colIndex);
            }
        }
        
        return indices;
    }

/**
 * Display table with headers and rows - includes validation and editing
 * with comprehensive error handling
 * @param {Array} headers - Table headers
 * @param {Array} rows - Table rows
 * @param {Array} columnIndices - Indices of columns to display
 * @param {Boolean} isTFSheet - Whether this is a True/False sheet
 * @param {Boolean} isMASheet - Whether this is a Multiple Answer sheet
 */
displayTable(headers, rows, columnIndices, isTFSheet = false, isMASheet = false) {
    try {
        console.log('Starting displayTable method');
        console.log(`Table data: ${headers ? headers.length : 0} headers, ${rows ? rows.length : 0} rows, ${columnIndices ? columnIndices.length : 0} columns`);
        console.log(`Sheet types: isTFSheet=${isTFSheet}, isMASheet=${isMASheet}`);
        
        // Validate inputs
        if (!headers || !Array.isArray(headers)) {
            console.error('Invalid headers provided to displayTable: not an array');
            headers = [];
        }
        
        if (!rows || !Array.isArray(rows)) {
            console.error('Invalid rows provided to displayTable: not an array');
            rows = [];
        }
        
        if (!columnIndices || !Array.isArray(columnIndices)) {
            console.error('Invalid columnIndices provided to displayTable: not an array');
            columnIndices = [];
        }
        
        // Show all rows instead of limiting to 10
        const previewRows = rows;
        console.log(`Using all ${previewRows.length} rows for display`);
        
        // Create a container for the scrollable table
        let tableHtml = '<div style="max-height: 600px; overflow-y: auto; margin-bottom: 15px;">';
        tableHtml += '<table class="editable-table" style="width: 100%; border-collapse: collapse;">';
        
        try {
            // Table header
            console.log('Creating table header');
            tableHtml += '<thead><tr>';
            // Add row number header
            tableHtml += '<th style="position: sticky; top: 0; padding: 10px; background-color: #f3f4f6; border: 1px solid #e5e7eb; text-align: center; z-index: 10; width: 50px;">#</th>';
            
            // Add existing headers
            headers.forEach((header, idx) => {
                try {
                    if (header === undefined || header === null) {
                        console.warn(`Header at index ${idx} is undefined or null, using empty string`);
                        header = '';
                    }
                    
                    tableHtml += `<th style="position: sticky; top: 0; padding: 10px; background-color: #f3f4f6; border: 1px solid #e5e7eb; text-align: left; z-index: 10;">${header}</th>`;
                } catch (headerError) {
                    console.error(`Error processing header at index ${idx}:`, headerError);
                    tableHtml += `<th style="position: sticky; top: 0; padding: 10px; background-color: #f3f4f6; border: 1px solid #e5e7eb; text-align: left; z-index: 10;">Column ${idx}</th>`;
                }
            });
            
            tableHtml += '</tr></thead>';
        } catch (headerError) {
            console.error('Error creating table header:', headerError);
            tableHtml += '<thead><tr><th>#</th><th>Error creating headers</th></tr></thead>';
        }
        
        // Initialize error collections
        let errors = [];
        let multipleCorrectErrors = [];
        let singleCorrectMAErrors = [];
        let tfErrors = [];
        
        try {
            // Table body
            console.log('Starting table body creation');
            tableHtml += '<tbody>';
            
            // Check for True/False validation errors
            if (isTFSheet) {
                try {
                    console.log('Validating True/False choices');
                    tfErrors = this.validateTFChoices(headers, rows, columnIndices);
                    console.log(`Found ${tfErrors.length} True/False validation errors`);
                } catch (tfValidationError) {
                    console.error('Error validating True/False choices:', tfValidationError);
                    tfErrors = [];
                }
            }
            
            // Identify "tagging" columns
            let taggingColumns = [];
            try {
                console.log('Identifying tagging columns');
                taggingColumns = columnIndices.filter(index => {
                    try {
                        if (!headers[index]) return false;
                        
                        const headerText = headers[index].toLowerCase();
                        return headerText.includes("tag") || 
                               headerText.includes("correct") || 
                               headerText.includes("incorrect");
                    } catch (columnFilterError) {
                        console.error(`Error checking if column ${index} is a tagging column:`, columnFilterError);
                        return false;
                    }
                });
                
                console.log("Detected tagging columns:", taggingColumns);
            } catch (taggingColumnsError) {
                console.error('Error identifying tagging columns:', taggingColumnsError);
                taggingColumns = [];
            }
            
            // Find option-tag column pairs
            let tagPairs = [];
            try {
                console.log('Finding option-tag column pairs');
                // Assuming the structure is [option1, tag1, option2, tag2, ...]
                for (let i = 0; i < columnIndices.length; i++) {
                    try {
                        if (taggingColumns.includes(columnIndices[i])) {
                            // This is a tag column, check if the previous column is an option
                            const tagColIndex = columnIndices[i];
                            const optionColIndex = columnIndices[i-1]; // Assuming the option is always the previous column
                            
                            if (optionColIndex !== undefined) {
                                tagPairs.push({
                                    tagColIndex: tagColIndex,
                                    optionColIndex: optionColIndex
                                });
                                console.log(`Found tag pair: option col=${optionColIndex}, tag col=${tagColIndex}`);
                            }
                        }
                    } catch (pairError) {
                        console.error(`Error processing tag pair at index ${i}:`, pairError);
                    }
                }
                
                console.log(`Found ${tagPairs.length} option-tag column pairs`);
            } catch (tagPairsError) {
                console.error('Error finding option-tag column pairs:', tagPairsError);
                tagPairs = [];
            }
            
            // Determine if this is an MC (Multiple Choice) sheet
            let isMCSheet = false;
            try {
                console.log('Determining if this is a Multiple Choice sheet');
                isMCSheet = (this.workbook && 
                             this.workbook.SheetNames[this.currentSheetIndex] && 
                             this.workbook.SheetNames[this.currentSheetIndex].includes("MC")) ||
                             headers.some(header => header && header.includes("MC"));
                
                console.log(`Sheet is ${isMCSheet ? '' : 'not '}identified as Multiple Choice`);
            } catch (mcSheetError) {
                console.error('Error determining if this is a Multiple Choice sheet:', mcSheetError);
                isMCSheet = false;
            }
            
            // Process each row
            console.log(`Processing ${previewRows.length} rows`);
            previewRows.forEach((row, rowIndex) => {
                try {
                    console.log(`Processing row ${rowIndex + 1}`);
                    let rowErrors = [];
                    let rowStyle = "";
                    let isMultipleCorrect = false;
                    let isSingleCorrectMA = false;
                    
                    // Check for MA sheet and question type
                    try {
                        const isMAQuestion = isMASheet || (row.length > 0 && row[0] === "MA");
                        console.log(`Row ${rowIndex + 1} is ${isMAQuestion ? '' : 'not '}a Multiple Answer question`);
                        
                        if (isMAQuestion) {
                            let correctCount = 0;
                            
                            // Count the number of "correct" values in tagging columns
                            taggingColumns.forEach(colIndex => {
                                try {
                                    if (!row[colIndex]) return;
                                    const value = row[colIndex].toString().trim().toLowerCase();
                                    if (value === 'correct') {
                                        correctCount++;
                                    }
                                } catch (maColumnError) {
                                    console.error(`Error checking MA column ${colIndex} for row ${rowIndex + 1}:`, maColumnError);
                                }
                            });
                            
                            console.log(`Row ${rowIndex + 1} (MA) has ${correctCount} correct answers`);

                            // For MA questions, check if there's only 1 correct answer or less
                            if (correctCount < 2) {
                                console.log(`Row ${rowIndex + 1} has less than 2 correct answers - flagging as MA error`);
                                isSingleCorrectMA = true;
                                rowStyle = 'border-left: 6px solid #f97316;'; // Orange highlight on the left side
                                singleCorrectMAErrors.push({
                                    row: rowIndex + 1,
                                    count: correctCount
                                });
                            }
                        }
                    } catch (maCheckError) {
                        console.error(`Error checking if row ${rowIndex + 1} is a MA question:`, maCheckError);
                    }
                    
                    // For MC questions, check how many "correct" values exist in the row
                    try {
                        if (isMCSheet || (row.length > 0 && row[0] === "MC")) {
                            console.log(`Row ${rowIndex + 1} is a Multiple Choice question`);
                            let correctCount = 0;
                            
                            // Count the number of "correct" values in tagging columns
                            taggingColumns.forEach(colIndex => {
                                try {
                                    if (!row[colIndex]) return;
                                    const value = row[colIndex].toString().trim().toLowerCase();
                                    if (value === 'correct') {
                                        correctCount++;
                                    }
                                } catch (mcColumnError) {
                                    console.error(`Error checking MC column ${colIndex} for row ${rowIndex + 1}:`, mcColumnError);
                                }
                            });
                            
                            console.log(`Row ${rowIndex + 1} (MC) has ${correctCount} correct answers`);

                            // If there are multiple correct answers or zero correct answers, flag this row
                            if (correctCount !== 1) {
                                console.log(`Row ${rowIndex + 1} has ${correctCount} correct answers - flagging as MC error`);
                                isMultipleCorrect = true;
                                rowStyle = 'border-left: 6px solid #f97316;'; // Orange highlight on the left side
                                multipleCorrectErrors.push({
                                    row: rowIndex + 1,
                                    count: correctCount
                                });
                            }
                        }
                    } catch (mcCheckError) {
                        console.error(`Error checking if row ${rowIndex + 1} is a MC question:`, mcCheckError);
                    }
                    
                    // Check for TF errors in this row
                    try {
                        if (isTFSheet) {
                            const rowTFErrors = tfErrors.filter(err => err.row === rowIndex + 1);
                            if (rowTFErrors.length > 0) {
                                console.log(`Row ${rowIndex + 1} has ${rowTFErrors.length} TF errors`);
                                // Add red left border for TF errors
                                rowStyle = 'border-left: 6px solid #ef4444;'; // Red highlight
                            }
                        }
                    } catch (tfCheckError) {
                        console.error(`Error checking TF errors for row ${rowIndex + 1}:`, tfCheckError);
                    }
                
                    // Check for tagging errors
                    try {
                        tagPairs.forEach((pair, pairIndex) => {
                            try {
                                if (!row[pair.optionColIndex] || !row[pair.tagColIndex]) return;
                                
                                const optionValue = row[pair.optionColIndex].toString().trim();
                                const tagValue = row[pair.tagColIndex].toString().trim();
                                
                                // Only validate if the option has a value but the tag is invalid
                                if (optionValue && !["correct", "incorrect"].includes(tagValue.toLowerCase())) {
                                    console.log(`Row ${rowIndex + 1} has invalid tag value "${tagValue}" for option "${optionValue}"`);
                                    const headerIndex = columnIndices.indexOf(pair.tagColIndex);
                                    const headerName = headerIndex >= 0 && headerIndex < headers.length ? 
                                                   headers[headerIndex] : `Column ${pair.tagColIndex}`;
                                    
                                    rowErrors.push(`Row: ${rowIndex + 1}, Column: "${headerName}" has invalid value "${tagValue}" for option "${optionValue}"`);
                                }
                            } catch (pairCheckError) {
                                console.error(`Error checking tag pair ${pairIndex} for row ${rowIndex + 1}:`, pairCheckError);
                            }
                        });
                        
                        if (rowErrors.length > 0) {
                            console.log(`Row ${rowIndex + 1} has ${rowErrors.length} tagging errors`);
                        }
                    } catch (taggingCheckError) {
                        console.error(`Error checking tagging errors for row ${rowIndex + 1}:`, taggingCheckError);
                    }
                    
                    // Create the row HTML
                    try {
                        const rowBgColor = rowIndex % 2 === 0 ? 'white' : '#f9fafb';
                        tableHtml += `<tr style="background-color: ${rowBgColor}; ${rowStyle}" data-row-id="${rowIndex}">`;
                        
                        // Add row number cell
                        tableHtml += `<td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; font-weight: 500; background-color: #f3f4f6;" class="row-number-cell">${rowIndex + 1}</td>`;
                    
                        // Process each cell in the row
                        columnIndices.forEach((colIndex, cellIndex) => {
                            try {
                                // Get cell value
                                let value = '';
                                try {
                                    value = row[colIndex] !== undefined ? row[colIndex].toString().trim() : '';
                                } catch (valueError) {
                                    console.error(`Error getting cell value at row ${rowIndex + 1}, column ${colIndex}:`, valueError);
                                    value = '';
                                }
                                
                                let cellStyle = '';
                                
                                // If this is a TF sheet and this cell contains a TF value that's invalid
                                try {
                                    const isTFChoiceCell = isTFSheet && 
                                                        headers[cellIndex] && 
                                                        headers[cellIndex].toLowerCase().includes('choice');
                                                        
                                    if (isTFChoiceCell) {
                                        const normalizedValue = value.toLowerCase();
                                        if (value && normalizedValue !== 'true' && normalizedValue !== 'false') {
                                            console.log(`Invalid TF value "${value}" at row ${rowIndex + 1}, column ${cellIndex}`);
                                            cellStyle += 'background-color: #fee2e2; color: #b91c1c; font-weight: 500;'; // Red highlight
                                        }
                                    }
                                } catch (tfCellError) {
                                    console.error(`Error checking TF cell at row ${rowIndex + 1}, column ${cellIndex}:`, tfCellError);
                                }
                        
                                // Apply standard styling
                                try {
                                    const lowerValue = value.toLowerCase();
                                    if (lowerValue === 'correct') {
                                        cellStyle = 'color: #10b981; font-weight: 500;'; // Green for correct
                                    } else if (lowerValue === 'incorrect') {
                                        cellStyle = 'color: #ef4444; font-weight: 500;'; // Red for incorrect
                                    }
                                } catch (styleCellError) {
                                    console.error(`Error applying standard cell style at row ${rowIndex + 1}, column ${cellIndex}:`, styleCellError);
                                }
                        
                                // Add error highlighting for tag cells
                                try {
                                    if (taggingColumns.includes(colIndex)) {
                                        // Find the corresponding option column
                                        const pairInfo = tagPairs.find(p => p.tagColIndex === colIndex);
                                        if (pairInfo) {
                                            const optionColIndex = pairInfo.optionColIndex;
                                            const optionValue = row[optionColIndex] !== undefined ? row[optionColIndex].toString().trim() : '';
                                            
                                            // Only highlight if option exists but tag is invalid
                                            if (optionValue && !["correct", "incorrect"].includes(value.toLowerCase())) {
                                                console.log(`Invalid tag value "${value}" for option "${optionValue}" at row ${rowIndex + 1}, column ${cellIndex}`);
                                                cellStyle += ' background-color: #fee2e2; color: #b91c1c; font-weight: 500;'; // Red highlight
                                            }
                                        }
                                    }
                                } catch (tagCellError) {
                                    console.error(`Error checking tag cell at row ${rowIndex + 1}, column ${cellIndex}:`, tagCellError);
                                }
                        
                                // Safely escape HTML and create cell
                                let escapedValue = '';
                                try {
                                    escapedValue = this.escapeHTML(value);
                                } catch (escapeError) {
                                    console.error(`Error escaping HTML at row ${rowIndex + 1}, column ${cellIndex}:`, escapeError);
                                    escapedValue = '';
                                }
                                
                                // Make the cell editable with appropriate attributes
                                tableHtml += `
                                    <td 
                                        style="padding: 8px; border: 1px solid #e5e7eb; ${cellStyle}; cursor: pointer;" 
                                        data-row="${rowIndex}" 
                                        data-col="${cellIndex}" 
                                        data-original-col="${colIndex}"
                                        data-value="${escapedValue}"
                                        class="editable-cell"
                                        title="Double-click to edit"
                                        ondblclick="document.dispatchEvent(new CustomEvent('cell-click', {detail: {row: ${rowIndex}, col: ${cellIndex}, originalCol: ${colIndex}, value: '${escapedValue}'}}))"
                                    >${value}</td>`;
                            } catch (cellError) {
                                console.error(`Error creating cell at row ${rowIndex + 1}, column ${cellIndex}:`, cellError);
                                tableHtml += `<td>Error</td>`;
                            }
                        });
                    
                        tableHtml += '</tr>';
                    
                        if (rowErrors.length > 0) {
                            errors.push(...rowErrors);
                        }
                    } catch (rowHtmlError) {
                        console.error(`Error creating HTML for row ${rowIndex + 1}:`, rowHtmlError);
                        tableHtml += `<tr><td colspan="${columnIndices.length + 1}">Error rendering row ${rowIndex + 1}</td></tr>`;
                    }
                } catch (rowError) {
                    console.error(`Fatal error processing row ${rowIndex + 1}:`, rowError);
                    tableHtml += `<tr><td colspan="${columnIndices.length + 1}">Error processing row ${rowIndex + 1}</td></tr>`;
                }
            });
            
            console.log(`Finished processing ${previewRows.length} rows`);
            console.log(`Found ${errors.length} tagging errors, ${multipleCorrectErrors.length} MC errors, ${singleCorrectMAErrors.length} MA errors, ${tfErrors.length} TF errors`);
            
            tableHtml += '</tbody></table>';
            tableHtml += '</div>'; // Close the scrollable container
        } catch (bodyError) {
            console.error('Error creating table body:', bodyError);
            tableHtml += '<tbody><tr><td colspan="2">Error creating table content</td></tr></tbody></table></div>';
        }
        
        // Clear previous errors
        try {
            console.log('Clearing previous error notifications');
            document.querySelectorAll(".validation-errors-container").forEach(el => {
                try {
                    el.remove();
                } catch (removeError) {
                    console.error('Error removing validation-errors-container:', removeError);
                }
            });
            
            document.querySelectorAll(".multiple-correct-container").forEach(el => {
                try {
                    el.remove();
                } catch (removeError) {
                    console.error('Error removing multiple-correct-container:', removeError);
                }
            });
            
            document.querySelectorAll(".single-correct-ma-container").forEach(el => {
                try {
                    el.remove();
                } catch (removeError) {
                    console.error('Error removing single-correct-ma-container:', removeError);
                }
            });
            
            document.querySelectorAll(".tf-errors-container").forEach(el => {
                try {
                    el.remove();
                } catch (removeError) {
                    console.error('Error removing tf-errors-container:', removeError);
                }
            });
        } catch (clearError) {
            console.error('Error clearing previous error notifications:', clearError);
        }
        
        // Add error notifications
        try {
            console.log('Adding error notifications');
            
            // Add TF validation errors if any
            if (tfErrors.length > 0) {
                try {
                    console.log(`Adding ${tfErrors.length} TF validation errors`);
                    let tfErrorHtml = '<div class="tf-errors-container" style="margin-bottom: 15px; padding: 12px 15px; background-color: #fee2e2; border-radius: 6px; border: 1px solid #ef4444;">';
                    tfErrorHtml += '<h3 style="margin: 0 0 8px 0; color: #b91c1c; font-size: 1rem; font-weight: 600;">True/False Validation Errors:</h3><ul style="margin: 0; padding-left: 20px;">';
                    
                    tfErrors.forEach(error => {
                        try {
                            tfErrorHtml += `<li style="color: #7f1d1d; margin-bottom: 4px;">${error.message}</li>`;
                        } catch (errorItemError) {
                            console.error('Error adding TF error item:', errorItemError);
                        }
                    });
                    
                    tfErrorHtml += '</ul></div>';

                    if (this.previewElement && this.previewElement.parentNode) {
                        try {
                            this.previewElement.parentNode.insertBefore(
                                document.createRange().createContextualFragment(tfErrorHtml),
                                this.previewElement
                            );
                        } catch (insertError) {
                            console.error('Error inserting TF errors container:', insertError);
                        }
                    } else {
                        console.warn('Preview element or its parent node not found, cannot add TF errors');
                    }
                } catch (tfErrorContainerError) {
                    console.error('Error creating TF errors container:', tfErrorContainerError);
                }
            }
            
            // Add single correct MA errors warning if needed
            if (singleCorrectMAErrors.length > 0) {
                try {
                    console.log(`Adding ${singleCorrectMAErrors.length} single correct MA warnings`);
                    let maErrorHtml = '<div class="single-correct-ma-container" style="margin-bottom: 15px; padding: 12px 15px; background-color: #ffedd5; border-radius: 6px; border: 1px solid #f97316;">';
                    maErrorHtml += '<h3 style="margin: 0 0 8px 0; color: #9a3412; font-size: 1rem; font-weight: 600;">Multiple Answer Questions Need At Least 2 Correct Answers:</h3><ul style="margin: 0; padding-left: 20px;">';
                    
                    singleCorrectMAErrors.forEach(error => {
                        try {
                            maErrorHtml += `<li style="color: #7c2d12; margin-bottom: 4px;">Row ${error.row}: Contains Only ${error.count} Correct Answer. Multiple Answer Questions should have at least 2 correct answers.</li>`;
                        } catch (errorItemError) {
                            console.error('Error adding MA error item:', errorItemError);
                        }
                    });
                    
                    maErrorHtml += '</ul></div>';

                    if (this.previewElement && this.previewElement.parentNode) {
                        try {
                            this.previewElement.parentNode.insertBefore(
                                document.createRange().createContextualFragment(maErrorHtml),
                                this.previewElement
                            );
                        } catch (insertError) {
                            console.error('Error inserting MA errors container:', insertError);
                        }
                    } else {
                        console.warn('Preview element or its parent node not found, cannot add MA errors');
                    }
                } catch (maErrorContainerError) {
                    console.error('Error creating MA errors container:', maErrorContainerError);
                }
            }
            
            // Add multiple correct answers warning if needed
            if (multipleCorrectErrors.length > 0) {
                try {
                    console.log(`Adding ${multipleCorrectErrors.length} multiple correct MC warnings`);
                    let mcErrorHtml = '<div class="multiple-correct-container" style="margin-bottom: 15px; padding: 12px 15px; background-color: #ffedd5; border-radius: 6px; border: 1px solid #f97316;">';
                    mcErrorHtml += '<h3 style="margin: 0 0 8px 0; color: #9a3412; font-size: 1rem; font-weight: 600;">Multiple Choice Questions Need Exactly 1 Correct Answer:</h3><ul style="margin: 0; padding-left: 20px;">';
                    
                    multipleCorrectErrors.forEach(error => {
                        try {
                            mcErrorHtml += `<li style="color: #7c2d12; margin-bottom: 4px;">Row ${error.row}: Contains ${error.count} Correct Answers. Multiple Choice Questions should have exactly 1 correct answer.</li>`;
                        } catch (errorItemError) {
                            console.error('Error adding MC error item:', errorItemError);
                        }
                    });
                    
                    mcErrorHtml += '</ul></div>';

                    if (this.previewElement && this.previewElement.parentNode) {
                        try {
                            this.previewElement.parentNode.insertBefore(
                                document.createRange().createContextualFragment(mcErrorHtml),
                                this.previewElement
                            );
                        } catch (insertError) {
                            console.error('Error inserting MC errors container:', insertError);
                        }
                    } else {
                        console.warn('Preview element or its parent node not found, cannot add MC errors');
                    }
                } catch (mcErrorContainerError) {
                    console.error('Error creating MC errors container:', mcErrorContainerError);
                }
            }
            
            // Add general error summary
            if (errors.length > 0) {
                try {
                    console.log(`Adding ${errors.length} general tagging errors`);
                    let errorHtml = '<div class="validation-errors-container" style="margin-bottom: 15px; padding: 12px 15px; background-color: #fee2e2; border-radius: 6px; border: 1px solid #ef4444;">';
                    errorHtml += '<h3 style="margin: 0 0 8px 0; color: #b91c1c; font-size: 1rem; font-weight: 600;">Tagging Errors Found:</h3><ul style="margin: 0; padding-left: 20px;">';
                    
                    errors.forEach(error => {
                        try {
                            errorHtml += `<li style="color: #7f1d1d; margin-bottom: 4px;">${error}</li>`;
                        } catch (errorItemError) {
                            console.error('Error adding general error item:', errorItemError);
                        }
                    });
                    
                    errorHtml += '</ul></div>';
                
                    if (this.previewElement && this.previewElement.parentNode) {
                        try {
                            this.previewElement.parentNode.insertBefore(
                                document.createRange().createContextualFragment(errorHtml),
                                this.previewElement
                            );
                        } catch (insertError) {
                            console.error('Error inserting general errors container:', insertError);
                        }
                    } else {
                        console.warn('Preview element or its parent node not found, cannot add general errors');
                    }
                } catch (errorContainerError) {
                    console.error('Error creating general errors container:', errorContainerError);
                }
            }
        } catch (notificationsError) {
            console.error('Error adding error notifications:', notificationsError);
        }
        
        // Add CSS style for row number column
        try {
            console.log('Adding row number column styles');
            const styleId = 'row-number-styles';
            if (!document.getElementById(styleId)) {
                try {
                    const style = document.createElement('style');
                    style.id = styleId;
                    style.textContent = `
                        .row-number-cell {
                            user-select: none;
                            cursor: default !important;
                        }
                        .row-number-cell:hover {
                            background-color: #f3f4f6 !important;
                        }
                    `;
                    document.head.appendChild(style);
                    console.log('Row number styles added successfully');
                } catch (styleError) {
                    console.error('Error creating row number styles:', styleError);
                }
            } else {
                console.log('Row number styles already exist, skipping');
            }
        } catch (rowNumberStyleError) {
            console.error('Error handling row number styles:', rowNumberStyleError);
        }
        
        // Set the table HTML in the preview element
        try {
            console.log('Setting table HTML in preview element');
            
            if (!this.previewElement) {
                console.error('Preview element not found, cannot set table HTML');
            } else {
                this.previewElement.innerHTML = tableHtml;
                
                try {
                    // Add row count info
                    console.log('Adding row count information');
                    const rowCountInfo = document.createElement('p');
                    rowCountInfo.style = 'margin-top: 10px; color: #718096;';
                    rowCountInfo.textContent = `Showing all ${rows.length} rows`;
                    this.previewElement.appendChild(rowCountInfo);
                    
                    // Add help text for editing
                    console.log('Adding help text for editing');
                    const helpText = document.createElement('p');
                    helpText.style = 'margin-top: 15px; color: #4a6cf7; font-style: italic;';
                    helpText.innerHTML = '<i class="fas fa-info-circle"></i> <strong>Tip:</strong> Double-click any cell to edit its value. Press Enter to save changes or Esc to cancel.';
                    this.previewElement.appendChild(helpText);
                } catch (infoTextError) {
                    console.error('Error adding info text elements:', infoTextError);
                }
                
                // Add event listener for cell clicks via custom event
                try {
                    console.log('Setting up cell click event listener');
                    // Remove existing listener first to avoid duplicates
                    document.removeEventListener('cell-click', this.handleCellClickWrapper);
                    
                    // Create a wrapper function we can reference for removal
                    this.handleCellClickWrapper = (e) => {
                        try {
                            console.log('Cell click event triggered:', e.detail);
                            this.handleCellClick(e.detail);
                        } catch (cellClickHandlerError) {
                            console.error('Error in cell-click event handler:', cellClickHandlerError);
                        }
                    };
                    
                    document.addEventListener('cell-click', this.handleCellClickWrapper);
                    console.log('Cell click event listener set up successfully');
                } catch (eventListenerError) {
                    console.error('Error setting up cell click event listener:', eventListenerError);
                }
                
                // Enable the download button
                try {
                    if (this.downloadBtn) {
                        console.log('Enabling download button');
                        this.downloadBtn.disabled = false;
                    } else {
                        console.warn('Download button not found, cannot enable');
                    }
                } catch (buttonError) {
                    console.error('Error enabling download button:', buttonError);
                }
                
                // Update validation errors state
                try {
                    console.log('Updating validation errors state');
                    this.hasValidationErrors = errors.length > 0 || 
                                             multipleCorrectErrors.length > 0 || 
                                             singleCorrectMAErrors.length > 0 || 
                                             tfErrors.length > 0;
                    
                    console.log(`Validation errors state: ${this.hasValidationErrors ? 'Has errors' : 'No errors'}`);
                } catch (validationStateError) {
                    console.error('Error updating validation errors state:', validationStateError);
                    this.hasValidationErrors = true; // Default to true if error
                }
                
                console.log('Table display completed successfully');
            }
        } catch (previewError) {
            console.error('Error updating preview element with table HTML:', previewError);
            
            // Create a minimal fallback display if everything else fails
            try {
                if (this.previewElement) {
                    this.previewElement.innerHTML = `
                        <div class="error-container" style="padding: 20px; background-color: #fee2e2; border-radius: 6px; border: 1px solid #ef4444;">
                            <h3 style="margin: 0 0 10px 0; color: #b91c1c;">Error Displaying Table</h3>
                            <p>There was an error rendering the table preview. Please try again or check the console for details.</p>
                        </div>
                    `;
                }
            } catch (fallbackError) {
                console.error('Error creating fallback error display:', fallbackError);
            }
        }
    } catch (error) {
        console.error('Fatal error in displayTable method:', error);
        
        // Create a minimal error message if everything else fails
        try {
            if (this.previewElement) {
                this.previewElement.innerHTML = '<div style="color: #ef4444;">Error displaying table data. Please refresh and try again.</div>';
            }
        } catch (finalError) {
            console.error('Failed to create error message:', finalError);
        }
    }
}

/**
 * Manages the unsaved changes notification
 * @param {string} action - 'show' to display notification, 'hide' to remove it
 */
manageUnsavedChangesNotification(action) {
    console.log(`Managing unsaved changes notification: ${action}`);
    
    // First, always clean up existing notifications
    // Remove by reference if we have it
    if (this.unsavedChangesNotification) {
        try {
            this.unsavedChangesNotification.remove();
        } catch (e) {
            console.error('Error removing notification by reference:', e);
        }
        this.unsavedChangesNotification = null;
    }
    
    // Also try to remove by class name as a fallback
    try {
        const existingNotifications = document.querySelectorAll('.unsaved-changes-notification');
        existingNotifications.forEach(notification => {
            notification.remove();
        });
    } catch (e) {
        console.error('Error removing notifications by class name:', e);
    }
    
    // If we're showing the notification
    if (action === 'show') {
        try {
            // Create the notification element
            this.unsavedChangesNotification = document.createElement('div');
            this.unsavedChangesNotification.className = 'unsaved-changes-notification';
            this.unsavedChangesNotification.setAttribute('id', 'unsaved-changes-notification'); // Add ID for easier targeting
            this.unsavedChangesNotification.innerHTML = `
                <div style="display: flex; align-items: center; padding: 10px 15px; background-color: #fff7ed; border: 1px solid #ffb81c; border-radius: 4px; margin-bottom: 15px;">
                    <i class="fas fa-exclamation-triangle" style="color: #f59e0b; margin-right: 10px; font-size: 1.2rem;"></i>
                    <span style="color: #7c2d12; font-weight: 500;">You have unsaved changes. Click the "Save Changes" button for them to take effect.</span>
                </div>
            `;
            
            // Find the summary section to place the notification before it
            const summarySection = document.getElementById('summary-section');
            
            if (summarySection) {
                // Place before summary section
                summarySection.parentNode.insertBefore(this.unsavedChangesNotification, summarySection);
            } else if (this.previewElement && this.previewElement.parentNode) {
                // If no summary section, place after preview element
                this.previewElement.parentNode.insertBefore(
                    this.unsavedChangesNotification, 
                    this.previewElement.nextSibling
                );
            }
            
            // Also enable the commit button if it exists
            if (this.commitBtn) {
                this.commitBtn.disabled = false;
            }
            
            console.log('Unsaved changes notification added to DOM');
        } catch (error) {
            console.error('Error creating unsaved changes notification:', error);
        }
    } else {
        console.log('Unsaved changes notification removed');
    }
}

    /**
 * Validate True/False choices in TF sheets
 * @param {Array} headers - Table headers
 * @param {Array} rows - Table rows
 * @param {Array} columnIndices - Indices of columns to display
 * @returns {Array} - Array of TF validation errors
 */
    validateTFChoices(headers, rows, columnIndices) {
        const tfErrors = [];
        
        // Check if this is a TF sheet based on the sheet name
        const isTFSheet = this.workbook && 
                         this.workbook.SheetNames[this.currentSheetIndex] && 
                         (this.workbook.SheetNames[this.currentSheetIndex].includes("TF") ||
                         rows.some(row => row[0] === "TF"));
        
        if (!isTFSheet) {
            return tfErrors; // Not a TF sheet, no validation needed
        }
        
        // Find the Choice1 column index
        let choice1ColumnIndex = -1;
        let choice1HeaderIndex = -1;
        
        headers.forEach((header, index) => {
            if (header && header.toLowerCase() === 'choice1') {
                choice1HeaderIndex = index;
                choice1ColumnIndex = columnIndices[index];
            }
        });
        
        // If Choice1 column not found, try to find another column that might contain T/F values
        if (choice1ColumnIndex === -1) {
            headers.forEach((header, index) => {
                if (header && header.toLowerCase().includes('choice')) {
                    choice1HeaderIndex = index;
                    choice1ColumnIndex = columnIndices[index];
                }
            });
        }
        
        // If we found a potential Choice1 column, validate its values
        if (choice1HeaderIndex !== -1) {
            rows.forEach((row, rowIndex) => {
                // Get the value from the correct column index
                const value = row[choice1HeaderIndex];
                
                // Check for empty or missing answer
                if (!value || value.toString().trim() === '') {
                    tfErrors.push({
                        row: rowIndex + 1,
                        value: value,
                        message: `Row ${rowIndex + 1}: No answer provided. True/False questions must have either "true" or "false" as the answer.`
                    });
                    return;
                }
                
                // Check if the value is either "true" or "false" (case-insensitive)
                const normalizedValue = value.toString().trim().toLowerCase();
                if (normalizedValue !== 'true' && normalizedValue !== 'false') {
                    tfErrors.push({
                        row: rowIndex + 1,
                        value: value,
                        message: `Row ${rowIndex + 1}: Invalid True/False value: "${value}". Only "true" or "false" are accepted.`
                    });
                }
            });
        } else {
            console.warn('Choice1 column not found in TF sheet');
        }
        
        return tfErrors;
    }

/**
 * Handle cell click for editing
 * @param {Object} detail - Cell details {row, col, originalCol, value}
 */
handleCellClick(detail) {
    // If already editing a cell, finish that edit first
    if (this.currentEditCell) {
        this.finishEditing();
    }
    
    const { row, col, originalCol, value } = detail;
    
    // Find the cell that was clicked - make sure we're getting an editable cell, not a row number cell
    const cell = this.previewElement.querySelector(`td.editable-cell[data-row="${row}"][data-col="${col}"]`);
    if (!cell) return;
    
    // Save original content
    const originalContent = cell.innerHTML;
    
    // Create an input element
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.className = 'edit-input';
    input.style.cssText = `
        width: 100%;
        padding: 4px;
        border: 2px solid #4a6cf7;
        border-radius: 4px;
        font-family: inherit;
        font-size: inherit;
        background-color: white;
        outline: none;
    `;
    
    // Replace cell content with input
    cell.innerHTML = '';
    cell.appendChild(input);
    
    // Focus the input
    input.focus();
    input.select();
    
    // Save reference to current edit
    this.currentEditCell = {
        cell,
        row,
        col,
        originalCol,
        originalContent,
        input
    };
    
    // Add event listener for input keys
    input.addEventListener('keydown', this.handleCellEdit);
}

    /**
     * Handle key events during cell editing
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleCellEdit(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.finishEditing();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this.cancelEditing();
        }
    }

/**
 * Finish editing a cell and save the changes
 */
finishEditing() {
    if (!this.currentEditCell) return;
    
    const { cell, row, originalCol, input } = this.currentEditCell;
    const newValue = input.value;
    
    // Update the cell content directly without redrawing the table
    cell.innerHTML = newValue;
    cell.setAttribute('data-value', this.escapeHTML(newValue));
    
    // Update the edited data - ensure we don't create new rows
    if (this.editedData) {
        // Make sure we're within bounds of existing data
        if (row >= 0 && row < this.editedData.length) {
            // Initialize row array if it doesn't exist
            if (!this.editedData[row]) {
                this.editedData[row] = Array(this.editedHeaders.length).fill('');
            }
            // Update only the specific cell
            this.editedData[row][originalCol] = newValue;
            
            // Store in pendingEdits to preserve across sheet switches
            if (!this.pendingEdits) {
                this.pendingEdits = {};
            }
            
            // Only store if we have valid data
            if (this.editedData && this.editedHeaders) {
                // Create a deep copy of the current state
                this.pendingEdits[this.currentSheetIndex] = {
                    data: JSON.parse(JSON.stringify(this.editedData)),
                    headers: JSON.parse(JSON.stringify(this.editedHeaders))
                };
                console.log(`Updated pending edits for sheet ${this.currentSheetIndex}`);
            }
        }
    }
    
    // Update the original question data to persist changes
    this.updateOriginalQuestionData(row, originalCol, newValue);
    
    // Clear current edit
    this.currentEditCell = null;
    
    // Enable download and commit buttons
    if (this.downloadBtn) {
        this.downloadBtn.disabled = false;
    }
    if (this.commitBtn) {
        this.commitBtn.disabled = false;
    }
    
    // Apply appropriate styling based on the new value
    this.applyCellStyling(cell, newValue);
    
    // Update error notifications without redrawing the table
    this.updateErrorNotificationsOnly();
    
    // Show unsaved changes notification
    this.manageUnsavedChangesNotification('show');
}


/**
 * Apply styling to a cell based on its value
 * @param {HTMLElement} cell - The cell element
 * @param {String} value - The cell value
 */
applyCellStyling(cell, value) {
    // Reset styling
    cell.style.color = '';
    cell.style.fontWeight = '';
    cell.style.backgroundColor = '';
    
    // Apply standard styling
    const lowerValue = value.toLowerCase();
    if (lowerValue === 'correct') {
        cell.style.color = '#10b981'; // Green for correct
        cell.style.fontWeight = '500';
    } else if (lowerValue === 'incorrect') {
        cell.style.color = '#ef4444'; // Red for incorrect
        cell.style.fontWeight = '500';
    }
    
    // We could add more styling logic here if needed for other cell types
}

/**
 * Validate data without redrawing the table
 */
validateDataWithoutRedraw() {
    // This is a simplified version that just sets the validation state
    // without redrawing the table
    
    // Get current error count
    const previousErrorCount = this.hasValidationErrors ? 1 : 0;
    
    // Your validation logic here without redrawing
    // For now, let's just use a placeholder that keeps the current state
    this.hasValidationErrors = this.checkForErrors();
    
    // If validation state changed, update UI elements as needed
    if ((this.hasValidationErrors ? 1 : 0) !== previousErrorCount) {
        // Update UI elements that show validation state
    }
}

/**
 * Check for errors in the edited data
 * @returns {Boolean} - True if there are any errors
 */
checkForErrors() {
    // This is a simplified version of your error checking logic
    // that doesn't redraw the table
    
    // For now, keep the current validation state
    return this.hasValidationErrors;
}
    
    /**
     * Refresh the question display in the UI after edits
     */
    refreshQuestionDisplay() {
        // If the app has a UI controller, refresh the questions
        if (window.app && window.app.uiController) {
            // Re-render the questions to reflect the changes
            window.app.uiController.renderQuestions();
        }
    }

    /**
     * Cancel editing without saving changes
     */
    cancelEditing() {
        if (!this.currentEditCell) return;
        
        const { cell, originalContent } = this.currentEditCell;
        
        // Restore original content
        cell.innerHTML = originalContent;
        
        // Clear current edit
        this.currentEditCell = null;
    }

/**
 * Download the edited data as a file
 */
downloadEditedFile() {
    if (!this.workbook) {
        this.showMessage('No workbook available to download', 'error');
        return;
    }
    
    try {
        // Create a new workbook based on the original one
        const wb = XLSX.utils.book_new();
        
        // Get all sheets from the original workbook
        for (let i = 0; i < this.workbook.SheetNames.length; i++) {
            const sheetName = this.workbook.SheetNames[i];
            
            // If this is the current active sheet with edits
            if (i === this.currentSheetIndex && this.editedData && this.editedHeaders) {
                // Create new worksheet from edited data
                const wsData = [this.editedHeaders, ...this.editedData];
                const newSheet = XLSX.utils.aoa_to_sheet(wsData);
                
                // Add the edited sheet to the new workbook
                XLSX.utils.book_append_sheet(wb, newSheet, sheetName);
            } else {
                // Copy the sheet as-is from the original workbook
                const sheet = this.workbook.Sheets[sheetName];
                XLSX.utils.book_append_sheet(wb, sheet, sheetName);
            }
        }
        
        // Generate file name based on original file
        const fileName = this.currentFile ? 
            `edited_${this.currentFile.name}` : 
            "edited_data.xlsx";
        
        // Write to file and trigger download
        XLSX.writeFile(wb, fileName);
        
        // Show success message
        this.showMessage(`File "${fileName}" downloaded successfully!`, 'success');
    } catch (error) {
        console.error('Error downloading edited file:', error);
        this.showMessage(`Error creating file: ${error.message}`, 'error');
    }
}


/**
 * Process edited data into question objects
 * @param {String} questionType - Type of questions (MC, MA, etc.)
 * @returns {Array} - Array of processed question objects
 */
processEditedData(questionType) {
    console.log(`Starting to process edited data for question type: ${questionType}`);
    
    // Check for required data
    if (!this.editedData) {
        console.error('Processing failed: editedData is missing or undefined');
        return [];
    }
    
    if (!this.editedHeaders) {
        console.error('Processing failed: editedHeaders is missing or undefined');
        return [];
    }
    
    console.log(`Processing ${this.editedData.length} rows with ${this.editedHeaders.length} columns`);
    console.log('Headers:', this.editedHeaders);
    
    const processedQuestions = [];
    let successCount = 0;
    let failureCount = 0;
    
    this.editedData.forEach((row, index) => {
        console.log(`Processing row ${index + 1}/${this.editedData.length} for ${questionType} question`);
        
        // Log empty or problematic rows
        const emptyValues = Object.values(row).filter(val => val === '' || val === null || val === undefined).length;
        const totalValues = Object.values(row).length;
        if (emptyValues > totalValues / 2) {
            console.warn(`Row ${index + 1} has ${emptyValues}/${totalValues} empty values, may be incomplete`);
        }
        
        let question = null;
        
        try {
            // Process based on question type
            switch (questionType) {
                case 'MC':
                    console.log(`Processing row ${index + 1} as Multiple Choice question`);
                    question = window.app.fileHandler.processMCQuestion(row, index);
                    break;
                case 'MA':
                    console.log(`Processing row ${index + 1} as Multiple Answer question`);
                    question = window.app.fileHandler.processMAQuestion(row, index);
                    break;
                case 'TF':
                    console.log(`Processing row ${index + 1} as True/False question`);
                    question = window.app.fileHandler.processTFQuestion(row, index);
                    break;
                case 'ESS':
                    console.log(`Processing row ${index + 1} as Essay question`);
                    question = window.app.fileHandler.processESSQuestion(row, index);
                    break;
                case 'FIB':
                    console.log(`Processing row ${index + 1} as Fill in the Blank question`);
                    question = window.app.fileHandler.processFIBQuestion(row, index);
                    break;
                default:
                    console.error(`Unknown question type: ${questionType} for row ${index + 1}`);
                    break;
            }
            
            if (question) {
                console.log(`Successfully processed row ${index + 1} into question object:`, 
                    { id: question.id, type: question.type });
                processedQuestions.push(question);
                successCount++;
            } else {
                console.warn(`Row ${index + 1} processing returned null or undefined question object`);
                failureCount++;
            }
        } catch (error) {
            console.error(`Error processing row ${index + 1} for ${questionType} question:`, error);
            console.error('Problem row data:', row);
            console.error('Error stack:', error.stack);
            failureCount++;
        }
    });
    
    console.log(`Finished processing ${this.editedData.length} rows:`);
    console.log(`- Successfully processed: ${successCount} questions`);
    console.log(`- Failed to process: ${failureCount} questions`);
    console.log(`- Final processed questions count: ${processedQuestions.length}`);
    
    return processedQuestions;
}

/**
 * Remove the current file
 */
removeFile() {
    this.currentFile = null;
    this.questionData = null;
    this.workbook = null;
    this.editedData = null;
    this.editedHeaders = null;
    this.fileInput.value = '';
    this.fileInfo.classList.add('hidden');
    this.previewElement.innerHTML = '<p class="placeholder-text">File content will appear here after upload</p>';
    
    // Remove sheet navigation if it exists
    if (this.sheetNavContainer) {
        this.sheetNavContainer.remove();
        this.sheetNavContainer = null;
    }
    
    // Hide unsaved changes notification
    this.manageUnsavedChangesNotification('hide');
    
    // Hide the summary section if it exists
    const summarySection = document.getElementById('summary-section');
    if (summarySection) {
        summarySection.classList.add('hidden');
    }
    
    // Clear quiz title if exists
    const quizTitleInput = document.getElementById('quiz-title');
    if (quizTitleInput) {
        quizTitleInput.value = '';
    }
    
    // Clear quiz description if exists
    const quizDescriptionInput = document.getElementById('quiz-description');
    if (quizDescriptionInput) {
        quizDescriptionInput.value = '';
    }
    
    // Disable download and commit buttons
    if (this.downloadBtn) {
        this.downloadBtn.disabled = true;
    }
    if (this.commitBtn) {
        this.commitBtn.disabled = true;
    }
}

    /**
     * Format file size for display
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
     * Escape HTML special characters
     * @param {String} str - String to escape
     * @returns {String} - Escaped string
     */
    escapeHTML(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Show a message to the user
     * @param {String} message - Message to show
     * @param {String} type - Message type (success, error, info)
     */
    showMessage(message, type = 'info') {
        // Create toast message element
        const toast = document.createElement('div');
        toast.className = `toast-message ${type}-message`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas fa-${type === 'success' ? 'check-circle' : (type === 'error' ? 'exclamation-circle' : 'info-circle')}"></i>
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
        if (document.getElementById('toast-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'toast-styles';
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
            
            .success-message {
                border-left: 4px solid #10b981;
            }
            
            .error-message {
                border-left: 4px solid #ef4444;
            }
            
            .info-message {
                border-left: 4px solid #3b82f6;
            }
            
            .toast-icon {
                font-size: 1.5rem;
                margin-right: 12px;
            }
            
            .success-message .toast-icon {
                color: #10b981;
            }
            
            .error-message .toast-icon {
                color: #ef4444;
            }
            
            .info-message .toast-icon {
                color: #3b82f6;
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
            
            /* Add styles for the single correct MA warning */
            .single-correct-ma-container {
                margin-bottom: 15px;
                padding: 12px 15px;
                background-color: #ffedd5;
                border-radius: 6px;
                border: 1px solid #f97316;
            }
            
            .single-correct-ma-container h3 {
                margin: 0 0 8px 0;
                color: #9a3412;
                font-size: 1rem;
                font-weight: 600;
            }
            
            .single-correct-ma-container ul {
                margin: 0;
                padding-left: 20px;
            }
            
            .single-correct-ma-container li {
                color: #7c2d12;
                margin-bottom: 4px;
            }
            
            /* Editable table styles */
            .editable-table .editable-cell {
                transition: all 0.2s ease;
            }
            
            .editable-table .editable-cell:hover {
                background-color: #f0f4ff !important;
                box-shadow: inset 0 0 0 1px #4a6cf7;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Get the current file
     * @returns {File} - The current file
     */
    getCurrentFile() {
        return this.currentFile;
    }
    
    /**
     * Get the processed question data
     * @returns {Array} - Processed question data
     */
    getQuestionData() {
        return this.questionData;
    }

    /**
     * Check if there are any validation errors
     * @returns {Boolean} - True if there are validation errors
     */
    hasErrors() {
        return this.hasValidationErrors;
    }
    
    /**
     * Update the original question data to persist changes across tab switches
     * @param {Number} row - Row index
     * @param {Number} col - Column index
     * @param {String} newValue - New cell value
     */
    updateOriginalQuestionData(row, col, newValue) {
        // Only proceed if we have question data
        if (!this.questionData || row >= this.questionData.length) {
            return;
        }
        
        // Update the original question data
        if (this.questionData[row] && col < this.questionData[row].length) {
            this.questionData[row][col] = newValue;
        }
        
        // If we have a workbook, update the sheet data as well
        if (this.workbook && this.currentSheetIndex !== undefined) {
            const sheetName = this.workbook.SheetNames[this.currentSheetIndex];
            if (sheetName) {
                const sheet = this.workbook.Sheets[sheetName];
                if (sheet) {
                    // Convert row/col to Excel cell reference (e.g., A1, B2)
                    const cellRef = XLSX.utils.encode_cell({r: row + 1, c: col}); // +1 for header row
                    
                    // Update the cell in the sheet
                    sheet[cellRef] = { t: 's', v: newValue };
                }
            }
        }
        
        // If the app has a fileHandler instance, update its processed data
        if (window.app && window.app.fileHandler && window.app.fileHandler.processedData) {
            // Determine the question type from the current sheet
            let questionType = null;
            if (this.workbook && this.currentSheetIndex !== undefined) {
                const sheetName = this.workbook.SheetNames[this.currentSheetIndex];
                if (sheetName) {
                    // Try to determine question type from sheet name
                    if (sheetName.includes('MC')) questionType = 'MC';
                    else if (sheetName.includes('MA')) questionType = 'MA';
                    else if (sheetName.includes('TF')) questionType = 'TF';
                    else if (sheetName.includes('ESS')) questionType = 'ESS';
                    else if (sheetName.includes('FIB')) questionType = 'FIB';
                }
            }
            
            // If we found a question type, update the corresponding data
            if (questionType && window.app.fileHandler.processedData[questionType]) {
                // Find and update the corresponding row in the processed data
                for (let i = 0; i < window.app.fileHandler.processedData[questionType].length; i++) {
                    const processedRow = window.app.fileHandler.processedData[questionType][i];
                    // Check if this is the same row (simple heuristic - check first few cells)
                    let isSameRow = true;
                    for (let j = 0; j < Math.min(3, processedRow.length); j++) {
                        if (j !== col && processedRow[j] !== this.questionData[row][j]) {
                            isSameRow = false;
                            break;
                        }
                    }
                    
                    if (isSameRow) {
                        // Update the cell in the processed data
                        window.app.fileHandler.processedData[questionType][i][col] = newValue;
                        
                        // Also update the corresponding question in the 'all' array
                        for (let k = 0; k < window.app.fileHandler.processedData.all.length; k++) {
                            const allQuestion = window.app.fileHandler.processedData.all[k];
                            if (allQuestion.id === window.app.fileHandler.processedData[questionType][i].id) {
                                // Update the data array in the 'all' question
                                if (allQuestion.data && col < allQuestion.data.length) {
                                    allQuestion.data[col] = newValue;
                                }
                                break;
                            }
                        }
                        
                        // Update the question processor data
                        if (window.app && window.app.questionProcessor) {
                            // Update the question processor's questions data
                            window.app.questionProcessor.setQuestions(window.app.fileHandler.processedData);
                            
                            // Also update any selected questions that might be affected
                            const selectedQuestions = window.app.questionProcessor.getSelectedQuestions();
                            for (let s = 0; s < selectedQuestions.length; s++) {
                                const selectedQ = selectedQuestions[s];
                                if (selectedQ.id === window.app.fileHandler.processedData[questionType][i].id) {
                                    // Update the data array in the selected question
                                    if (selectedQ.data && col < selectedQ.data.length) {
                                        selectedQ.data[col] = newValue;
                                    }
                                }
                            }
                        }
                        
                        break;
                    }
                }
            }
        }
    }

    /**
 * Update error notifications without redrawing the table
 * This method extracts error detection logic from displayTable but doesn't redraw the table
 */
updateErrorNotificationsOnly() {
    // Get current table data
    const table = this.previewElement.querySelector('table');
    if (!table) return;
    
    // Get headers
    const headerCells = table.querySelectorAll('thead th');
    const headers = Array.from(headerCells)
        .map(th => th.textContent)
        .filter((_, i) => i > 0); // Skip the row number header
    
    // Get rows
    const rows = [];
    const tableRows = table.querySelectorAll('tbody tr');
    tableRows.forEach(tr => {
        const rowData = [];
        const cells = tr.querySelectorAll('td');
        // Skip the first cell (row number) in each row
        for (let i = 1; i < cells.length; i++) {
            rowData.push(cells[i].textContent);
        }
        rows.push(rowData);
    });
    
    // Get column indices
    const columnIndices = [];
    const dataCells = tableRows[0]?.querySelectorAll('td');
    // Skip the first cell (row number)
    for (let i = 1; i < dataCells?.length; i++) {
        const originalCol = parseInt(dataCells[i].getAttribute('data-original-col'), 10);
        if (!isNaN(originalCol)) {
            columnIndices.push(originalCol);
        }
    }
    
    // Determine if this is a TF or MA sheet
    const isTFSheet = this.workbook && 
                      this.workbook.SheetNames[this.currentSheetIndex] && 
                      this.workbook.SheetNames[this.currentSheetIndex].includes("TF");
                     
    const isMASheet = this.workbook && 
                      this.workbook.SheetNames[this.currentSheetIndex] && 
                      this.workbook.SheetNames[this.currentSheetIndex].includes("MA");
    
    // Collect all types of errors
    let errors = [];
    let multipleCorrectErrors = [];
    let singleCorrectMAErrors = [];
    let tfErrors = [];
    
    // Check for True/False validation errors
    if (isTFSheet) {
        tfErrors = this.validateTFChoices(headers, rows, columnIndices);
    }
    
    // Identify "tagging" columns
    const taggingColumns = columnIndices.filter(index => 
        headers[columnIndices.indexOf(index)] && 
        (headers[columnIndices.indexOf(index)].toLowerCase().includes("tag") || 
         headers[columnIndices.indexOf(index)].toLowerCase().includes("correct") || 
         headers[columnIndices.indexOf(index)].toLowerCase().includes("incorrect"))
    );
    
    // Find option-tag column pairs
    const tagPairs = [];
    for (let i = 0; i < columnIndices.length; i++) {
        if (taggingColumns.includes(columnIndices[i])) {
            const tagColIndex = columnIndices[i];
            const optionColIndex = columnIndices[i-1]; // Assuming option is previous column
            
            if (optionColIndex !== undefined) {
                tagPairs.push({
                    tagColIndex: tagColIndex,
                    optionColIndex: optionColIndex
                });
            }
        }
    }
    
    // Determine if this is an MC sheet
    const isMCSheet = (this.workbook && 
                       this.workbook.SheetNames[this.currentSheetIndex] && 
                       this.workbook.SheetNames[this.currentSheetIndex].includes("MC")) ||
                      headers.some(header => header && header.includes("MC"));
    
    // Check each row for errors
    rows.forEach((row, rowIndex) => {
        let rowErrors = [];
        
        // Check for MA sheet and question type
        const isMAQuestion = isMASheet || (row.length > 0 && row[0] === "MA");
        const isMCQuestion = isMCSheet || (row.length > 0 && row[0] === "MC");
        const isFIBQuestion = (this.workbook && 
                              this.workbook.SheetNames[this.currentSheetIndex] && 
                              this.workbook.SheetNames[this.currentSheetIndex].includes("FIB")) ||
                             (row.length > 0 && row[0] === "FIB");
        
        if (isMAQuestion) {
            let correctCount = 0;
            
            // Count the number of "correct" values in tagging columns
            taggingColumns.forEach(colIndex => {
                const colPos = columnIndices.indexOf(colIndex);
                if (colPos === -1 || !row[colPos]) return;
                
                const value = row[colPos].toString().trim().toLowerCase();
                if (value === 'correct') {
                    correctCount++;
                }
            });

            // For MA questions, only flag if there are no correct answers
            if (correctCount === 0) {
                singleCorrectMAErrors.push({
                    row: rowIndex + 1,
                    count: correctCount,
                    message: "No correct answers found. Multiple Answer Questions must have at least one correct answer."
                });
            }
        }
        // For MC questions, check for no correct answers or multiple correct answers
        else if (isMCQuestion) {
            let correctCount = 0;
            
            // Count the number of "correct" values in tagging columns
            taggingColumns.forEach(colIndex => {
                const colPos = columnIndices.indexOf(colIndex);
                if (colPos === -1 || !row[colPos]) return;
                
                const value = row[colPos].toString().trim().toLowerCase();
                if (value === 'correct') {
                    correctCount++;
                }
            });

            // If there are no correct answers or multiple correct answers, flag this row
            if (correctCount === 0) {
                multipleCorrectErrors.push({
                    row: rowIndex + 1,
                    count: correctCount,
                    message: "No correct answer selected. Multiple Choice Questions must have exactly one correct answer."
                });
            } else if (correctCount > 1) {
                multipleCorrectErrors.push({
                    row: rowIndex + 1,
                    count: correctCount,
                    message: "Multiple correct answers found. Multiple Choice Questions should only have 1 correct answer."
                });
            }
        }
        // For FIB questions, check if all answers are blank
        else if (isFIBQuestion) {
            let hasValidAnswer = false;
            
            // Check if there are any non-blank answers
            for (let i = 2; i < row.length; i++) {
                if (row[i] && row[i].toString().trim() !== '') {
                    hasValidAnswer = true;
                    break;
                }
            }
            
            if (!hasValidAnswer) {
                errors.push(`Row ${rowIndex + 1}: Fill in the Blank question has no correct answers. At least one answer must be provided.`);
            }
        }
        
        // Check for tagging errors
        tagPairs.forEach(pair => {
            const optionColPos = columnIndices.indexOf(pair.optionColIndex);
            const tagColPos = columnIndices.indexOf(pair.tagColIndex);
            
            if (optionColPos === -1 || tagColPos === -1) return;
            if (!row[optionColPos] || !row[tagColPos]) return;
            
            const optionValue = row[optionColPos].toString().trim();
            const tagValue = row[tagColPos].toString().trim();
            
            // Only validate if the option has a value but the tag is invalid
            if (optionValue && !["correct", "incorrect"].includes(tagValue.toLowerCase())) {
                rowErrors.push(`Row: ${rowIndex + 1}, Column: "${headers[tagColPos]}" has invalid value "${tagValue}" for option "${optionValue}"`);
            }
        });
        
        if (rowErrors.length > 0) {
            errors.push(...rowErrors);
        }
    });
    
    // Clear previous errors
    document.querySelectorAll(".validation-errors-container").forEach(el => el.remove());
    document.querySelectorAll(".multiple-correct-container").forEach(el => el.remove());
    document.querySelectorAll(".single-correct-ma-container").forEach(el => el.remove());
    document.querySelectorAll(".tf-errors-container").forEach(el => el.remove());
    
    // Add TF validation errors if any
    if (tfErrors.length > 0) {
        let tfErrorHtml = '<div class="tf-errors-container" style="margin-bottom: 15px; padding: 12px 15px; background-color: #fee2e2; border-radius: 6px; border: 1px solid #ef4444;">';
        tfErrorHtml += '<h3 style="margin: 0 0 8px 0; color: #b91c1c; font-size: 1rem; font-weight: 600;">True/False Validation Errors:</h3><ul style="margin: 0; padding-left: 20px;">';
        
        tfErrors.forEach(error => {
            tfErrorHtml += `<li style="color: #7f1d1d; margin-bottom: 4px;">${error.message}</li>`;
        });
        
        tfErrorHtml += '</ul></div>';

        if (this.previewElement.parentNode) {
            this.previewElement.parentNode.insertBefore(
                document.createRange().createContextualFragment(tfErrorHtml),
                this.previewElement
            );
        }
    }
    
    // Add MA validation errors if needed
    if (singleCorrectMAErrors.length > 0) {
        let maErrorHtml = '<div class="single-correct-ma-container" style="margin-bottom: 15px; padding: 12px 15px; background-color: #ffedd5; border-radius: 6px; border: 1px solid #f97316;">';
        maErrorHtml += '<h3 style="margin: 0 0 8px 0; color: #9a3412; font-size: 1rem; font-weight: 600;">Multiple Answer Validation Errors:</h3><ul style="margin: 0; padding-left: 20px;">';
        
        singleCorrectMAErrors.forEach(error => {
            maErrorHtml += `<li style="color: #7c2d12; margin-bottom: 4px;">Row ${error.row}: ${error.message}</li>`;
        });
        
        maErrorHtml += '</ul></div>';

        if (this.previewElement.parentNode) {
            this.previewElement.parentNode.insertBefore(
                document.createRange().createContextualFragment(maErrorHtml),
                this.previewElement
            );
        }
    }
    
    // Add MC validation errors if needed
    if (multipleCorrectErrors.length > 0) {
        let mcErrorHtml = '<div class="multiple-correct-container" style="margin-bottom: 15px; padding: 12px 15px; background-color: #ffedd5; border-radius: 6px; border: 1px solid #f97316;">';
        mcErrorHtml += '<h3 style="margin: 0 0 8px 0; color: #9a3412; font-size: 1rem; font-weight: 600;">Multiple Choice Validation Errors:</h3><ul style="margin: 0; padding-left: 20px;">';
        
        multipleCorrectErrors.forEach(error => {
            mcErrorHtml += `<li style="color: #7c2d12; margin-bottom: 4px;">Row ${error.row}: ${error.message}</li>`;
        });
        
        mcErrorHtml += '</ul></div>';

        if (this.previewElement.parentNode) {
            this.previewElement.parentNode.insertBefore(
                document.createRange().createContextualFragment(mcErrorHtml),
                this.previewElement
            );
        }
    }
    
    // Add error summary
    if (errors.length > 0) {
        let errorHtml = '<div class="validation-errors-container" style="margin-bottom: 15px; padding: 12px 15px; background-color: #fee2e2; border-radius: 6px; border: 1px solid #ef4444;">';
        errorHtml += '<h3 style="margin: 0 0 8px 0; color: #b91c1c; font-size: 1rem; font-weight: 600;">Validation Errors Found:</h3><ul style="margin: 0; padding-left: 20px;">';
        errors.forEach(error => {
            errorHtml += `<li style="color: #7f1d1d; margin-bottom: 4px;">${error}</li>`;
        });
        errorHtml += '</ul></div>';

        if (this.previewElement.parentNode) {
            this.previewElement.parentNode.insertBefore(
                document.createRange().createContextualFragment(errorHtml),
                this.previewElement
            );
        }
    }
    
    // Update validation errors state
    this.hasValidationErrors = errors.length > 0 || multipleCorrectErrors.length > 0 || 
                              singleCorrectMAErrors.length > 0 || tfErrors.length > 0;
    
    // Also update row styles based on errors
    this.updateRowStyles(multipleCorrectErrors, singleCorrectMAErrors, tfErrors);
}

/**
 * Update row styles based on error state without redrawing the table
 * @param {Array} multipleCorrectErrors - Array of rows with multiple correct answers
 * @param {Array} singleCorrectMAErrors - Array of MA rows with only one correct answer
 * @param {Array} tfErrors - Array of TF validation errors
 */
updateRowStyles(multipleCorrectErrors, singleCorrectMAErrors, tfErrors) {
    // Get all rows
    const tableRows = this.previewElement.querySelectorAll('tbody tr');
    
    // Reset all row styles first
    tableRows.forEach(row => {
        row.style.borderLeft = '';
    });
    
    // Apply styles for rows with multiple correct MC answers
    multipleCorrectErrors.forEach(error => {
        const rowIndex = error.row - 1; // Convert to 0-based index
        if (tableRows[rowIndex]) {
            tableRows[rowIndex].style.borderLeft = '6px solid #f97316'; // Orange highlight
        }
    });
    
    // Apply styles for MA rows with only one correct answer
    singleCorrectMAErrors.forEach(error => {
        const rowIndex = error.row - 1; // Convert to 0-based index
        if (tableRows[rowIndex]) {
            tableRows[rowIndex].style.borderLeft = '6px solid #f97316'; // Orange highlight
        }
    });
    
    // Apply styles for TF errors (highest priority)
    tfErrors.forEach(error => {
        const rowIndex = error.row - 1; // Convert to 0-based index
        if (tableRows[rowIndex]) {
            tableRows[rowIndex].style.borderLeft = '6px solid #ef4444'; // Red highlight
        }
    });
}

    
    /**
     * Update error notifications after editing
     */
    updateErrorNotifications() {
        // Get current table data
        const table = this.previewElement.querySelector('table');
        if (!table) return;
        
        // Get headers
        const headerCells = table.querySelectorAll('thead th');
        const headers = Array.from(headerCells).map(th => th.textContent);
        
        // Get rows
        const rows = [];
        const tableRows = table.querySelectorAll('tbody tr');
        tableRows.forEach(tr => {
            const rowData = [];
            const cells = tr.querySelectorAll('td');
            cells.forEach(td => {
                rowData.push(td.textContent);
            });
            rows.push(rowData);
        });
        
        // Get column indices
        const columnIndices = [];
        tableRows[0]?.querySelectorAll('td').forEach(td => {
            const originalCol = parseInt(td.getAttribute('data-original-col'), 10);
            if (!isNaN(originalCol)) {
                columnIndices.push(originalCol);
            }
        });
        
        // Determine if this is a TF or MA sheet
        const isTFSheet = this.workbook && 
                         this.workbook.SheetNames[this.currentSheetIndex] && 
                         this.workbook.SheetNames[this.currentSheetIndex].includes("TF");
                         
        const isMASheet = this.workbook && 
                         this.workbook.SheetNames[this.currentSheetIndex] && 
                         this.workbook.SheetNames[this.currentSheetIndex].includes("MA");
        
        // Re-display the table with updated validation
        this.displayTable(headers, rows, columnIndices, isTFSheet, isMASheet);
    }
}

// Initialize when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Create global instance of ExcelFilePreview
    if (!window.excelFilePreview) {
        window.excelFilePreview = new ExcelFilePreview();
        
        // Initialize with default element IDs
        window.excelFilePreview.initialize({
            dropArea: document.getElementById('dropArea'),
            fileInput: document.getElementById('excelFile'),
            fileInfo: document.getElementById('fileInfo'),
            fileName: document.getElementById('file-name'),
            fileSize: document.getElementById('file-size'),
            removeFileBtn: document.getElementById('removeFile'),
            previewElement: document.getElementById('csv-preview') // Target the CSV preview element
        });
    }
});