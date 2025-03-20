/**
 * Excel Handler for Quick Convert
 * Handles Excel file with a single sheet containing different question types
 */

class ExcelHandler {
    constructor() {
        this.workbook = null;
        this.previewElement = document.getElementById('csv-preview');
        this.questionData = null;
        this.editedData = null;
        this.currentEditCell = null;
        this.hasValidationErrors = false;
        this.errorMessages = [];
        this.errorContainer = null;
        this.mcErrorContainer = null;
    }

    /**
     * Process Excel file and display preview
     * @param {File} file - Excel file to process
     * @returns {Promise<Array>} - Promise resolving to processed question data
     */
    async processExcelFile(file) {
        try {
            this.errorMessages = [];
            this.hasValidationErrors = false;
            
            // Read file as array buffer
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            
            // Parse workbook
            this.workbook = XLSX.read(arrayBuffer, { type: 'array' });
            
            // Validate we have at least one sheet
            if (this.workbook.SheetNames.length < 1) {
                throw new Error('Excel file must contain at least one sheet');
            }
            
            // Get the first sheet
            const sheetName = this.workbook.SheetNames[0];
            const sheet = this.workbook.Sheets[sheetName];
            
            // Convert to JSON (with headers in row 1)
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            
            // Ensure we have data
            if (jsonData.length < 2) {
                this.previewElement.innerHTML = '<p>No data found in this sheet or invalid format</p>';
                throw new Error('No valid data found in Excel file');
            }
            
            // Store the question data
            this.questionData = jsonData;
            this.editedData = JSON.parse(JSON.stringify(jsonData)); // Deep copy
            
            // Create error container if it doesn't exist
            this.createErrorContainer();
            
            // Display the data
            this.displayData();
            
            // Validate data to show errors immediately
            this.validateData();
            
            // Return processed data
            return this.processQuestionData();
        } catch (error) {
            console.error('Error processing Excel file:', error);
            this.previewElement.innerHTML = `<p class="error-text">Error processing Excel file: ${error.message}</p>`;
            throw error;
        }
    }

