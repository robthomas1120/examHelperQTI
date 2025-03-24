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
    
    // Track separate validation concerns
    const validationState = {
        hasFile: false,
        hasTitle: false,
        hasDescription: false,
        hasCellErrors: false
    };
    
    // Event Listeners
    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('dragleave', handleDragLeave);
    dropArea.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
    removeFileBtn.addEventListener('click', removeFile);
    dropArea.addEventListener('click', triggerFileInput);
    
    // Modified form field listeners to only update their own validation state
    quizTitle.addEventListener('input', function() {
        validationState.hasTitle = quizTitle.value.trim() !== '';
        updateConvertButtonState();
    });
    
    quizDescription.addEventListener('input', function() {
        validationState.hasDescription = quizDescription.value.trim() !== '';
        updateConvertButtonState();
    });
    
    // Listen for validation state changes from ExcelHandler
    document.addEventListener('validationStateChanged', function(e) {
        validationState.hasCellErrors = e.detail.hasErrors;
        updateConvertButtonState();
    });
    
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
        validationState.hasFile = true;
        
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
            validationState.hasTitle = quizTitle.value.trim() !== '';
        }
        
        // Update the convert button state
        updateConvertButtonState();
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
                
                // Set initial validation state based on Excel handler
                validationState.hasCellErrors = window.excelHandler.hasValidationErrors;
                
                // Update the convert button state
                updateConvertButtonState();
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
                        // Process CSV data with our Excel handler
                        try {
                            // Convert Papa Parse results to a format our Excel handler can use
                            window.excelHandler.questionData = results.data;
                            window.excelHandler.editedData = JSON.parse(JSON.stringify(results.data));
                            
                            // Display the data
                            window.excelHandler.displayData();
                            
                            // Process the data
                            questionData = window.excelHandler.processQuestionData();
                            
                            // Set validation state based on Excel handler
                            validationState.hasCellErrors = window.excelHandler.hasValidationErrors;
                            
                            // Update the convert button state
                            updateConvertButtonState();
                            
                            resolve();
                        } catch (error) {
                            console.error('Error processing CSV data:', error);
                            csvPreview.innerHTML = `<p class="error-text">Error processing CSV data: ${error.message}</p>`;
                            reject(error);
                        }
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
    
    function removeFile() {
        // Clear file input
        fileInput.value = '';
        
        // Hide file info
        fileInfo.classList.add('hidden');
        
        // Clear preview
        csvPreview.innerHTML = '<p class="placeholder-text">CSV content will appear here after upload</p>';
        
        // Clear current file
        currentFile = null;
        questionData = null;
        
        // Update validation state
        validationState.hasFile = false;
        validationState.hasCellErrors = false;
        
        // Update button state
        updateConvertButtonState();
        
        // Hide results section
        resultsSection.classList.add('hidden');
    }
    
    function updateConvertButtonState() {
        // Check all validation conditions
        const hasAllRequiredFields = 
            validationState.hasFile && 
            validationState.hasTitle &&
            validationState.hasDescription;
        
        // Enable convert button only if all required fields present AND no cell errors
        const shouldEnable = hasAllRequiredFields && !validationState.hasCellErrors;
        convertBtn.disabled = !shouldEnable;
        
        // Update validation notification
        updateValidationNotification(shouldEnable, validationState.hasCellErrors);
    }
    
    function updateValidationNotification(isValid, hasCellErrors) {
        // Remove existing notification if any
        const existingNotification = document.querySelector('.validation-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Add notification if there are cell errors
        if (hasCellErrors) {
            const notification = document.createElement('div');
            notification.className = 'validation-notification';
            notification.style = 'margin-top: 10px; padding: 8px 12px; background-color: #fee2e2; border-radius: 4px; color: #b91c1c; font-size: 14px;';
            notification.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please fix all validation errors before converting.';
            
            // Insert after convert button
            convertBtn.parentNode.insertBefore(notification, convertBtn.nextSibling);
        }
    }
    
    function handleConversion() {
        // Final validation before conversion
        const hasAllRequiredFields = 
            validationState.hasFile && 
            validationState.hasTitle &&
            validationState.hasDescription;
        
        const hasCellErrors = window.excelHandler && window.excelHandler.hasValidationErrors;
        
        // Only proceed if everything is valid
        if (!hasAllRequiredFields || hasCellErrors) {
            if (hasCellErrors) {
                // Scroll to error container to make it visible
                const errorContainer = document.getElementById('error-container');
                if (errorContainer) {
                    errorContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                alert('Please fix all validation errors before converting.');
            } else {
                alert('Please fill in all required fields.');
            }
            return;
        }
        
        try {
            // Create QTI converter
            const converter = new QTIConverter();
            
            // Set quiz metadata
            converter.setQuizTitle(quizTitle.value.trim());
            converter.setQuizDescription(quizDescription.value.trim());
            
            // Convert questions
            converter.addQuestions(questionData);
            
            // Show loading message
            const loadingMessage = document.createElement('div');
            loadingMessage.id = 'conversion-loading';
            loadingMessage.innerHTML = '<p>Converting questions to QTI format...</p><div class="spinner"></div>';
            document.body.appendChild(loadingMessage);
            
            // Generate QTI package asynchronously
            converter.convert(converter.questions, converter.quizTitle, converter.quizDescription)
                .then(zipBlob => {
                    // Remove loading message
                    const loadingElement = document.getElementById('conversion-loading');
                    if (loadingElement) {
                        loadingElement.remove();
                    }
                    
                    // Create download URL
                    const downloadUrl = URL.createObjectURL(zipBlob);
                    
                    // Set download button attributes
                    downloadBtn.setAttribute('data-url', downloadUrl);
                    downloadBtn.setAttribute('data-filename', `${quizTitle.value.trim().replace(/\s+/g, '_')}_qti.zip`);
                    
                    // Show results section
                    resultsSection.classList.remove('hidden');
                    
                    // Display conversion summary
                    const summary = countQuestionTypes(questionData);
                    let summaryHtml = '<h3>Conversion Complete</h3>';
                    summaryHtml += '<p>The following questions have been converted:</p>';
                    summaryHtml += '<ul>';
                    
                    for (const type in summary) {
                        if (summary[type] > 0) {
                            const typeName = getQuestionTypeName(type);
                            summaryHtml += `<li>${typeName}: ${summary[type]}</li>`;
                        }
                    }
                    
                    summaryHtml += '</ul>';
                    conversionSummary.innerHTML = summaryHtml;
                    
                    // Scroll to results
                    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                })
                .catch(error => {
                    // Remove loading message
                    const loadingElement = document.getElementById('conversion-loading');
                    if (loadingElement) {
                        loadingElement.remove();
                    }
                    
                    console.error('Error during conversion:', error);
                    alert('An error occurred during conversion. Please check the console for details.');
                });
        } catch (error) {
            console.error('Error during conversion:', error);
            alert(`Error during conversion: ${error.message}`);
        }
    }
    
    // Initialize validation state for title and description
    validationState.hasTitle = quizTitle.value.trim() !== '';
    validationState.hasDescription = quizDescription.value.trim() !== '';
    
    // Initial update of the convert button state
    updateConvertButtonState();
    
    // Count question types in data
    function countQuestionTypes(data) {
        if (!data) return {};
        
        const counts = {
            MC: 0,
            MA: 0,
            TF: 0,
            ESS: 0,
            FIB: 0
        };
        
        // If data is an object with type-specific arrays
        if (typeof data === 'object' && !Array.isArray(data)) {
            // Count questions in each type array
            for (const type in counts) {
                if (data[type] && Array.isArray(data[type])) {
                    counts[type] = data[type].length;
                }
            }
            
            // Also check the 'all' array for any questions not in type-specific arrays
            if (data.all && Array.isArray(data.all)) {
                data.all.forEach(q => {
                    const qType = q.type || (q.data && q.data[0]);
                    if (qType && !counts[qType]) {
                        counts[qType] = (counts[qType] || 0) + 1;
                    }
                });
            }
        } else if (Array.isArray(data)) {
            // If data is a simple array, count by first column
            data.forEach(row => {
                if (Array.isArray(row) && row.length > 0) {
                    const type = row[0].toString().trim().toUpperCase();
                    if (counts[type] !== undefined) {
                        counts[type]++;
                    }
                }
            });
        }
        
        console.log('Question counts:', counts);
        return counts;
    }
    
    function getQuestionTypeName(type) {
        const typeNames = {
            MC: 'Multiple Choice',
            MA: 'Multiple Answer',
            TF: 'True/False',
            ESS: 'Essay',
            FIB: 'Fill in the Blank'
        };
        
        return typeNames[type] || type;
    }
    
    // Handle download button click
    downloadBtn.addEventListener('click', function() {
        const url = this.getAttribute('data-url');
        const filename = this.getAttribute('data-filename');
        
        if (url && filename) {
            // Create temporary link
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            
            // Append to body
            document.body.appendChild(link);
            
            // Trigger click
            link.click();
            
            // Clean up
            document.body.removeChild(link);
        }
    });

    setTimeout(function() {
        const previewSection = document.querySelector('.preview-section');
        const csvPreview = document.getElementById('csv-preview');
        
        if (previewSection && csvPreview) {
            // Set explicit height to ensure the preview is tall enough
            previewSection.style.minHeight = '70vh';
            csvPreview.style.minHeight = '65vh';
            
            // Force the layout to recalculate
            window.dispatchEvent(new Event('resize'));
            
            console.log('Preview area maximized');
        }
    }, 500);
    
    // Add resize observer to dynamically adjust height
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const csvPreview = document.getElementById('csv-preview');
            if (csvPreview) {
                // Calculate available space
                const windowHeight = window.innerHeight;
                const previewRect = entry.target.getBoundingClientRect();
                const availableHeight = windowHeight - previewRect.top - 50; // 50px buffer for footer
                
                // Set the preview height to use available space
                csvPreview.style.height = `${availableHeight}px`;
                
                console.log(`Adjusted preview height to ${availableHeight}px`);
            }
        }
    });
    
    // Observe the preview section
    const previewSection = document.querySelector('.preview-section');
    if (previewSection) {
        resizeObserver.observe(previewSection);
    }
});