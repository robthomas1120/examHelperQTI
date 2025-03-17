document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('csvFile');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const removeFileBtn = document.getElementById('removeFile');
    const csvPreview = document.getElementById('csv-preview');
    const convertBtn = document.getElementById('convertBtn');
    const quizTitle = document.getElementById('quizTitle');
    const quizDescription = document.getElementById('quizDescription');
    const downloadBtn = document.getElementById('downloadBtn');
    const resultsSection = document.getElementById('results-section');
    const conversionSummary = document.getElementById('conversion-summary');
    
    // Variables
    let currentFile = null;
    let questionData = null;
    
    // Initialize Excel Handler
    if (!window.excelHandler) {
        window.excelHandler = new ExcelHandler();
    }
    
    // Event Listeners
    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('dragleave', handleDragLeave);
    dropArea.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
    removeFileBtn.addEventListener('click', removeFile);
    dropArea.addEventListener('click', triggerFileInput);
    quizTitle.addEventListener('input', validateForm);
    quizDescription.addEventListener('input', validateForm);
    convertBtn.addEventListener('click', handleConversion);
    
    // Functions
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        dropArea.classList.add('highlight');
    }
    
    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        dropArea.classList.remove('highlight');
    }
    
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        dropArea.classList.remove('highlight');
        
        const files = e.dataTransfer.files;
        if (files.length) {
            processFile(files[0]);
        }
    }
    
    function triggerFileInput(e) {
        // Only trigger file input if not clicking on file info or remove button
        if (fileInfo.classList.contains('hidden') || 
            (!e.target.closest('#fileInfo') && !e.target.closest('#removeFile'))) {
            fileInput.click();
        }
    }
    
    function handleFileSelect(e) {
        const files = e.target.files;
        if (files.length) {
            processFile(files[0]);
        }
    }
    
    function processFile(file) {
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
        
        currentFile = file;
        
        // Show file info
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileInfo.classList.remove('hidden');
        
        // Read and preview file
        previewFile(file);
        
        // Set default title from filename if empty
        if (!quizTitle.value) {
            const baseName = file.name.split('.')[0];
            quizTitle.value = baseName.replace(/_/g, ' ');
        }
        
        // Validate form
        validateForm();
    }
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    async function previewFile(file) {
        csvPreview.innerHTML = '<p>Loading preview...</p>';
        
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        try {
            if (fileExtension === 'csv') {
                await previewCSV(file);
            } else if (['xls', 'xlsx'].includes(fileExtension)) {
                // Use enhanced Excel handler
                questionData = await window.excelHandler.processExcelFile(file);
            } else {
                csvPreview.innerHTML = '<p class="placeholder-text">Unsupported file format</p>';
            }
        } catch (error) {
            console.error('Error previewing file:', error);
            csvPreview.innerHTML = `<p class="error-text">Error previewing file: ${error.message}</p>`;
        }
    }
    
    function previewCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const content = e.target.result;
                
                Papa.parse(content, {
                    skipEmptyLines: true,
                    complete: function(results) {
                        // Skip the first row - use header: true to do this automatically
                        const data = results.data;
                        
                        if (data.length < 2) {
                            csvPreview.innerHTML = '<p>No data found in CSV file or invalid format</p>';
                            reject(new Error('No valid data found'));
                            return;
                        }
                        
                        // Get headers from the first row
                        const headers = data[0];
                        
                        // Get data rows (skip first row)
                        const rows = data.slice(1);
                        
                        // Filter out empty rows
                        const nonEmptyRows = rows.filter(row => 
                            row.some(cell => cell !== null && cell !== undefined && cell !== '')
                        );
                        
                        // Find non-empty columns
                        const nonEmptyColumnIndices = findNonEmptyColumnIndices(headers, nonEmptyRows);
                        
                        // Filter headers to only include non-empty columns
                        const filteredHeaders = nonEmptyColumnIndices.map(index => headers[index] || `Column ${index + 1}`);
                        
                        // Check if this is a TF (True/False) sheet based on headers or content
                        const isTFSheet = file.name.toLowerCase().includes('tf') || 
                                         headers.some(h => h && h.toLowerCase().includes('true') || h.toLowerCase().includes('false')) ||
                                         rows.some(row => row[0] === 'TF');
                        
                        // Display table with filtered headers and rows
                        displayCSVTable(filteredHeaders, nonEmptyRows, nonEmptyColumnIndices, isTFSheet);
                        
                        // Save for later use in conversion
                        questionData = results.data.slice(1); // Skip the first row for conversion
                        
                        resolve();
                    },
                    error: function(error) {
                        csvPreview.innerHTML = `<p class="error-text">Error parsing CSV: ${error.message}</p>`;
                        reject(error);
                    }
                });
            };
            
            reader.onerror = function(e) {
                reject(e);
            };
            
            reader.readAsText(file);
        });
    }
    
    /**
     * Find indices of non-empty columns
     * @param {Array} headers - Header row
     * @param {Array} rows - Data rows
     * @returns {Array} - Array of column indices that contain data
     */
    function findNonEmptyColumnIndices(headers, rows) {
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
 * Display CSV data in a table with improved validation
 * @param {Array} headers - Filtered headers
 * @param {Array} rows - Data rows
 * @param {Array} columnIndices - Indices of columns to include
 * @param {Boolean} isTFSheet - Whether this is a TF sheet
 */
function displayCSVTable(headers, rows, columnIndices, isTFSheet = false) {
    const validTaggingValues = ["correct", "incorrect"];
    let errors = [];
    let multipleCorrectErrors = [];

    // Identify "tagging" columns based on header names
    const taggingColumns = columnIndices.filter(index => 
        headers[index] && headers[index].toLowerCase().includes("tag")
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

    // Determine if this is an MC (Multiple Choice) tab or question type
    const isMCType = headers.some(header => header && header.includes("MC")) || 
                     (rows.length > 0 && rows[0].length > 0 && rows[0][0] === "MC");

    let tableHtml = '<table style="width: 100%; border-collapse: collapse;">';

    // Table header
    tableHtml += '<thead><tr>';
    headers.forEach(header => {
        tableHtml += `<th style="padding: 10px; background-color: #f3f4f6; border: 1px solid #e5e7eb; text-align: left;">${header}</th>`;
    });
    tableHtml += '</tr></thead>';

    // Table body
    tableHtml += '<tbody>';
    rows.forEach((row, rowIndex) => {
        let rowErrors = [];
        let isMultipleCorrect = false;
        let rowStyle = "";

        // For MC questions, check how many "correct" values exist in the row
        if (isMCType || (row.length > 0 && row[0] === "MC")) {
            let correctCount = 0;
            
            // Count the number of "correct" values in tagging columns
            taggingColumns.forEach(colIndex => {
                const value = row[colIndex] ? row[colIndex].toString().trim().toLowerCase() : '';
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
            const optionValue = row[pair.optionColIndex] ? row[pair.optionColIndex].toString().trim() : '';
            const tagValue = row[pair.tagColIndex] ? row[pair.tagColIndex].toString().trim() : '';
            
            // Only validate if the option has a value but the tag is invalid
            if (optionValue && !validTaggingValues.includes(tagValue.toLowerCase())) {
                rowErrors.push(`Row ${rowIndex + 1}, Column "${headers[pair.tagColIndex]}" has invalid value "${tagValue}" for option "${optionValue}"`);
            }
        });

        tableHtml += `<tr id="row-${rowIndex}" style="background-color: ${rowIndex % 2 === 0 ? 'white' : '#f9fafb'}; ${rowStyle}">`;

        columnIndices.forEach((colIndex, i) => {
            const value = row[colIndex] ? row[colIndex].toString().trim() : '';
            let cellStyle = '';

            // Apply cell styling based on content
            if (value.toLowerCase() === 'correct') {
                cellStyle = 'color: #10b981; font-weight: 500;'; // Green for correct
            } else if (value.toLowerCase() === 'incorrect') {
                cellStyle = 'color: #ef4444; font-weight: 500;'; // Red for incorrect
            }

            // Add error highlighting for tag cells with errors
            if (taggingColumns.includes(colIndex)) {
                // Find the corresponding option column
                const optionColIndex = tagPairs.find(p => p.tagColIndex === colIndex)?.optionColIndex;
                const optionValue = optionColIndex !== undefined ? (row[optionColIndex] ? row[optionColIndex].toString().trim() : '') : '';
                
                // Highlight cell if option exists but tag is invalid
                if (optionValue && !validTaggingValues.includes(value.toLowerCase())) {
                    cellStyle += ' background-color: #fee2e2; color: #b91c1c; font-weight: 500;'; // Red highlight
                }
            }

            tableHtml += `<td style="padding: 8px; border: 1px solid #e5e7eb; ${cellStyle}">${value}</td>`;
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

    // Add multiple correct answers warning if needed
    if (multipleCorrectErrors.length > 0) {
        let mcErrorHtml = '<div class="multiple-correct-container" style="margin-bottom: 15px; padding: 12px 15px; background-color: #ffedd5; border-radius: 6px; border: 1px solid #f97316;">';
        mcErrorHtml += '<h3 style="margin: 0 0 8px 0; color: #9a3412; font-size: 1rem; font-weight: 600;">Multiple Correct Answers Found:</h3><ul style="margin: 0; padding-left: 20px;">';
        
        multipleCorrectErrors.forEach(error => {
            mcErrorHtml += `<li style="color: #7c2d12; margin-bottom: 4px;">Row ${error.row}: Contains ${error.count} Correct Answers. Multiple Choice Questions are only limited to 1 correct answer.</li>`;
        });
        
        mcErrorHtml += '</ul></div>';

        document.getElementById("csv-preview").insertAdjacentHTML("beforebegin", mcErrorHtml);
    }

    // Add validation error summary
    if (errors.length > 0) {
        let errorHtml = '<div class="validation-errors-container">';
        errorHtml += '<h3>Tagging Errors Found:</h3><ul>';
        errors.forEach(error => {
            errorHtml += `<li>${error}</li>`;
        });
        errorHtml += '</ul></div>';

        document.getElementById("csv-preview").insertAdjacentHTML("beforebegin", errorHtml);
    }

    document.getElementById("csv-preview").innerHTML = tableHtml;
}
    
    function removeFile() {
        currentFile = null;
        questionData = null;
        fileInput.value = '';
        fileInfo.classList.add('hidden');
        csvPreview.innerHTML = '<p class="placeholder-text">CSV content will appear here after upload</p>';
        
        // Remove sheet navigation if it exists
        const sheetNav = document.querySelector('.sheet-navigation');
        if (sheetNav) {
            sheetNav.remove();
        }
        
        validateForm();
    }
    
    function validateForm() {
        // Enable convert button only if file is selected and quiz title is provided
        convertBtn.disabled = !currentFile || !quizTitle.value.trim();
    }
    
    // Handle file conversion
    async function handleConversion() {
        // Check if we have both file and title
        if (!currentFile || !quizTitle.value.trim()) {
            alert('Please upload a file and provide a quiz title');
            return;
        }
        
        // Check if we have question data
        if (!questionData || !questionData.length) {
            alert('No valid question data found in the file');
            return;
        }
        
        // Show a loading state
        convertBtn.disabled = true;
        convertBtn.innerHTML = '<i class="fas fa-spin fa-spinner"></i> Converting...';
        
        try {
            // Count questions by type
            const questionTypes = countQuestionTypes(questionData);
            const totalQuestions = questionData.length;
            
            // Convert to QTI
            const converter = new QTIConverter();
            const zipBlob = await converter.convert(questionData, quizTitle.value, quizDescription.value);
            
            // Store the blob for download
            const qtiZipUrl = URL.createObjectURL(zipBlob);
            downloadBtn.setAttribute('data-url', qtiZipUrl);
            downloadBtn.setAttribute('data-filename', `${quizTitle.value.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qti.zip`);
            
            // Show results section
            resultsSection.classList.remove('hidden');
            
            // Update conversion summary
            conversionSummary.innerHTML = `
                <div class="alert-success">
                    <i class="fas fa-check-circle"></i>
                    Successfully converted ${currentFile.name} to QTI format!
                </div>
                <p><strong>Quiz Title:</strong> ${quizTitle.value}</p>
                ${quizDescription.value ? `<p><strong>Description:</strong> ${quizDescription.value}</p>` : ''}
                <p><strong>Total Questions:</strong> ${totalQuestions}</p>
                <p><strong>Question Types:</strong></p>
                <ul>
                    <li>Multiple Choice: ${questionTypes.MC}</li>
                    <li>Multiple Answer: ${questionTypes.MA}</li>
                    <li>True/False: ${questionTypes.TF}</li>
                    <li>Essay: ${questionTypes.ESS}</li>
                    <li>Fill in Blank: ${questionTypes.FIB}</li>
                </ul>
            `;
            
            // Update UI to show completion
            convertBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Convert to QTI';
            convertBtn.disabled = false;
            
            // Scroll to results
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Conversion error:', error);
            
            // Update UI to show error
            convertBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Convert to QTI';
            convertBtn.disabled = false;
            
            // Show error message
            alert(`Error converting file: ${error.message}`);
        }
    }
    
    // Count questions by type
    function countQuestionTypes(questions) {
        const counts = {
            MC: 0,  // Multiple Choice
            MA: 0,  // Multiple Answer
            TF: 0,  // True/False
            ESS: 0, // Essay
            FIB: 0, // Fill in Blank
            total: questions.length
        };
        
        questions.forEach(question => {
            if (!Array.isArray(question) || !question.length) return;
            
            const type = question[0]?.toString().toUpperCase();
            if (counts.hasOwnProperty(type)) {
                counts[type]++;
            }
        });
        
        return counts;
    }
    
    // Handle download button click
    downloadBtn.addEventListener('click', function() {
        const url = this.getAttribute('data-url');
        const filename = this.getAttribute('data-filename');
        
        if (url && filename) {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Clean up the object URL after download
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 100);
        } else {
            alert('No file available for download');
        }
    });
});