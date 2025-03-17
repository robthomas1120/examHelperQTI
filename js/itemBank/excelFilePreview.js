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
        buttonContainer.style.cssText = 'margin-top: 15px; text-align: right;';

        // Create download button
        this.downloadBtn = document.createElement('button');
        this.downloadBtn.id = 'download-edited-file-btn';
        this.downloadBtn.className = 'download-btn';
        this.downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download Edited File';
        this.downloadBtn.style.cssText = `
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
        this.downloadBtn.addEventListener('mouseenter', () => {
            this.downloadBtn.style.backgroundColor = '#3451b2';
        });
        this.downloadBtn.addEventListener('mouseleave', () => {
            this.downloadBtn.style.backgroundColor = '#4a6cf7';
        });
        this.downloadBtn.addEventListener('click', this.downloadEditedFile);
        this.downloadBtn.disabled = true;
        
        // Add download button to container
        buttonContainer.appendChild(this.downloadBtn);
        
        // Add button container after the preview element
        if (this.previewElement && this.previewElement.parentNode) {
            this.previewElement.parentNode.insertBefore(buttonContainer, this.previewElement.nextSibling);
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
        try {
            // Read file as array buffer
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            
            // Parse workbook
            this.workbook = XLSX.read(arrayBuffer, { type: 'array' });
            
            // Get all sheet names (skip first sheet if it's Instructions)
            const firstSheetName = this.workbook.SheetNames[0].toLowerCase();
            const startIndex = (firstSheetName === 'instructions' || firstSheetName.includes('instruction')) ? 1 : 0;
            
            // Make sure we have valid sheets
            if (this.workbook.SheetNames.length <= startIndex) {
                throw new Error('Excel file does not contain any data sheets');
            }
            
            // Get sheet names to display
            const sheetNames = this.workbook.SheetNames.slice(startIndex);
            
            // Create sheet navigation
            this.createSheetNavigation(sheetNames);
            
            // Set current sheet index to display first non-instruction sheet
            this.currentSheetIndex = startIndex;
            
            // Display the first non-skipped sheet
            this.displaySheet(this.currentSheetIndex);
            
            // Return processed data for all sheets
            return this.processAllSheets(startIndex);
        } catch (error) {
            console.error('Error processing Excel file:', error);
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
            const headers = jsonData[0].map(header => header || '');
            
            // Get data rows (skip first row)
            const rows = jsonData.slice(1);
            
            // Filter out completely empty rows
            const nonEmptyRows = rows.filter(row => 
                row.some(cell => cell !== null && cell !== undefined && cell !== '')
            );
            
            // Save a copy of the data for editing
            this.editedData = JSON.parse(JSON.stringify(nonEmptyRows));
            
            // Find non-empty columns
            const nonEmptyColumnIndices = this.findNonEmptyColumnIndices(headers, nonEmptyRows);
            
            // Filter headers to only include non-empty columns
            const filteredHeaders = nonEmptyColumnIndices.map(index => headers[index] || `Column ${index + 1}`);
            this.editedHeaders = filteredHeaders;
            
            // Check if this is a MA (Multiple Answer) sheet
            const isMASheet = sheetName.toUpperCase().includes('MA') || 
                             sheetName.toLowerCase().includes('multiple answer');
            
            // Display table
            this.displayTable(filteredHeaders, nonEmptyRows, nonEmptyColumnIndices, false, isMASheet);
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
     * @param {Array} headers - Table headers
     * @param {Array} rows - Table rows
     * @param {Array} columnIndices - Indices of columns to display
     * @param {Boolean} isTFSheet - Whether this is a True/False sheet
     * @param {Boolean} isMASheet - Whether this is a Multiple Answer sheet
     */
    displayTable(headers, rows, columnIndices, isTFSheet = false, isMASheet = false) {
        // Limit preview to 10 rows
        const previewRows = rows.slice(0, 10);
        
        let tableHtml = '<table class="editable-table" style="width: 100%; border-collapse: collapse;">';
        
        // Table header
        tableHtml += '<thead><tr>';
        headers.forEach(header => {
            tableHtml += `<th style="padding: 10px; background-color: #f3f4f6; border: 1px solid #e5e7eb; text-align: left;">${header}</th>`;
        });
        tableHtml += '</tr></thead>';
        
        // Table body
        tableHtml += '<tbody>';
        let errors = [];
        let multipleCorrectErrors = [];
        let singleCorrectMAErrors = []; // New array for MA questions with only 1 correct answer
        
        // Identify "tagging" columns
        const taggingColumns = columnIndices.filter(index => 
            headers[index] && (headers[index].toLowerCase().includes("tag") || 
                               headers[index].toLowerCase().includes("correct") ||
                               headers[index].toLowerCase().includes("incorrect"))
        );
        
        console.log("Detected tagging columns:", taggingColumns);

        // Find option-tag column pairs
        // Assuming the structure is [option1, tag1, option2, tag2, ...]
        const tagPairs = [];
        for (let i = 0; i < columnIndices.length; i++) {
            if (taggingColumns.includes(columnIndices[i])) {
                // This is a tag column, check if the previous column is an option
                const tagColIndex = columnIndices[i];
                const optionColIndex = columnIndices[i-1]; // Assuming the option is always the previous column
                
                if (optionColIndex !== undefined) {
                    tagPairs.push({
                        tagColIndex: tagColIndex,
                        optionColIndex: optionColIndex
                    });
                }
            }
        }
        
        // Determine if this is an MC (Multiple Choice) sheet
        const isMCSheet = (this.workbook && this.workbook.SheetNames[this.currentSheetIndex] && 
                         this.workbook.SheetNames[this.currentSheetIndex].includes("MC")) ||
                         headers.some(header => header && header.includes("MC"));
        
        previewRows.forEach((row, rowIndex) => {
            let rowErrors = [];
            let rowStyle = "";
            let isMultipleCorrect = false;
            let isSingleCorrectMA = false;
            
            // Check for MA sheet and question type
            const isMAQuestion = isMASheet || (row.length > 0 && row[0] === "MA");
            
            if (isMAQuestion) {
                let correctCount = 0;
                
                // Count the number of "correct" values in tagging columns
                taggingColumns.forEach(colIndex => {
                    if (!row[colIndex]) return;
                    const value = row[colIndex].toString().trim().toLowerCase();
                    if (value === 'correct') {
                        correctCount++;
                    }
                });

                // For MA questions, check if there's only 1 correct answer
                if (correctCount === 1) {
                    isSingleCorrectMA = true;
                    rowStyle = 'border-left: 6px solid #f97316;'; // Orange highlight on the left side
                    singleCorrectMAErrors.push({
                        row: rowIndex + 1,
                        count: correctCount
                    });
                }
            }
            // For MC questions, check how many "correct" values exist in the row
            else if (isMCSheet || (row.length > 0 && row[0] === "MC")) {
                let correctCount = 0;
                
                // Count the number of "correct" values in tagging columns
                taggingColumns.forEach(colIndex => {
                    if (!row[colIndex]) return;
                    const value = row[colIndex].toString().trim().toLowerCase();
                    if (value === 'correct') {
                        correctCount++;
                    }
                });

                // If there are multiple correct answers, flag this row
                if (correctCount > 1) {
                    isMultipleCorrect = true;
                    rowStyle = 'border-left: 6px solid #f97316;'; // Orange highlight on the left side
                    multipleCorrectErrors.push({
                        row: rowIndex + 1,
                        count: correctCount
                    });
                }
            }
        
            // Check for tagging errors
            tagPairs.forEach(pair => {
                if (!row[pair.optionColIndex] || !row[pair.tagColIndex]) return;
                
                const optionValue = row[pair.optionColIndex].toString().trim();
                const tagValue = row[pair.tagColIndex].toString().trim();
                
                // Only validate if the option has a value but the tag is invalid
                if (optionValue && !["correct", "incorrect"].includes(tagValue.toLowerCase())) {
                    rowErrors.push(`Row: ${rowIndex + 1}, Column: "${headers[columnIndices.indexOf(pair.tagColIndex)]}" has invalid value "${tagValue}" for option "${optionValue}"`);
                }
            });
            
            tableHtml += `<tr style="background-color: ${rowIndex % 2 === 0 ? 'white' : '#f9fafb'}; ${rowStyle}" data-row-id="${rowIndex}">`;
        
            columnIndices.forEach((colIndex, cellIndex) => {
                const value = row[colIndex] !== undefined ? row[colIndex].toString().trim() : '';
                let cellStyle = '';
        
                // Apply standard styling
                if (value.toLowerCase() === 'correct') {
                    cellStyle = 'color: #10b981; font-weight: 500;'; // Green for correct
                } else if (value.toLowerCase() === 'incorrect') {
                    cellStyle = 'color: #ef4444; font-weight: 500;'; // Red for incorrect
                }
        
                // Add error highlighting for tag cells
                if (taggingColumns.includes(colIndex)) {
                    // Find the corresponding option column
                    const pairInfo = tagPairs.find(p => p.tagColIndex === colIndex);
                    if (pairInfo) {
                        const optionColIndex = pairInfo.optionColIndex;
                        const optionValue = row[optionColIndex] !== undefined ? row[optionColIndex].toString().trim() : '';
                        
                        // Only highlight if option exists but tag is invalid
                        if (optionValue && !["correct", "incorrect"].includes(value.toLowerCase())) {
                            cellStyle += ' background-color: #fee2e2; color: #b91c1c; font-weight: 500;'; // Red highlight
                        }
                    }
                }
        
                // Make the cell editable with appropriate attributes
                tableHtml += `
                    <td 
                        style="padding: 8px; border: 1px solid #e5e7eb; ${cellStyle}; cursor: pointer;" 
                        data-row="${rowIndex}" 
                        data-col="${cellIndex}" 
                        data-original-col="${colIndex}"
                        data-value="${this.escapeHTML(value)}"
                        class="editable-cell"
                        title="Double-click to edit"
                        ondblclick="document.dispatchEvent(new CustomEvent('cell-click', {detail: {row: ${rowIndex}, col: ${cellIndex}, originalCol: ${colIndex}, value: '${this.escapeHTML(value)}'}}))"
                    >${value}</td>`;
            });
        
            tableHtml += '</tr>';
        
            if (rowErrors.length > 0) {
                errors.push(...rowErrors);
            }
        });
        
        tableHtml += '</tbody></table>';
        
        // Clear previous errors
        document.querySelectorAll(".validation-errors-container").forEach(el => el.remove());
        document.querySelectorAll(".multiple-correct-container").forEach(el => el.remove());
        document.querySelectorAll(".single-correct-ma-container").forEach(el => el.remove());
        
        // Add single correct MA errors warning if needed
        if (singleCorrectMAErrors.length > 0) {
            let maErrorHtml = '<div class="single-correct-ma-container" style="margin-bottom: 15px; padding: 12px 15px; background-color: #ffedd5; border-radius: 6px; border: 1px solid #f97316;">';
            maErrorHtml += '<h3 style="margin: 0 0 8px 0; color: #9a3412; font-size: 1rem; font-weight: 600;">Only 1 Correct Answer Found:</h3><ul style="margin: 0; padding-left: 20px;">';
            
            singleCorrectMAErrors.forEach(error => {
                maErrorHtml += `<li style="color: #7c2d12; margin-bottom: 4px;">Row ${error.row}: Contains Only 1 Correct Answer. Multiple Answer Questions should have at least 2 correct answers.</li>`;
            });
            
            maErrorHtml += '</ul></div>';

            if (this.previewElement.parentNode) {
                this.previewElement.parentNode.insertBefore(
                    document.createRange().createContextualFragment(maErrorHtml),
                    this.previewElement
                );
            }
        }
        
        // Add multiple correct answers warning if needed
        if (multipleCorrectErrors.length > 0) {
            let mcErrorHtml = '<div class="multiple-correct-container" style="margin-bottom: 15px; padding: 12px 15px; background-color: #ffedd5; border-radius: 6px; border: 1px solid #f97316;">';
            mcErrorHtml += '<h3 style="margin: 0 0 8px 0; color: #9a3412; font-size: 1rem; font-weight: 600;">Multiple Correct Answers Found:</h3><ul style="margin: 0; padding-left: 20px;">';
            
            multipleCorrectErrors.forEach(error => {
                mcErrorHtml += `<li style="color: #7c2d12; margin-bottom: 4px;">Row ${error.row}: Contains ${error.count} Correct Answers. Multiple Choice Questions should only have 1 correct answer.</li>`;
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
            errorHtml += '<h3 style="margin: 0 0 8px 0; color: #b91c1c; font-size: 1rem; font-weight: 600;">Tagging Errors Found:</h3><ul style="margin: 0; padding-left: 20px;">';
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
        
        this.previewElement.innerHTML = tableHtml;
        
        // Add note if there are more rows
        if (rows.length > 10) {
            const note = document.createElement('p');
            note.style = 'margin-top: 10px; color: #718096; font-style: italic;';
            note.textContent = `Showing 10 of ${rows.length} rows`;
            this.previewElement.appendChild(note);
        }
        
        // Add help text for editing
        const helpText = document.createElement('p');
        helpText.style = 'margin-top: 15px; color: #4a6cf7; font-style: italic;';
        helpText.innerHTML = '<i class="fas fa-info-circle"></i> <strong>Tip:</strong> Double-click any cell to edit its value. Press Enter to save changes or Esc to cancel.';
        this.previewElement.appendChild(helpText);
        
        // Add event listener for cell clicks via custom event
        document.addEventListener('cell-click', (e) => this.handleCellClick(e.detail));
        
        // Enable the download button
        if (this.downloadBtn) {
            this.downloadBtn.disabled = false;
        }
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
        
        // Find the cell that was clicked
        const cell = this.previewElement.querySelector(`td[data-row="${row}"][data-col="${col}"]`);
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
        
        // Update the cell content
        cell.innerHTML = newValue;
        cell.setAttribute('data-value', this.escapeHTML(newValue));
        
        // Update the edited data
        if (this.editedData && this.editedData[row]) {
            this.editedData[row][originalCol] = newValue;
        }
        
        // Clear current edit
        this.currentEditCell = null;
        
        // Enable download button if not already enabled
        if (this.downloadBtn) {
            this.downloadBtn.disabled = false;
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
        if (!this.editedData || !this.editedHeaders) {
            this.showMessage('No data available to download', 'error');
            return;
        }
        
        try {
            // Create workbook
            const wb = XLSX.utils.book_new();
            
            // Create worksheet data by adding headers + edited data
            const wsData = [this.editedHeaders, ...this.editedData];
            
            // Convert to worksheet
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            
            // Add to workbook
            XLSX.utils.book_append_sheet(wb, ws, "Edited_Data");
            
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
        
        // Disable download button
        if (this.downloadBtn) {
            this.downloadBtn.disabled = true;
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