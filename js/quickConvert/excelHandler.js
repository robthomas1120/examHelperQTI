/**
 * Excel Handler for Quick Convert
 * Enhances Excel file handling with multi-sheet preview capabilities
 */

class ExcelHandler {
    constructor() {
        this.workbook = null;
        this.currentSheetIndex = 1; // Start with the second sheet (index 1) to skip the first
        this.previewElement = document.getElementById('csv-preview');
        this.sheetNavContainer = null;
    }

    /**
     * Process Excel file and display preview
     * @param {File} file - Excel file to process
     * @returns {Promise<Array>} - Promise resolving to processed question data
     */
    async processExcelFile(file) {
        try {
            // Read file as array buffer
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            
            // Parse workbook
            this.workbook = XLSX.read(arrayBuffer, { type: 'array' });
            
            // Skip first sheet and validate we have other sheets
            if (this.workbook.SheetNames.length <= 1) {
                throw new Error('Excel file must contain at least two sheets');
            }
            
            // Get all sheet names except the first one
            const sheetNames = this.workbook.SheetNames.slice(1);
            
            // Create sheet navigation
            this.createSheetNavigation(sheetNames);
            
            // Display the first non-skipped sheet
            this.displaySheet(this.currentSheetIndex);
            
            // Return processed data for all sheets
            return this.processAllSheets();
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
            
            // Set active state for first non-skipped sheet
            if (index === 0) {
                button.setAttribute('data-active', 'true');
            }
            
            // Add click handler
            button.addEventListener('click', () => {
                // Calculate the real sheet index (add 1 to skip first sheet)
                const sheetIndex = index + 1;
                
                // Update active states
                this.updateActiveButton(button);
                
                // Display selected sheet
                this.displaySheet(sheetIndex);
            });
            
            this.sheetNavContainer.appendChild(button);
        });
        
        // Append to preview container
        this.previewElement.parentNode.insertBefore(this.sheetNavContainer, this.previewElement.nextSibling);
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
            
            // Convert to JSON (with headers in row 1)
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
            const nonEmptyRows = rows.filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''));
            
            // Find non-empty columns
            const nonEmptyColumnIndices = this.findNonEmptyColumnIndices(headers, nonEmptyRows);
            
            // Filter headers to only include non-empty columns
            const filteredHeaders = nonEmptyColumnIndices.map(index => headers[index] || `Column ${index + 1}`);
            
            // Display table
            this.displayTable(filteredHeaders, nonEmptyRows, nonEmptyColumnIndices);
        } catch (error) {
            console.error(`Error displaying sheet ${sheetIndex}:`, error);
            this.previewElement.innerHTML = `<p class="error-text">Error displaying sheet: ${error.message}</p>`;
        }
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
     * Display table with headers and rows
     * @param {Array} headers - Table headers
     * @param {Array} rows - Table rows
     * @param {Array} columnIndices - Indices of columns to display
     */
    displayTable(headers, rows, columnIndices) {
        // Limit preview to 10 rows
        const previewRows = rows.slice(0, 10);
        
        let tableHtml = '<table style="width: 100%; border-collapse: collapse;">';
        
        // Table header
        tableHtml += '<thead><tr>';
        headers.forEach(header => {
            tableHtml += `<th style="padding: 10px; background-color: #f3f4f6; border: 1px solid #e5e7eb; text-align: left;">${header}</th>`;
        });
        tableHtml += '</tr></thead>';
        
        // Table body
        tableHtml += '<tbody>';
        previewRows.forEach((row, rowIndex) => {
            tableHtml += `<tr style="background-color: ${rowIndex % 2 === 0 ? 'white' : '#f9fafb'};">`;
            columnIndices.forEach((colIndex, i) => {
                const value = row[colIndex] !== undefined ? row[colIndex] : '';
                
                // Check if this is a tagging column (content might be "correct" or "incorrect")
                const cellValue = value.toString();
                let cellStyle = '';
                
                if (cellValue.toLowerCase() === 'correct') {
                    cellStyle = 'color: #10b981; font-weight: 500;'; // Green color for correct
                } else if (cellValue.toLowerCase() === 'incorrect') {
                    cellStyle = 'color: #ef4444; font-weight: 500;'; // Red color for incorrect
                }
                
                tableHtml += `<td style="padding: 8px; border: 1px solid #e5e7eb; ${cellStyle}">${cellValue}</td>`;
            });
            tableHtml += '</tr>';
        });
        tableHtml += '</tbody></table>';
        
        // Add note if there are more rows
        if (rows.length > 10) {
            tableHtml += `<p style="margin-top: 10px; color: #718096; font-style: italic;">Showing 10 of ${rows.length} rows</p>`;
        }
        
        this.previewElement.innerHTML = tableHtml;
    }

    /**
     * Process all sheets for conversion
     * @returns {Array} - Array of question data for all sheets
     */
    processAllSheets() {
        const allQuestionData = [];
        
        // Skip the first sheet
        for (let i = 1; i < this.workbook.SheetNames.length; i++) {
            const sheetName = this.workbook.SheetNames[i];
            const sheet = this.workbook.Sheets[sheetName];
            
            // Convert to JSON (with headers in row 1)
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            
            // Skip if sheet is empty
            if (jsonData.length <= 1) continue;
            
            // Get data rows (skip first row)
            const rows = jsonData.slice(1);
            
            // Filter out completely empty rows
            const nonEmptyRows = rows.filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''));
            
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
}

// Initialize when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Create global instance of Excel Handler
    window.excelHandler = new ExcelHandler();
});