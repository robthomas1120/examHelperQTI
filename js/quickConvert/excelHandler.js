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
        if (!this.questionData || this.questionData.length < 1) {
            this.previewElement.innerHTML = '<p>No valid data found</p>';
            return;
        }

        // Create fixed headers
        const headers = ['#', 'Exam Type', 'Question'];
        // Add empty headers for remaining columns based on the first row's length
        const firstRow = this.questionData[0];
        for (let i = 3; i < firstRow.length; i++) {
            headers.push('');
        }

        // Create table with error container first
        let tableHtml = '<div id="error-container" class="error-container" style="margin-bottom: 15px; padding: 12px 15px; background-color: #fee2e2; border-radius: 6px; border: 1px solid #ef4444; display: none;"></div>';

        // Add tip box
        tableHtml += '<div class="tip-box" style="margin-bottom: 15px; padding: 10px; background-color: #f0f9ff; border-radius: 6px; border-left: 4px solid #3b82f6;">';
        tableHtml += '<i class="fas fa-info-circle" style="color: #3b82f6; margin-right: 8px;"></i>';
        tableHtml += 'Tip: Click any cell to edit its value. Press Enter to save changes or Esc to cancel.';
        tableHtml += '</div>';
        
        tableHtml += '<div class="table-container" style="max-height: 600px;">';
        tableHtml += '<table class="data-table" style="width: 100%; border-collapse: collapse;">';
        
        // Table header
        tableHtml += '<thead><tr>';
        headers.forEach((header, index) => {
            tableHtml += `<th style="padding: 10px; background-color: #f3f4f6; border: 1px solid #e5e7eb; text-align: left; position: sticky; top: 0; z-index: 10;">${header}</th>`;
        });
        tableHtml += '</tr></thead>';
        
        // Table body
        tableHtml += '<tbody>';
        
        // Get data rows (skip header row)
        const dataRows = this.questionData.slice(1);
        
        // Filter out completely empty rows
        const nonEmptyRows = dataRows.filter(row => 
            row.some(cell => cell !== null && cell !== undefined && cell !== '')
        );

        nonEmptyRows.forEach((row, rowIndex) => {
            const displayRowNumber = rowIndex + 2; // Start counting from 2 since row 1 is header
            tableHtml += `<tr data-row-index="${rowIndex}">`;
            
            // Add row number column
            tableHtml += `<td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f3f4f6; font-weight: 500; text-align: center;">${displayRowNumber}</td>`;
            
            // Add data cells
            row.forEach((cell, colIndex) => {
                const cellValue = cell !== null && cell !== undefined ? cell.toString() : '';
                const isEditable = true;
                
                // Determine cell style based on content
                let cellStyle = '';
                if (cellValue.toLowerCase() === 'correct') {
                    cellStyle = 'color: #10b981; font-weight: 500;'; // Green for correct
                } else if (cellValue.toLowerCase() === 'incorrect') {
                    cellStyle = 'color: #ef4444; font-weight: 500;'; // Red for incorrect
                }
                
                // Add error highlighting for invalid tag values
                if (this.isTagColumn(colIndex + 1) && cellValue && !['correct', 'incorrect', ''].includes(cellValue.toLowerCase())) {
                    cellStyle += ' background-color: #fee2e2;'; // Red background for invalid tags
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
        
        // Add download button
        tableHtml += '<div style="margin-top: 15px; text-align: right;">';
        tableHtml += '<button id="downloadExcelBtn" class="secondary-btn" style="margin-right: 10px;">';
        tableHtml += '<i class="fas fa-download"></i> Download Edited Excel';
        tableHtml += '</button>';
        tableHtml += '</div>';
        
        // Update preview
        this.previewElement.innerHTML = tableHtml;
        
        // Store reference to error container
        this.errorContainer = document.getElementById('error-container');
        
        // Add event listeners for cell editing
        this.addCellEditListeners();
        
        // Add event listener for download button
        const downloadBtn = document.getElementById('downloadExcelBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadEditedFile());
        }
        
        // Validate and show errors
        this.validateData();
    }
    
    /**
     * Check if a column is a tag column (for correct/incorrect values)
     * @param {number} colIndex - Column index
     * @returns {boolean} - True if it's a tag column
     */
    isTagColumn(colIndex) {
        // For MC and MA questions, every even-numbered column after column 2 is a tag column
        return colIndex > 2 && colIndex % 2 === 0;
    }
    
    /**
     * Validate the data and show error messages
     */
    validateData() {
        this.errorMessages = [];
        this.hasValidationErrors = false;
        
        if (!this.editedData || this.editedData.length < 2) return;
        
        const dataRows = this.editedData.slice(1); // Skip header row
        
        dataRows.forEach((row, rowIndex) => {
            const rowNum = rowIndex + 2; // Start counting from row 2 since row 1 is header
            const questionType = row[1]?.toString().toUpperCase(); // Exam Type is in column 2
            
            // Skip empty rows
            if (!row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
                return;
            }

            // Only validate correct/incorrect tags for MC and MA
            if (questionType === 'MC' || questionType === 'MA') {
                // Check for invalid tag values
                row.forEach((cell, colIndex) => {
                    if (this.isTagColumn(colIndex + 1)) {
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
                    if (this.isTagColumn(colIndex + 1) && cell?.toString().toLowerCase() === 'correct') {
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
        });
        
        this.updateErrorDisplay();
    }

    /**
     * Update the error display
     */
    updateErrorDisplay() {
        if (!this.errorContainer) return;
        
        if (this.errorMessages.length > 0) {
            let errorHtml = '<h3 style="margin: 0 0 8px 0; color: #991b1b; font-size: 1rem; font-weight: 600;">Validation Errors:</h3>';
            errorHtml += '<ul style="margin: 0; padding-left: 20px;">';
            this.errorMessages.forEach(error => {
                errorHtml += `<li style="color: #7f1d1d; margin-bottom: 4px;">${error}</li>`;
            });
            errorHtml += '</ul>';
            
            this.errorContainer.innerHTML = errorHtml;
            this.errorContainer.style.display = 'block';
        } else {
            this.errorContainer.style.display = 'none';
            this.errorContainer.innerHTML = '';
        }
    }
    
    /**
     * Add event listeners for cell editing
     */
    addCellEditListeners() {
        const cells = this.previewElement.querySelectorAll('.editable-cell');
        
        cells.forEach(cell => {
            // Click to edit
            cell.addEventListener('click', () => {
                cell.focus();
                // Select all text when clicked
                const range = document.createRange();
                range.selectNodeContents(cell);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
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
                
                // Update edited data
                if (!this.editedData[row + 1]) {
                    this.editedData[row + 1] = [];
                }
                this.editedData[row + 1][col] = newValue;
                
                // Update cell attributes
                cell.setAttribute('data-value', this.escapeHTML(newValue));
                
                // Update cell styling
                if (this.isTagColumn(col + 1)) {
                    const lowerValue = newValue.toLowerCase();
                    if (lowerValue === 'correct') {
                        cell.style.color = '#10b981';
                        cell.style.backgroundColor = '';
                    } else if (lowerValue === 'incorrect') {
                        cell.style.color = '#ef4444';
                        cell.style.backgroundColor = '';
                    } else if (newValue) {
                        cell.style.color = '';
                        cell.style.backgroundColor = '#fee2e2';
                    } else {
                        cell.style.color = '';
                        cell.style.backgroundColor = '';
                    }
                }
                
                // Revalidate data
                this.validateData();
            });
        });
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