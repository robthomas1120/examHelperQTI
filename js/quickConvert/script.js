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
    
    function triggerFileInput() {
        fileInput.click();
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
        
        // Validate form
        validateForm();
    }
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    function previewFile(file) {
        csvPreview.innerHTML = '<p>Loading preview...</p>';
        
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        if (fileExtension === 'csv') {
            previewCSV(file);
        } else if (['xls', 'xlsx'].includes(fileExtension)) {
            previewExcel(file);
        } else {
            csvPreview.innerHTML = '<p class="placeholder-text">Unsupported file format</p>';
        }
    }
    
    function previewCSV(file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const content = e.target.result;
            
            Papa.parse(content, {
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    displayPreview(results.data, results.meta.fields);
                },
                error: function(error) {
                    csvPreview.innerHTML = `<p class="error">Error parsing CSV: ${error.message}</p>`;
                }
            });
        };
        
        reader.readAsText(file);
    }
    
    function previewExcel(file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Get first sheet
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                
                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                
                if (jsonData.length > 0) {
                    const headers = jsonData[0];
                    const rows = jsonData.slice(1);
                    
                    // Convert to format for display
                    const formattedData = rows.map(row => {
                        const rowData = {};
                        headers.forEach((header, index) => {
                            rowData[header] = row[index] || '';
                        });
                        return rowData;
                    });
                    
                    displayPreview(formattedData, headers);
                } else {
                    csvPreview.innerHTML = '<p>No data found in Excel file</p>';
                }
            } catch (error) {
                csvPreview.innerHTML = `<p class="error">Error parsing Excel file: ${error.message}</p>`;
            }
        };
        
        reader.readAsArrayBuffer(file);
    }
    
    function displayPreview(data, headers) {
        if (!data || data.length === 0 || !headers || headers.length === 0) {
            csvPreview.innerHTML = '<p>No data found in file or invalid format</p>';
            return;
        }
        
        // Limit preview to 10 rows
        const previewData = data.slice(0, 10);
        
        let tableHtml = '<table>';
        
        // Table header
        tableHtml += '<thead><tr>';
        headers.forEach(header => {
            tableHtml += `<th>${header}</th>`;
        });
        tableHtml += '</tr></thead>';
        
        // Table body
        tableHtml += '<tbody>';
        previewData.forEach(row => {
            tableHtml += '<tr>';
            headers.forEach(header => {
                tableHtml += `<td>${row[header] !== undefined ? row[header] : ''}</td>`;
            });
            tableHtml += '</tr>';
        });
        tableHtml += '</tbody></table>';
        
        // Add note if there are more rows
        if (data.length > 10) {
            tableHtml += `<p class="preview-note">Showing 10 of ${data.length} rows</p>`;
        }
        
        csvPreview.innerHTML = tableHtml;
    }
    
    function removeFile() {
        currentFile = null;
        fileInput.value = '';
        fileInfo.classList.add('hidden');
        csvPreview.innerHTML = '<p class="placeholder-text">CSV content will appear here after upload</p>';
        validateForm();
    }
    
    function validateForm() {
        // Enable convert button only if file is selected and quiz title is provided
        convertBtn.disabled = !currentFile || !quizTitle.value.trim();
    }
    
    // Parse CSV file and return array of question data
    function parseCSVFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const content = e.target.result;
                
                Papa.parse(content, {
                    header: false,
                    skipEmptyLines: true,
                    dynamicTyping: false, // Keep everything as strings
                    complete: function(results) {
                        // Validate and clean the data
                        const cleanedData = results.data.filter(row => {
                            // Ensure row is an array and has at least two elements (type and question text)
                            return Array.isArray(row) && row.length >= 2 && row[0];
                        }).map(row => {
                            // Convert all values to strings
                            return row.map(cell => {
                                if (cell === null || cell === undefined) {
                                    return '';
                                }
                                return String(cell);
                            });
                        });
                        
                        resolve(cleanedData);
                    },
                    error: function(error) {
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
    
    // Parse Excel file and return array of question data
    function parseExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Get first sheet
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    
                    // Convert to array format (not using headers)
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                    
                    // Validate and clean the data
                    const cleanedData = jsonData.filter(row => {
                        // Ensure row is an array and has at least two elements (type and question text)
                        return Array.isArray(row) && row.length >= 2 && row[0];
                    }).map(row => {
                        // Convert all values to strings
                        return row.map(cell => {
                            if (cell === null || cell === undefined) {
                                return '';
                            }
                            return String(cell);
                        });
                    });
                    
                    resolve(cleanedData);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = function(e) {
                reject(e);
            };
            
            reader.readAsArrayBuffer(file);
        });
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
            const type = question[0]?.toUpperCase();
            if (counts.hasOwnProperty(type)) {
                counts[type]++;
            }
        });
        
        return counts;
    }
    
    // Handle file conversion
    async function handleConversion() {
        // Check if we have both file and title
        if (!currentFile || !quizTitle.value.trim()) {
            alert('Please upload a file and provide a quiz title');
            return;
        }
        
        // Show a loading state
        convertBtn.disabled = true;
        convertBtn.innerHTML = '<i class="fas fa-spin fa-spinner"></i> Converting...';
        
        try {
            // Parse the file to get data
            let questionData = [];
            const fileExtension = currentFile.name.split('.').pop().toLowerCase();
            
            if (fileExtension === 'csv') {
                // Parse CSV
                questionData = await parseCSVFile(currentFile);
            } else if (['xls', 'xlsx'].includes(fileExtension)) {
                // Parse Excel
                questionData = await parseExcelFile(currentFile);
            } else {
                throw new Error('Unsupported file format');
            }
            
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