    /**
     * Create error container for displaying validation errors
     */
    createErrorContainer() {
        // Check if regular error container already exists
        let errorContainer = document.getElementById('error-container');
        
        if (!errorContainer) {
            // Create regular error container
            errorContainer = document.createElement('div');
            errorContainer.id = 'error-container';
            errorContainer.className = 'error-container';
            errorContainer.style.cssText = `
                margin-bottom: 15px;
                padding: 12px 15px;
                background-color: #fee2e2;
                border-radius: 6px;
                border: 1px solid #ef4444;
                display: none;
            `;
            
            // Insert before preview element
            this.previewElement.parentNode.insertBefore(errorContainer, this.previewElement);
        }
        
        // Check if multiple correct error container already exists
        let mcErrorContainer = document.getElementById('mc-error-container');
        
        if (!mcErrorContainer) {
            // Create multiple correct error container
            mcErrorContainer = document.createElement('div');
            mcErrorContainer.id = 'mc-error-container';
            mcErrorContainer.className = 'mc-error-container';
            mcErrorContainer.style.cssText = `
                margin-bottom: 15px;
                padding: 12px 15px;
                background-color: #ffedd5;
                border-radius: 6px;
                border: 1px solid #f97316;
                display: none;
            `;
            
            // Insert before preview element but after regular error container
            this.previewElement.parentNode.insertBefore(mcErrorContainer, this.previewElement);
        }
        
        this.errorContainer = errorContainer;
        this.mcErrorContainer = mcErrorContainer;
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

    displayData() {
        if (!this.questionData || this.questionData.length < 1) {
            this.previewElement.innerHTML = '<p>No valid data found</p>';
            return;
        }
    
        // Inject CSS for sticky headers directly
        const styleId = 'sticky-header-styles';
        if (!document.getElementById(styleId)) {
            const styleElement = document.createElement('style');
            styleElement.id = styleId;
            styleElement.textContent = `
                .sticky-header-cell {
                    position: sticky !important;
                    top: 0 !important;
                    z-index: 100 !important;
                    background-color: #f3f4f6 !important;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
                }
                .table-wrapper {
                    max-height: 70vh !important; 
                    overflow-y: auto !important;
                    overflow-x: auto !important;
                    border: 1px solid #e5e7eb;
                    border-radius: 4px;
                    width: 100%;
                }
                .data-table {
                    table-layout: fixed !important;
                    width: max-content !important;
                    min-width: 100% !important;
                    border-collapse: separate !important;
                    border-spacing: 0 !important;
                    border: none !important;
                }
                .data-table th {
                    white-space: nowrap;
                    padding: 10px;
                    border: 1px solid #e5e7eb !important;
                    text-align: left;
                }
                /* Make sure all columns from the table body align with header */
                .data-table tbody td {
                    border: 1px solid #e5e7eb;
                    padding: 6px;
                }
                /* Ensure table takes full width */
                #csv-preview {
                    width: 100%;
                    overflow: visible;
                }
            `;
            document.head.appendChild(styleElement);
        }
    
        // Get all data rows
        const dataRows = this.questionData;
        
        // Find the maximum number of columns across all rows
        let maxColumns = 0;
        dataRows.forEach(row => {
            maxColumns = Math.max(maxColumns, row.length);
        });
    
        // Create fixed headers with one column for each possible cell
        const headers = ['#', 'Exam Type', 'Question'];
        // Add empty headers for remaining columns
        for (let i = 3; i < maxColumns; i++) {
            headers.push(''); // Empty header cells instead of numbers
        }
    
        // Create main structure for the preview only
        let fullHtml = '';
        
        // Create a wrapper div with scrolling capability
        fullHtml += '<div class="table-wrapper">';
        fullHtml += '<table class="data-table">';
        
        // Sticky header
        fullHtml += '<thead>';
        fullHtml += '<tr>';
        headers.forEach((header, index) => {
            fullHtml += `<th class="sticky-header-cell">${header}</th>`;
        });
        fullHtml += '</tr>';
        fullHtml += '</thead>';
        
        // Table body
        fullHtml += '<tbody>';
        
        // Filter out completely empty rows
        const nonEmptyRows = dataRows.filter(row => 
            row.some(cell => cell !== null && cell !== undefined && cell !== '')
        );
    
        nonEmptyRows.forEach((row, rowIndex) => {
            const displayRowNumber = rowIndex + 1;
            fullHtml += `<tr data-row-index="${displayRowNumber}">`;
            
            // Add row number column
            fullHtml += `<td style="background-color: #f3f4f6; font-weight: 500; text-align: center;">${displayRowNumber}</td>`;
            
            // Get question type for this row (if available)
            const questionType = row[0]?.toString().toUpperCase() || '';
            
            // Add data cells
            for (let colIndex = 0; colIndex < maxColumns - 1; colIndex++) {
                // Check if this column exists in the row
                if (colIndex < row.length) {
                    const cell = row[colIndex];
                    const cellValue = (cell !== null && cell !== undefined) ? cell.toString() : '';
                    const isEditable = true;
                    
                    // Determine cell style based on content
                    let cellStyle = ''; 
                    if (cellValue.toLowerCase() === 'correct') {
                        cellStyle += 'color: #10b981; font-weight: 500;'; // Green for correct
                    } else if (cellValue.toLowerCase() === 'incorrect') {
                        cellStyle += 'color: #ef4444; font-weight: 500;'; // Red for incorrect
                    }
                    
                    // Add error highlighting for invalid tag values
                    if (this.isTagColumn(colIndex + 1, questionType) && cellValue && !['correct', 'incorrect', ''].includes(cellValue.toLowerCase())) {
                        cellStyle += ' background-color: #fee2e2;'; // Red background for invalid tags
                    }
                    
                    // Add error highlighting for invalid TF values
                    if (questionType === 'TF' && colIndex === 2 && cellValue && 
                        cellValue.toLowerCase() !== 'true' && cellValue.toLowerCase() !== 'false') {
                        cellStyle += ' background-color: #fee2e2;'; // Red background for invalid TF values
                    }
                    
                    fullHtml += `<td 
                        class="${isEditable ? 'editable-cell' : ''}" 
                        data-row="${displayRowNumber}" 
                        data-col="${colIndex}" 
                        data-question-type="${questionType}"
                        data-value="${this.escapeHTML(cellValue)}" 
                        style="${cellStyle}"
                        ${isEditable ? 'contenteditable="true"' : ''}
                    >${cellValue}</td>`;
                } else {
                    // Add an empty cell to maintain table structure
                    fullHtml += `<td 
                        class="editable-cell" 
                        data-row="${displayRowNumber}" 
                        data-col="${colIndex}" 
                        data-value=""
                        contenteditable="true"
                    ></td>`;
                }
            }
            
            fullHtml += '</tr>';
        });
        
        fullHtml += '</tbody>';
        fullHtml += '</table>';
        fullHtml += '</div>';
        
        // Update preview
        this.previewElement.innerHTML = fullHtml;
        
        // Create other UI elements outside the preview div
        this.createErrorContainers();
        this.createTipMessageAndDownloadButton();
        
        // Add event listeners for cell editing
        this.addCellEditListeners();
        
        // Update the cell editing event listeners to use double-click
        this.updateCellEditListeners();
        
        // Force browser to recalculate layout to ensure sticky headers work
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);
    }

