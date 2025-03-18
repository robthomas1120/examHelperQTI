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
        // Check if error container already exists
        let errorContainer = document.getElementById('error-container');
        
        if (!errorContainer) {
            // Create error container
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
        
        this.errorContainer = errorContainer;
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
     * Display the question data in an editable table
     */
    displayData() {
        if (!this.questionData || this.questionData.length < 2) {
            this.previewElement.innerHTML = '<p>No valid data found</p>';
            return;
        }

        // Filter out completely empty rows
        const nonEmptyRows = this.questionData.filter(row => 
            row.some(cell => cell !== null && cell !== undefined && cell !== '')
        );

        if (nonEmptyRows.length < 2) {
            this.previewElement.innerHTML = '<p>No valid data found after filtering empty rows</p>';
            return;
        }

        // Get headers (first row)
        const headers = ['Row', ...nonEmptyRows[0]];

        // Get data rows (skip first row)
        const dataRows = nonEmptyRows.slice(1);

        // Create table
        let tableHtml = '<div class="tip-box" style="margin-bottom: 15px; padding: 10px; background-color: #f0f9ff; border-radius: 6px; border-left: 4px solid #3b82f6;">';
        tableHtml += '<i class="fas fa-info-circle" style="color: #3b82f6; margin-right: 8px;"></i>';
        tableHtml += 'Tip: Double-click any cell to edit its value. Press Enter to save changes or Esc to cancel.';
        tableHtml += '</div>';
        
        tableHtml += '<div class="table-container" style="max-height: 600px;">';
        tableHtml += '<table class="data-table" style="width: 100%; border-collapse: collapse;">';
        
        // Table header
        tableHtml += '<thead><tr>';
        headers.forEach((header, index) => {
            tableHtml += `<th style="padding: 10px; background-color: #f3f4f6; border: 1px solid #e5e7eb; text-align: left; position: sticky; top: 0; z-index: 10;">${header || `Column ${index + 1}`}</th>`;
        });
        tableHtml += '</tr></thead>';
        
        // Table body
        tableHtml += '<tbody>';
        dataRows.forEach((row, rowIndex) => {
            tableHtml += `<tr data-row-index="${rowIndex}">`;
            
            // Add row number column
            tableHtml += `<td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f3f4f6; font-weight: 500; text-align: center;">${rowIndex + 1}</td>`;
            
            row.forEach((cell, colIndex) => {
                const cellValue = cell !== null && cell !== undefined ? cell.toString() : '';
                const isEditable = colIndex > 0; // First column (question type) is not editable
                
                // Determine cell style based on content
                let cellStyle = '';
                if (cellValue.toLowerCase() === 'correct') {
                    cellStyle = 'color: #10b981; font-weight: 500;'; // Green for correct
                } else if (cellValue.toLowerCase() === 'incorrect') {
                    cellStyle = 'color: #ef4444; font-weight: 500;'; // Red for incorrect
                }
                
                tableHtml += `<td 
                    class="${isEditable ? 'editable-cell' : ''}" 
                    data-row="${rowIndex}" 
                    data-col="${colIndex}" 
                    data-value="${this.escapeHTML(cellValue)}" 
                    style="padding: 8px; border: 1px solid #e5e7eb; ${cellStyle}"
                    ${isEditable ? 'contenteditable="true"' : ''}
                >${cellValue}</td>`;
            });
            
            tableHtml += '</tr>';
        });
        
        tableHtml += '</tbody></table></div>';
        
        // Add download button for edited Excel
        tableHtml += '<div style="margin-top: 15px; text-align: right;">';
        tableHtml += '<button id="downloadExcelBtn" class="secondary-btn" style="margin-right: 10px;">';
        tableHtml += '<i class="fas fa-download"></i> Download Edited Excel';
        tableHtml += '</button>';
        tableHtml += '</div>';
        
        // Add table to preview element
        this.previewElement.innerHTML = tableHtml;
        
        // Add event listener for download button
        const downloadBtn = document.getElementById('downloadExcelBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadEditedExcel());
        }
        
        // Add event listeners for editable cells
        this.addEditListeners();
        
        // Validate the data
        this.validateData();
    }
    
    /**
     * Download the edited Excel file
     */
    downloadEditedExcel() {
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
     * Add event listeners for editable cells
     */
    addEditListeners() {
        const editableCells = this.previewElement.querySelectorAll('.editable-cell');
        
        editableCells.forEach(cell => {
            // Focus event
            cell.addEventListener('focus', () => {
                this.startEditing(cell);
            });
            
            // Blur event
            cell.addEventListener('blur', () => {
                this.finishEditing();
            });
            
            // Key events
            cell.addEventListener('keydown', (e) => {
                // Enter key - finish editing
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.finishEditing();
                    
                    // Move to next cell if possible
                    const row = parseInt(cell.getAttribute('data-row'));
                    const col = parseInt(cell.getAttribute('data-col'));
                    const nextCell = this.previewElement.querySelector(`td[data-row="${row}"][data-col="${col + 1}"]`);
                    if (nextCell) {
                        nextCell.focus();
                    }
                }
                
                // Escape key - cancel editing
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.cancelEditing();
                }
                
                // Tab key - move to next cell
                if (e.key === 'Tab') {
                    e.preventDefault();
                    this.finishEditing();
                    
                    const row = parseInt(cell.getAttribute('data-row'));
                    const col = parseInt(cell.getAttribute('data-col'));
                    
                    // If shift is pressed, move to previous cell
                    if (e.shiftKey) {
                        const prevCell = this.previewElement.querySelector(`td[data-row="${row}"][data-col="${col - 1}"]`);
                        if (prevCell && prevCell.classList.contains('editable-cell')) {
                            prevCell.focus();
                        } else {
                            // Try to move to last cell of previous row
                            const prevRow = this.previewElement.querySelector(`tr[data-row-index="${row - 1}"]`);
                            if (prevRow) {
                                const cells = prevRow.querySelectorAll('.editable-cell');
                                if (cells.length) {
                                    cells[cells.length - 1].focus();
                                }
                            }
                        }
                    } else {
                        // Move to next cell
                        const nextCell = this.previewElement.querySelector(`td[data-row="${row}"][data-col="${col + 1}"]`);
                        if (nextCell && nextCell.classList.contains('editable-cell')) {
                            nextCell.focus();
                        } else {
                            // Try to move to first cell of next row
                            const nextRow = this.previewElement.querySelector(`tr[data-row-index="${row + 1}"]`);
                            if (nextRow) {
                                const firstCell = nextRow.querySelector('.editable-cell');
                                if (firstCell) {
                                    firstCell.focus();
                                }
                            }
                        }
                    }
                }
            });
        });
    }

    /**
     * Start editing a cell
     * @param {HTMLElement} cell - The cell to edit
     */
    startEditing(cell) {
        // Get cell data
        const row = parseInt(cell.getAttribute('data-row'));
        const col = parseInt(cell.getAttribute('data-col'));
        const value = cell.getAttribute('data-value');
        
        // Store current edit
        this.currentEditCell = {
            cell,
            row,
            col,
            originalValue: value
        };
        
        // Focus the cell
        cell.focus();
        
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(cell);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    /**
     * Finish editing and save changes
     */
    finishEditing() {
        if (!this.currentEditCell) return;
        
        const { cell, row, col } = this.currentEditCell;
        const newValue = cell.textContent.trim();
        
        // Update the cell attributes
        cell.setAttribute('data-value', this.escapeHTML(newValue));
        
        // Update the edited data
        if (this.editedData && row < this.editedData.length && col < this.editedData[row].length) {
            this.editedData[row][col] = newValue;
        }
        
        // Clear current edit
        this.currentEditCell = null;
        
        // Validate the data
        this.validateData();
    }

    /**
     * Cancel editing and revert changes
     */
    cancelEditing() {
        if (!this.currentEditCell) return;
        
        const { cell, originalValue } = this.currentEditCell;
        
        // Revert to original value
        cell.textContent = originalValue;
        cell.setAttribute('data-value', this.escapeHTML(originalValue));
        
        // Clear current edit
        this.currentEditCell = null;
    }

    /**
     * Validate the question data
     */
    validateData() {
        if (!this.editedData || this.editedData.length < 2) return;
        
        this.errorMessages = [];
        this.hasValidationErrors = false;
        
        // Process each row (skip the first row which contains headers)
        for (let rowIndex = 1; rowIndex < this.editedData.length; rowIndex++) {
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
            
            // Validate based on question type
            switch (questionType) {
                case 'MC':
                    this.validateMCQuestion(row, rowIndex);
                    break;
                case 'MA':
                    this.validateMAQuestion(row, rowIndex);
                    break;
                case 'TF':
                    this.validateTFQuestion(row, rowIndex);
                    break;
                case 'ESS':
                    // No specific validation for essay questions
                    break;
                case 'FIB':
                    this.validateFIBQuestion(row, rowIndex);
                    break;
            }
        }
        
        // Update error display
        this.updateErrorDisplay();
    }

    /**
     * Validate a Multiple Choice question
     * @param {Array} row - The row data
     * @param {Number} rowIndex - The row index
     */
    validateMCQuestion(row, rowIndex) {
        let correctCount = 0;
        let hasOptions = false;
        
        // Check options and tags (starting from column 2, in pairs)
        for (let i = 2; i < row.length; i += 2) {
            const option = row[i] ? row[i].toString().trim() : '';
            const tag = (i + 1 < row.length && row[i + 1]) ? row[i + 1].toString().trim().toLowerCase() : '';
            
            // Skip empty options
            if (!option) continue;
            
            hasOptions = true;
            
            // Check if tag is valid
            if (tag !== 'correct' && tag !== 'incorrect') {
                this.errorMessages.push({
                    type: 'tag_error',
                    message: `Row ${rowIndex + 1}: Invalid tag "${tag}" for option "${option}". Must be "correct" or "incorrect".`,
                    row: rowIndex,
                    col: i + 1
                });
            }
            
            // Count correct answers
            if (tag === 'correct') {
                correctCount++;
            }
        }
        
        // Check if we have options
        if (!hasOptions) {
            this.errorMessages.push({
                type: 'error',
                message: `Row ${rowIndex + 1}: Multiple Choice question must have at least one option.`,
                row: rowIndex,
                col: 2
            });
        }
        
        // Check if we have exactly one correct answer
        if (correctCount === 0) {
            this.errorMessages.push({
                type: 'error',
                message: `Row ${rowIndex + 1}: Multiple Choice question must have one correct answer.`,
                row: rowIndex,
                col: 0
            });
        } else if (correctCount > 1) {
            this.errorMessages.push({
                type: 'multiple_correct',
                message: `Row ${rowIndex + 1}: Multiple Choice question must have only one correct answer, found ${correctCount}.`,
                row: rowIndex,
                col: 0
            });
        }
    }

    /**
     * Validate a Multiple Answer question
     * @param {Array} row - The row data
     * @param {Number} rowIndex - The row index
     */
    validateMAQuestion(row, rowIndex) {
        let correctCount = 0;
        let hasOptions = false;
        
        // Check options and tags (starting from column 2, in pairs)
        for (let i = 2; i < row.length; i += 2) {
            const option = row[i] ? row[i].toString().trim() : '';
            const tag = (i + 1 < row.length && row[i + 1]) ? row[i + 1].toString().trim().toLowerCase() : '';
            
            // Skip empty options
            if (!option) continue;
            
            hasOptions = true;
            
            // Check if tag is valid
            if (tag !== 'correct' && tag !== 'incorrect') {
                this.errorMessages.push({
                    type: 'tag_error',
                    message: `Row ${rowIndex + 1}: Invalid tag "${tag}" for option "${option}". Must be "correct" or "incorrect".`,
                    row: rowIndex,
                    col: i + 1
                });
            }
            
            // Count correct answers
            if (tag === 'correct') {
                correctCount++;
            }
        }
        
        // Check if we have options
        if (!hasOptions) {
            this.errorMessages.push({
                type: 'error',
                message: `Row ${rowIndex + 1}: Multiple Answer question must have at least two options.`,
                row: rowIndex,
                col: 2
            });
        }
        
        // Check if we have at least two correct answers
        if (correctCount < 2) {
            this.errorMessages.push({
                type: 'error',
                message: `Row ${rowIndex + 1}: Multiple Answer question must have at least two correct answers, found ${correctCount}.`,
                row: rowIndex,
                col: 0
            });
        }
    }

    /**
     * Validate a True/False question
     * @param {Array} row - The row data
     * @param {Number} rowIndex - The row index
     */
    validateTFQuestion(row, rowIndex) {
        // Check if we have an answer
        const answer = row[2] ? row[2].toString().trim().toLowerCase() : '';
        
        if (!answer) {
            this.errorMessages.push({
                type: 'error',
                message: `Row ${rowIndex + 1}: True/False question must have an answer.`,
                row: rowIndex,
                col: 2
            });
        } else if (answer !== 'true' && answer !== 'false') {
            this.errorMessages.push({
                type: 'error',
                message: `Row ${rowIndex + 1}: True/False answer must be "true" or "false", found "${answer}".`,
                row: rowIndex,
                col: 2
            });
        }
    }

    /**
     * Validate a Fill in the Blank question
     * @param {Array} row - The row data
     * @param {Number} rowIndex - The row index
     */
    validateFIBQuestion(row, rowIndex) {
        let hasAnswers = false;
        
        // Check if we have at least one answer
        for (let i = 2; i < row.length; i++) {
            const answer = row[i] ? row[i].toString().trim() : '';
            
            if (answer) {
                hasAnswers = true;
                break;
            }
        }
        
        if (!hasAnswers) {
            this.errorMessages.push({
                type: 'error',
                message: `Row ${rowIndex + 1}: Fill in the Blank question must have at least one possible answer.`,
                row: rowIndex,
                col: 2
            });
        }
    }

    /**
     * Update the error display
     */
    updateErrorDisplay() {
        if (!this.errorContainer) return;
        
        // Clear previous errors
        this.errorContainer.innerHTML = '';
        
        // Group errors by type
        const tagErrors = this.errorMessages.filter(error => error.type === 'tag_error');
        const multipleCorrectErrors = this.errorMessages.filter(error => error.type === 'multiple_correct');
        const otherErrors = this.errorMessages.filter(error => error.type !== 'tag_error' && error.type !== 'multiple_correct');
        
        // Set validation error flag
        this.hasValidationErrors = this.errorMessages.length > 0;
        
        // Show/hide error container
        if (this.hasValidationErrors) {
            this.errorContainer.style.display = 'block';
            
            // Create error sections based on error types
            let errorHtml = '';
            
            // Multiple correct answers errors (orange)
            if (multipleCorrectErrors.length > 0) {
                errorHtml += '<div style="margin-bottom: 15px;">';
                errorHtml += '<h3 style="color: #c2410c; margin-top: 0; margin-bottom: 10px;">Multiple Correct Answers Found:</h3>';
                errorHtml += '<ul style="margin: 0; padding-left: 20px;">';
                
                multipleCorrectErrors.forEach(error => {
                    errorHtml += `<li style="color: #9a3412; margin-bottom: 4px;">${error.message}</li>`;
                });
                
                errorHtml += '</ul></div>';
            }
            
            // Tag errors (red)
            if (tagErrors.length > 0) {
                errorHtml += '<div style="margin-bottom: 15px;">';
                errorHtml += '<h3 style="color: #b91c1c; margin-top: 0; margin-bottom: 10px;">Tagging Errors Found:</h3>';
                errorHtml += '<ul style="margin: 0; padding-left: 20px;">';
                
                tagErrors.forEach(error => {
                    errorHtml += `<li style="color: #7c2d12; margin-bottom: 4px;">${error.message}</li>`;
                });
                
                errorHtml += '</ul></div>';
            }
            
            // Other errors
            if (otherErrors.length > 0) {
                errorHtml += '<div>';
                errorHtml += '<h3 style="color: #b91c1c; margin-top: 0; margin-bottom: 10px;">Other Validation Errors:</h3>';
                errorHtml += '<ul style="margin: 0; padding-left: 20px;">';
                
                otherErrors.forEach(error => {
                    errorHtml += `<li style="color: #7c2d12; margin-bottom: 4px;">${error.message}</li>`;
                });
                
                errorHtml += '</ul></div>';
            }
            
            // Add error summary
            this.errorContainer.innerHTML = errorHtml;
        } else {
            this.errorContainer.style.display = 'none';
        }
        
        // Highlight error cells
        this.highlightErrorCells();
    }

    /**
     * Highlight cells with errors
     */
    highlightErrorCells() {
        // Reset all cell highlights
        const cells = this.previewElement.querySelectorAll('td');
        cells.forEach(cell => {
            // Only reset the border style, not other styles
            cell.style.border = '1px solid #e5e7eb';
            cell.style.backgroundColor = '';
        });
        
        // Only highlight cells if there are errors
        if (!this.hasValidationErrors) return;
        
        // Highlight error cells
        this.errorMessages.forEach(error => {
            if (error.row !== undefined && error.col !== undefined) {
                // Find the cell to highlight
                const cell = this.previewElement.querySelector(`td[data-row="${error.row}"][data-col="${error.col}"]`);
                
                if (cell) {
                    if (error.type === 'tag_error') {
                        // Tag errors: red background
                        cell.style.backgroundColor = '#fee2e2';
                        cell.style.border = '2px solid #ef4444';
                    } else if (error.type === 'multiple_correct') {
                        // Multiple correct answers: orange border on first column
                        const firstCell = this.previewElement.querySelector(`td[data-row="${error.row}"][data-col="0"]`);
                        if (firstCell) {
                            firstCell.style.border = '2px solid #f97316';
                        }
                    } else {
                        // Other errors: red border
                        cell.style.border = '2px solid #ef4444';
                    }
                }
            }
        });
    }

    /**
     * Process question data for conversion
     * @returns {Array} - Processed question data
     */
    processQuestionData() {
        if (!this.editedData || this.editedData.length < 2) {
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
        
        // Process each row (skip the first row which contains headers)
        for (let rowIndex = 1; rowIndex < this.editedData.length; rowIndex++) {
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