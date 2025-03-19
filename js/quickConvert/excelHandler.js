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
    
    // Update to the displayData method to make the table taller

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

        // Create main structure
        let fullHtml = '';
        
        // Error container
        fullHtml += '<div id="error-container" class="error-container" style="margin-bottom: 15px; padding: 12px 15px; background-color: #fee2e2; border-radius: 6px; border: 1px solid #ef4444; display: none;"></div>';
        
        // Multiple correct error container
        fullHtml += '<div id="mc-error-container" class="mc-error-container" style="margin-bottom: 15px; padding: 12px 15px; background-color: #ffedd5; border-radius: 6px; border: 1px solid #f97316; display: none;"></div>';
        
        // Download button right after error notifications
        fullHtml += '<div style="margin-bottom: 15px; text-align: right;">';
        fullHtml += '<button id="downloadExcelBtn" class="secondary-btn">';
        fullHtml += '<i class="fas fa-download"></i> Download Edited Excel';
        fullHtml += '</button>';
        fullHtml += '</div>';
        
        // Tip message
        fullHtml += '<div class="tip-box" style="margin-bottom: 15px; padding: 12px 15px; background-color: #e0f2fe; border-radius: 6px; border: 1px solid #0ea5e9;">';
        fullHtml += '<p style="margin: 0; color: #0c4a6e;"><i class="fas fa-lightbulb" style="margin-right: 8px;"></i><strong>Tip:</strong> Double-click on cells to edit. Press Enter to save your changes.</p>';
        fullHtml += '</div>';
        
        // Add scrollable container for the table with fixed height (doubled)
        fullHtml += '<div class="table-container" style="height: 600px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 15px;">';
        
        // Table (within scrollable container)
        fullHtml += '<table class="data-table" style="width: 100%; border-collapse: collapse;">';
        
        // Table header (make it sticky)
        fullHtml += '<thead style="position: sticky; top: 0; z-index: 10;"><tr>';
        headers.forEach((header, index) => {
            fullHtml += `<th style="padding: 10px; background-color: #f3f4f6; border: 1px solid #e5e7eb; text-align: left;">${header}</th>`;
        });
        fullHtml += '</tr></thead>';
        
        // Table body
        fullHtml += '<tbody>';
        
        // Get all data rows
        const dataRows = this.questionData;
        
        // Filter out completely empty rows
        const nonEmptyRows = dataRows.filter(row => 
            row.some(cell => cell !== null && cell !== undefined && cell !== '')
        );

        nonEmptyRows.forEach((row, rowIndex) => {
            const displayRowNumber = rowIndex + 1;
            fullHtml += `<tr data-row-index="${rowIndex}">`;
            
            // Add row number column
            fullHtml += `<td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f3f4f6; font-weight: 500; text-align: center;">${displayRowNumber}</td>`;
            
            // Get question type for this row (if available)
            // The first column of your data is the Exam Type
            const questionType = row[0]?.toString().toUpperCase() || '';
            
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
                if (this.isTagColumn(colIndex + 1, questionType) && cellValue && !['correct', 'incorrect', ''].includes(cellValue.toLowerCase())) {
                    cellStyle += ' background-color: #fee2e2;'; // Red background for invalid tags
                }
                
                fullHtml += `<td 
                    class="${isEditable ? 'editable-cell' : ''}" 
                    data-row="${rowIndex}" 
                    data-col="${colIndex}" 
                    data-question-type="${questionType}"
                    data-value="${this.escapeHTML(cellValue)}" 
                    style="padding: 8px; border: 1px solid #e5e7eb; ${cellStyle}"
                    ${isEditable ? 'contenteditable="true"' : ''}
                >${cellValue}</td>`;
            });
            
            fullHtml += '</tr>';
        });
        
        fullHtml += '</tbody></table>';
        
        // Close the scrollable container
        fullHtml += '</div>';
        
        // Update preview
        this.previewElement.innerHTML = fullHtml;
        
        // Store reference to error container
        this.errorContainer = document.getElementById('error-container');
        
        // Add event listeners for cell editing
        this.addCellEditListeners();
        
        // Add event listener for download button
        const downloadBtn = document.getElementById('downloadExcelBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadEditedFile());
        }
        
        // Update the cell editing event listeners to use double-click
        this.updateCellEditListeners();
    }


    /**
     * Update cell edit listeners to use double-click
     */
    updateCellEditListeners() {
        const cells = this.previewElement.querySelectorAll('.editable-cell');
        
        cells.forEach(cell => {
            // Remove existing click listener and add double-click
            cell.removeEventListener('click', this.cellClickHandler);
            
            // Add double-click listener
            cell.addEventListener('dblclick', () => {
                cell.focus();
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
                    mcErrorRows.add(parseInt(rowMatch[1]));
                }
            } else {
                regularErrors.push(error);
            }
        });
        
        // Highlight only rows with multiple choice/answer errors
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
     * Highlight rows with errors
     * @param {Set<number>} errorRows - Set of row numbers with errors
     */
    highlightErrorRows(errorRows) {
        // Get all table rows
        const tableRows = this.previewElement.querySelectorAll('table.data-table tbody tr');
        
        // First, remove any existing error highlighting
        tableRows.forEach(row => {
            row.style.backgroundColor = '';
        });
        
        // Then highlight rows with errors
        errorRows.forEach(rowNum => {
            // Adjust rowNum to match display index (rowNum-1 is the array index, but the first row is 1 in the display)
            const rowIndex = rowNum - 1;
            const row = tableRows[rowIndex];
            if (row) {
                // Add a more distinct orange background to highlight the row
                row.style.backgroundColor = '#ffcb8d'; // Brighter orange color
            }
        });
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
                const questionType = cell.getAttribute('data-question-type') || '';
                
                // Update edited data
                if (!this.editedData[row]) {
                    this.editedData[row] = [];
                }
                this.editedData[row][col] = newValue;
                
                // Update cell attributes
                cell.setAttribute('data-value', this.escapeHTML(newValue));
                
                // Update cell styling
                if (this.isTagColumn(col + 1, questionType)) {
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