    /**
     * Create error containers for displaying validation errors
     */
    createErrorContainers() {
        // Check if regular error container already exists
        let errorContainer = document.getElementById('error-container');
        
        if (!errorContainer) {
            // Create regular error container
            errorContainer = document.createElement('div');
            errorContainer.id = 'error-container';
            errorContainer.className = 'error-container';
            errorContainer.style.cssText = `
                margin-bottom: 15px;
                padding: 12px 15px;
                background-color: #fee2e2;
                border-radius: 6px;
                border: 1px solid #ef4444;
                display: none;
            `;
            
            // Insert at the beginning of the card
            const cardElement = this.previewElement.closest('.card');
            if (cardElement) {
                cardElement.insertBefore(errorContainer, cardElement.querySelector('h2').nextSibling);
            }
        }
        
        // Check if multiple correct error container already exists
        let mcErrorContainer = document.getElementById('mc-error-container');
        
        if (!mcErrorContainer) {
            // Create multiple correct error container
            mcErrorContainer = document.createElement('div');
            mcErrorContainer.id = 'mc-error-container';
            mcErrorContainer.className = 'mc-error-container';
            mcErrorContainer.style.cssText = `
                margin-bottom: 15px;
                padding: 12px 15px;
                background-color: #ffedd5;
                border-radius: 6px;
                border: 1px solid #f97316;
                display: none;
            `;
            
            // Insert after the regular error container
            const cardElement = this.previewElement.closest('.card');
            if (cardElement && errorContainer.parentNode) {
                errorContainer.parentNode.insertBefore(mcErrorContainer, errorContainer.nextSibling);
            }
        }
        
        this.errorContainer = errorContainer;
        this.mcErrorContainer = mcErrorContainer;
    }

    /**
     * Create tip message and download button
     */
    createTipMessageAndDownloadButton() {
        // Get the card element
        const cardElement = this.previewElement.closest('.card');
        if (!cardElement) return;
        
        // Create tip message if it doesn't exist
        let tipBox = document.getElementById('tip-box');
        if (!tipBox) {
            tipBox = document.createElement('div');
            tipBox.id = 'tip-box';
            tipBox.className = 'tip-box';
            tipBox.style.cssText = `
                margin-bottom: 15px;
                padding: 12px 15px;
                background-color: #e0f2fe;
                border-radius: 6px;
                border: 1px solid #0ea5e9;
            `;
            tipBox.innerHTML = '<p style="margin: 0; color: #0c4a6e;"><i class="fas fa-lightbulb" style="margin-right: 8px;"></i><strong>Tip:</strong> Double-click on cells to edit. Press Enter to save your changes.</p>';
            
            // Insert before the preview element
            cardElement.insertBefore(tipBox, this.previewElement);
        }
        
        // Create download button container if it doesn't exist
        let downloadContainer = document.getElementById('download-container');
        if (!downloadContainer) {
            downloadContainer = document.createElement('div');
            downloadContainer.id = 'download-container';
            downloadContainer.style.cssText = `
                margin-top: 15px;
                margin-bottom: 15px;
                text-align: right;
            `;
            
            const downloadBtn = document.createElement('button');
            downloadBtn.id = 'downloadExcelBtn';
            downloadBtn.className = 'secondary-btn';
            downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download Edited Excel';
            
            // Add event listener for download button
            downloadBtn.addEventListener('click', () => this.downloadEditedFile());
            
            downloadContainer.appendChild(downloadBtn);
            
            // Insert AFTER the preview element
            cardElement.insertBefore(downloadContainer, this.previewElement.nextSibling);
        }
    }

    /**
     * Update cell edit listeners to use double-click
     */
    updateCellEditListeners() {
        const cells = this.previewElement.querySelectorAll('.editable-cell');
        
        cells.forEach(cell => {
            // Make cells initially non-editable
            cell.contentEditable = 'false';
            
            // Add double-click listener
            cell.addEventListener('dblclick', () => {
                // Make the cell editable on double-click
                cell.contentEditable = 'true';
                cell.focus();
                
                // Change outline to indicate editing mode
                cell.style.outline = '2px solid #16a34a'; // Green outline for editing mode
                cell.style.outlineOffset = '-2px';
                
                // Select all text when double-clicked
                const range = document.createRange();
                range.selectNodeContents(cell);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            });
        });
    }

    /**
     * Check if a column is a tag column (for correct/incorrect values)
     * @param {number} colIndex - Column index
     * @param {string} questionType - Question type (MC, MA, etc.)
     * @returns {boolean} - True if it's a tag column
     */
    isTagColumn(colIndex, questionType) {
        // Only MC and MA questions have tag columns
        if (questionType !== 'MC' && questionType !== 'MA') {
            return false;
        }
        // For MC and MA questions, every even-numbered column after column 2 is a tag column
        return colIndex > 2 && colIndex % 2 === 0;
    }

    /**
     * Update the error display
     */
    updateErrorDisplay() {
        if (!this.errorContainer || !this.mcErrorContainer) return;
        
        // Separate regular validation errors from multiple correct answer errors
        const regularErrors = [];
        const multipleCorrectErrors = [];
        const mcErrorRows = new Set(); // Track row numbers with MC/MA errors only
        
        this.errorMessages.forEach(error => {
            if (error.includes('Multiple Choice question must have exactly 1 correct answer') || 
                error.includes('Multiple Answer question must have at least 2 correct answers')) {
                multipleCorrectErrors.push(error);
                
                // Extract row number from error message (assuming format "Row X: ...")
                const rowMatch = error.match(/Row (\d+):/);
                if (rowMatch && rowMatch[1]) {
                    // The rowMatch[1] is a string, so parse it to integer
                    mcErrorRows.add(parseInt(rowMatch[1]));
                }
            } else {
                regularErrors.push(error);
            }
        });
        
        // Highlight rows with multiple choice/answer errors
        this.highlightErrorRows(mcErrorRows);
        
        // Regular validation errors
        if (regularErrors.length > 0) {
            let errorHtml = '<h3 style="margin: 0 0 8px 0; color: #991b1b; font-size: 1rem; font-weight: 600;">Validation Errors:</h3>';
            errorHtml += '<ul style="margin: 0; padding-left: 20px;">';
            regularErrors.forEach(error => {
                errorHtml += `<li style="color: #7f1d1d; margin-bottom: 4px;">${error}</li>`;
            });
            errorHtml += '</ul>';
            
            this.errorContainer.innerHTML = errorHtml;
            this.errorContainer.style.display = 'block';
        } else {
            this.errorContainer.style.display = 'none';
            this.errorContainer.innerHTML = '';
        }
        
        // Multiple correct answer errors in separate orange container
        if (multipleCorrectErrors.length > 0) {
            let mcErrorHtml = '<h3 style="margin: 0 0 8px 0; color: #9a3412; font-size: 1rem; font-weight: 600;">Multiple Correct Answer Error:</h3>';
            mcErrorHtml += '<ul style="margin: 0; padding-left: 20px;">';
            multipleCorrectErrors.forEach(error => {
                mcErrorHtml += `<li style="color: #7c2d12; margin-bottom: 4px;">${error}</li>`;
            });
            mcErrorHtml += '</ul>';
            
            this.mcErrorContainer.innerHTML = mcErrorHtml;
            this.mcErrorContainer.style.display = 'block';
        } else {
            this.mcErrorContainer.style.display = 'none';
            this.mcErrorContainer.innerHTML = '';
        }
    }
    
    /**
     * Highlight rows with errors - FIXED VERSION
     * @param {Set<number>} errorRows - Set of row numbers with errors
     */
    highlightErrorRows(errorRows) {
        // First, remove any existing error highlighting from all table rows
        const allTableRows = this.previewElement.querySelectorAll('table.data-table tr');
        allTableRows.forEach(row => {
            row.style.backgroundColor = '';
        });
        
        // Then highlight rows with errors
        errorRows.forEach(rowNum => {
            // We need to find the actual displayed row that corresponds to the data row where the error was found
            // The issue was that we need to find the displayed row that has cells with data-row attribute equal to rowNum
            
            // First, get all cells with the specific data-row attribute
            const cellsForRow = this.previewElement.querySelectorAll(`td[data-row="${rowNum}"]`);
            
            // If we found matching cells, highlight their parent row
            if (cellsForRow.length > 0) {
                // Get the parent tr element of the first matching cell
                const rowToHighlight = cellsForRow[0].closest('tr');
                if (rowToHighlight) {
                    // Add a distinct orange background to highlight the row
                    rowToHighlight.style.backgroundColor = '#ffcb8d'; // Brighter orange color
                }
            }
        });
    }
    
    /**
     * Add event listeners for cell editing
     */
    addCellEditListeners() {
        const cells = this.previewElement.querySelectorAll('.editable-cell');
        
        // Track the currently active cell
        this.activeCell = null;
        
        cells.forEach(cell => {
            // Add single-click handler for highlighting
            cell.addEventListener('click', () => {
                // Remove highlight from previously active cell
                if (this.activeCell && this.activeCell !== cell) {
                    this.activeCell.style.outline = 'none';
                }
                
                // Highlight current cell
                cell.style.outline = '2px solid #3b82f6'; // Blue outline
                cell.style.outlineOffset = '-2px';
                this.activeCell = cell;
            });
            
            // Handle key events
            cell.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    cell.blur(); // Trigger the blur event which saves changes
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cell.textContent = cell.getAttribute('data-value');
                    cell.blur();
                }
            });

            // Save changes on blur
            cell.addEventListener('blur', () => {
                const row = parseInt(cell.getAttribute('data-row'));
                const col = parseInt(cell.getAttribute('data-col'));
                const newValue = cell.textContent.trim();
                const questionType = cell.getAttribute('data-question-type') || '';
                
                // Update edited data
                if (!this.editedData[row-1]) {
                    this.editedData[row-1] = [];
                }
                this.editedData[row-1][col] = newValue;
                
                // Update cell attributes
                cell.setAttribute('data-value', this.escapeHTML(newValue));
                
                // Make cell non-editable again after editing
                cell.contentEditable = 'false';
                
                // Keep the highlight but remove editing style
                if (this.activeCell === cell) {
                    cell.style.outline = '2px solid #3b82f6';
                    cell.style.outlineOffset = '-2px';
                } else {
                    cell.style.outline = 'none';
                }
                
                // Update cell styling
                if (this.isTagColumn(col + 1, questionType)) {
                    const lowerValue = newValue.toLowerCase();
                    if (lowerValue === 'correct') {
                        cell.style.color = '#10b981';
                        cell.style.backgroundColor = '';
                        cell.style.fontWeight = '500';
                    } else if (lowerValue === 'incorrect') {
                        cell.style.color = '#ef4444';
                        cell.style.backgroundColor = '';
                        cell.style.fontWeight = '500';
                    } else if (newValue) {
                        cell.style.color = '';
                        cell.style.backgroundColor = '#fee2e2';
                        cell.style.fontWeight = 'normal';
                    } else {
                        cell.style.color = '';
                        cell.style.backgroundColor = '';
                        cell.style.fontWeight = 'normal';
                    }
                }
                
                // Handle TF answer validation - highlight invalid TF answers
                if (questionType === 'TF' && col === 2) { // Column 2 is the answer column for TF questions
                    const lowerValue = newValue.toLowerCase();
                    if (newValue && lowerValue !== 'true' && lowerValue !== 'false') {
                        cell.style.backgroundColor = '#fee2e2'; // Red background for invalid TF value
                    } else {
                        cell.style.backgroundColor = '';
                    }
                }
                
                // Store previous validation state to detect changes
                const previousValidationState = this.hasValidationErrors;
                
                // Revalidate data and update error displays
                this.validateData();
                
                // If validation state has changed, dispatch an event to notify the main script
                if (previousValidationState !== this.hasValidationErrors) {
                    // Dispatch a custom event with the new validation state
                    const event = new CustomEvent('validationStateChanged', {
                        detail: { 
                            hasErrors: this.hasValidationErrors 
                        },
                        bubbles: true
                    });
                    this.previewElement.dispatchEvent(event);
                }
            });
        });
        
        // Add click event listener to document to clear highlight when clicking outside
        document.addEventListener('click', (e) => {
            // If click is outside any editable cell
            if (!e.target.closest('.editable-cell') && this.activeCell) {
                this.activeCell.style.outline = 'none';
                this.activeCell = null;
            }
        });
    }

    /**
     * Validate True/False answers in TF questions
     * @param {Object} row - Data row
     * @param {Number} rowNum - Row number for error reporting
     * @param {String} questionType - Question type
     * @returns {Array} - Array of TF validation errors
     */
    validateTFQuestion(row, rowNum, questionType) {
        const tfErrors = [];
        
        // Only validate TF questions
        if (questionType !== 'TF') {
            return tfErrors;
        }
        
        // In this structure, column 2 (index 2) contains the TF answer
        const tfAnswer = row[2] ? row[2].toString().trim().toLowerCase() : '';
        
        // If answer is provided but not 'true' or 'false'
        if (tfAnswer && tfAnswer !== 'true' && tfAnswer !== 'false') {
            tfErrors.push(`Row ${rowNum}: Invalid True/False value "${row[2]}". Only "true" or "false" are accepted.`);
        }
        
        return tfErrors;
    }

    /**
     * Validate the data and show errors
     */
    validateData() {
        this.errorMessages = [];
        this.hasValidationErrors = false;
        
        if (!this.editedData || this.editedData.length < 1) return;
        
        const dataRows = this.editedData; // Include all rows
        const validQuestionTypes = ['MC', 'MA', 'FIB', 'ESS', 'TF'];
        
        dataRows.forEach((row, rowIndex) => {
            const rowNum = rowIndex + 1; // Adjust to display row numbers correctly
            if (!row || row.length < 2) return;
            
            // The first column is the Exam Type in your data structure
            const questionType = row[0]?.toString().toUpperCase(); 
            
            // Skip empty rows
            if (!row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
                return;
            }

            // Check if the question type is valid
            if (questionType && !validQuestionTypes.includes(questionType)) {
                this.errorMessages.push(`Row ${rowNum}: Invalid exam type "${questionType}" - must be one of: MC, MA, FIB, ESS, TF`);
                this.hasValidationErrors = true;
            }
        
            // Only validate correct/incorrect tags for MC and MA
            if (questionType === 'MC' || questionType === 'MA') {
                // Check for invalid tag values
                row.forEach((cell, colIndex) => {
                    if (this.isTagColumn(colIndex + 1, questionType)) {
                        const cellValue = cell?.toString().toLowerCase();
                        if (cellValue && !['correct', 'incorrect'].includes(cellValue)) {
                            this.errorMessages.push(`Row ${rowNum}: Invalid tag value "${cell}" - must be "correct" or "incorrect"`);
                            this.hasValidationErrors = true;
                        }
                    }
                });
        
                // Count correct answers
                let correctCount = 0;
                row.forEach((cell, colIndex) => {
                    if (this.isTagColumn(colIndex + 1, questionType) && cell?.toString().toLowerCase() === 'correct') {
                        correctCount++;
                    }
                });
        
                // Validate based on question type
                if (questionType === 'MC' && correctCount !== 1) {
                    this.errorMessages.push(`Row ${rowNum}: Multiple Choice question must have exactly 1 correct answer`);
                    this.hasValidationErrors = true;
                } else if (questionType === 'MA' && correctCount < 2) {
                    this.errorMessages.push(`Row ${rowNum}: Multiple Answer question must have at least 2 correct answers`);
                    this.hasValidationErrors = true;
                }
            }
            
            // Validate True/False questions
            if (questionType === 'TF') {
                const tfErrors = this.validateTFQuestion(row, rowNum, questionType);
                if (tfErrors.length > 0) {
                    this.errorMessages.push(...tfErrors);
                    this.hasValidationErrors = true;
                }
            }
        });
        
        this.updateErrorDisplay();
    }

    /**
     * Download the edited Excel file
     */
    downloadEditedFile() {
        try {
            // Create a new workbook
            const wb = XLSX.utils.book_new();
            
            // Convert edited data to worksheet
            const ws = XLSX.utils.aoa_to_sheet(this.editedData);
            
            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
            
// Generate Excel file
XLSX.writeFile(wb, "edited_quiz.xlsx");
} catch (error) {
    console.error('Error downloading Excel file:', error);
    alert('Error downloading Excel file: ' + error.message);
}
}

/**
* Process question data for conversion
* @returns {Array} - Processed question data
*/
processQuestionData() {
if (!this.editedData || this.editedData.length < 1) {
    return [];
}

const processedData = {
    MC: [],
    MA: [],
    TF: [],
    ESS: [],
    FIB: [],
    all: []
};

// Process each row (start from index 0 to include the header row)
for (let rowIndex = 0; rowIndex < this.editedData.length; rowIndex++) {
    const row = this.editedData[rowIndex];
    if (!row || row.length < 2) continue;
    
    // Get the question type (first column)
    const questionType = row[0] ? row[0].toString().trim().toUpperCase() : '';
    
    // Skip rows without a valid question type
    if (!['MC', 'MA', 'TF', 'ESS', 'FIB'].includes(questionType)) continue;
    
    // Get the question text (second column)
    const questionText = row[1] ? row[1].toString().trim() : '';
    
    // Skip rows without question text
    if (!questionText) continue;
    
    // Create a question object
    const question = {
        id: `q${rowIndex}`,
        type: questionType,
        text: questionText,
        data: row,
        options: []
    };
    
    // Process options based on question type
    switch (questionType) {
        case 'MC':
        case 'MA':
            // Process options and tags (starting from column 2, in pairs)
            for (let i = 2; i < row.length; i += 2) {
                const option = row[i] ? row[i].toString().trim() : '';
                const tag = (i + 1 < row.length && row[i + 1]) ? row[i + 1].toString().trim().toLowerCase() : '';
                
                // Skip empty options
                if (!option) continue;
                
                question.options.push({
                    text: option,
                    isCorrect: tag === 'correct'
                });
            }
            break;
            
        case 'TF':
            // Get the answer
            const tfAnswer = row[2] ? row[2].toString().trim().toLowerCase() : '';
            question.answer = tfAnswer === 'true';
            break;
            
        case 'FIB':
            // Get all possible answers
            question.answers = [];
            for (let i = 2; i < row.length; i++) {
                const answer = row[i] ? row[i].toString().trim() : '';
                if (answer) {
                    question.answers.push(answer);
                }
            }
            break;
    }
    
    // Add to the appropriate array
    if (processedData[questionType]) {
        processedData[questionType].push(question);
    }
    
    // Add to the all array
    processedData.all.push(question);
}

return processedData;
}

/**
* Check if there are validation errors
* @returns {Boolean} - True if there are validation errors
*/
hasErrors() {
return this.hasValidationErrors;
}

/**
* Escape HTML special characters
* @param {String} text - Text to escape
* @returns {String} - Escaped text
*/
escapeHTML(text) {
return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
}

// Initialize when document is loaded
document.addEventListener('DOMContentLoaded', function() {
// Create global instance of Excel Handler
window.excelHandler = new ExcelHandler();
});