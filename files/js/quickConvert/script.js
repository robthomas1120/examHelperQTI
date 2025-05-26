document.addEventListener('DOMContentLoaded', function() {
    console.log('QuickConvert: DOM content loaded, initializing application');
    
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
    
    console.log('DOM elements initialization:', {
        dropArea: !!dropArea,
        fileInput: !!fileInput,
        fileInfo: !!fileInfo,
        fileName: !!fileName,
        fileSize: !!fileSize,
        removeFileBtn: !!removeFileBtn,
        csvPreview: !!csvPreview,
        convertBtn: !!convertBtn,
        quizTitle: !!quizTitle,
        quizDescription: !!quizDescription,
        downloadBtn: !!downloadBtn,
        resultsSection: !!resultsSection,
        conversionSummary: !!conversionSummary
    });
    
    // Variables
    let currentFile = null;
    let questionData = null;
    
    // Initialize Excel Handler
    console.log('Initializing Excel Handler');
    if (!window.excelHandler) {
        window.excelHandler = new ExcelHandler();
        console.log('Created new ExcelHandler instance');
    } else {
        console.log('Using existing ExcelHandler instance');
    }
    
    // Track separate validation concerns
    const validationState = {
        hasFile: false,
        hasTitle: false,
        hasDescription: false,
        hasCellErrors: false
    };
    console.log('Initial validation state:', JSON.stringify(validationState));
    
    // Event Listeners
    console.log('Setting up event listeners');
    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('dragleave', handleDragLeave);
    dropArea.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
    removeFileBtn.addEventListener('click', removeFile);
    dropArea.addEventListener('click', triggerFileInput);
    
    // Modified form field listeners to only update their own validation state
    quizTitle.addEventListener('input', function() {
        console.log(`Quiz title updated: "${quizTitle.value}"`);
        validationState.hasTitle = quizTitle.value.trim() !== '';
        console.log(`Title validation state: ${validationState.hasTitle}`);
        updateConvertButtonState();
    });
    
    quizDescription.addEventListener('input', function() {
        console.log(`Quiz description updated: "${quizDescription.value.substring(0, 30)}${quizDescription.value.length > 30 ? '...' : ''}"`);
        validationState.hasDescription = quizDescription.value.trim() !== '';
        console.log(`Description validation state: ${validationState.hasDescription}`);
        updateConvertButtonState();
    });
    
    // Listen for validation state changes from ExcelHandler
    document.addEventListener('validationStateChanged', function(e) {
        console.log('Validation state change event received:', e.detail);
        validationState.hasCellErrors = e.detail.hasErrors;
        console.log(`Cell errors validation state updated: ${validationState.hasCellErrors}`);
        updateConvertButtonState();
    });
    
    convertBtn.addEventListener('click', handleConversion);
    console.log('Event listeners setup complete');
    
    // Functions
    function handleDragOver(e) {
        console.log('Drag over event detected');
        e.preventDefault();
        e.stopPropagation();
        dropArea.classList.add('highlight');
    }
    
    function handleDragLeave(e) {
        console.log('Drag leave event detected');
        e.preventDefault();
        e.stopPropagation();
        dropArea.classList.remove('highlight');
    }
    
    function handleDrop(e) {
        console.log('File drop event detected');
        e.preventDefault();
        e.stopPropagation();
        dropArea.classList.remove('highlight');
        
        const files = e.dataTransfer.files;
        console.log(`Number of dropped files: ${files.length}`);
        if (files.length) {
            console.log(`Processing dropped file: "${files[0].name}" (${files[0].type})`);
            processFile(files[0]);
        }
    }
    
    function triggerFileInput(e) {
        console.log('Drop area clicked');
        // Only trigger file input if not clicking on file info or remove button
        if (fileInfo.classList.contains('hidden') || 
            (!e.target.closest('#fileInfo') && !e.target.closest('#removeFile'))) {
            console.log('Triggering file input click');
            fileInput.click();
        } else {
            console.log('Click was on file info or remove button, not triggering file input');
        }
    }
    
    function handleFileSelect(e) {
        console.log('File input change event detected');
        const files = e.target.files;
        console.log(`Number of selected files: ${files.length}`);
        if (files.length) {
            console.log(`Processing selected file: "${files[0].name}" (${files[0].type})`);
            processFile(files[0]);
        }
    }
    
    function processFile(file) {
        console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
        // Check file type
        const validTypes = [
            'text/csv', 
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        
        // Also check file extension as a fallback
        const fileExtension = file.name.split('.').pop().toLowerCase();
        console.log(`File extension: ${fileExtension}`);
        const validExtensions = ['csv', 'xls', 'xlsx'];
        
        const isValidType = validTypes.includes(file.type);
        const isValidExtension = validExtensions.includes(fileExtension);
        console.log(`Valid file type: ${isValidType}, Valid extension: ${isValidExtension}`);
        
        if (!isValidType && !isValidExtension) {
            console.warn('Invalid file type detected');
            alert('Please upload a CSV or Excel file');
            return;
        }
        
        currentFile = file;
        validationState.hasFile = true;
        console.log('File validated and accepted');
        
        // Show file info
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileInfo.classList.remove('hidden');
        console.log(`Displayed file info: ${file.name} (${formatFileSize(file.size)})`);
        
        // Read and preview file
        console.log('Starting file preview');
        previewFile(file);
        
        // Set default title from filename if empty
        if (!quizTitle.value) {
            const baseName = file.name.split('.')[0];
            quizTitle.value = baseName.replace(/_/g, ' ');
            validationState.hasTitle = quizTitle.value.trim() !== '';
            console.log(`Auto-set quiz title from filename: "${quizTitle.value}"`);
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
        console.log(`Starting preview for file: ${file.name}`);
        csvPreview.innerHTML = '<p>Loading preview...</p>';
        
        const fileExtension = file.name.split('.').pop().toLowerCase();
        console.log(`File extension for preview: ${fileExtension}`);
        
        try {
            if (fileExtension === 'csv') {
                console.log('Handling CSV file preview');
                await previewCSV(file);
            } else if (['xls', 'xlsx'].includes(fileExtension)) {
                console.log('Handling Excel file preview');
                // Use enhanced Excel handler
                console.log('Calling excelHandler.processExcelFile()');
                questionData = await window.excelHandler.processExcelFile(file);
                console.log('Excel processing complete, questions extracted:', questionData ? questionData.length : 0);
                
                // Set initial validation state based on Excel handler
                validationState.hasCellErrors = window.excelHandler.hasValidationErrors;
                console.log(`Initial Excel validation errors: ${validationState.hasCellErrors}`);
                
                // Update the convert button state
                updateConvertButtonState();
            } else {
                console.warn(`Unsupported file format: ${fileExtension}`);
                csvPreview.innerHTML = '<p class="placeholder-text">Unsupported file format</p>';
            }
        } catch (error) {
            console.error('Error previewing file:', error);
            console.error('Stack trace:', error.stack);
            csvPreview.innerHTML = `<p class="error-text">Error previewing file: ${error.message}</p>`;
        }
    }
    
    function previewCSV(file) {
        console.log(`Starting CSV preview for file: ${file.name}`);
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                console.log('FileReader loaded CSV file');
                const content = e.target.result;
                console.log(`CSV content length: ${content.length} characters`);
                
                console.log('Parsing CSV with Papa Parse');
                Papa.parse(content, {
                    skipEmptyLines: true,
                    complete: function(results) {
                        console.log(`Papa Parse complete. Rows: ${results.data.length}, Columns: ${results.data[0] ? results.data[0].length : 0}`);
                        
                        // Process CSV data with our Excel handler
                        try {
                            console.log('Converting Papa Parse results for Excel handler');
                            // Convert Papa Parse results to a format our Excel handler can use
                            window.excelHandler.questionData = results.data;
                            window.excelHandler.editedData = JSON.parse(JSON.stringify(results.data));
                            console.log('Data copied to Excel handler');
                            
                            // Display the data
                            console.log('Calling excelHandler.displayData()');
                            window.excelHandler.displayData();
                            
                            // Process the data
                            console.log('Calling excelHandler.processQuestionData()');
                            questionData = window.excelHandler.processQuestionData();
                            console.log('Question data processed:', questionData);
                            
                            // Set validation state based on Excel handler
                            validationState.hasCellErrors = window.excelHandler.hasValidationErrors;
                            console.log(`CSV validation errors: ${validationState.hasCellErrors}`);
                            
                            // Update the convert button state
                            updateConvertButtonState();
                            
                            console.log('CSV preview complete');
                            resolve();
                        } catch (error) {
                            console.error('Error processing CSV data:', error);
                            console.error('Stack trace:', error.stack);
                            csvPreview.innerHTML = `<p class="error-text">Error processing CSV data: ${error.message}</p>`;
                            reject(error);
                        }
                    },
                    error: function(error) {
                        console.error('Papa Parse error:', error);
                        csvPreview.innerHTML = `<p class="error-text">Error parsing CSV: ${error.message}</p>`;
                        reject(error);
                    }
                });
            };
            
            reader.onerror = function(e) {
                console.error('FileReader error:', e);
                reject(e);
            };
            
            console.log('Starting FileReader.readAsText()');
            reader.readAsText(file);
        });
    }
    
    function removeFile() {
        console.log('Remove file button clicked');
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
        
        console.log('File removed, validation state updated:', JSON.stringify(validationState));
        
        // Update button state
        updateConvertButtonState();
        
        // Hide results section
        resultsSection.classList.add('hidden');
        console.log('Results section hidden');
    }
    
    function updateConvertButtonState() {
        console.log('Updating convert button state');
        // Check all validation conditions
        const hasAllRequiredFields = 
            validationState.hasFile && 
            validationState.hasTitle &&
            validationState.hasDescription;
        
        // Enable convert button only if all required fields present AND no cell errors
        const shouldEnable = hasAllRequiredFields && !validationState.hasCellErrors;
        convertBtn.disabled = !shouldEnable;
        
        console.log(`Convert button ${shouldEnable ? 'enabled' : 'disabled'}: hasFile=${validationState.hasFile}, hasTitle=${validationState.hasTitle}, hasDescription=${validationState.hasDescription}, hasCellErrors=${validationState.hasCellErrors}`);
        
        // Update validation notification
        updateValidationNotification(shouldEnable, validationState.hasCellErrors);
    }
    
    function updateValidationNotification(isValid, hasCellErrors) {
        console.log(`Updating validation notification: isValid=${isValid}, hasCellErrors=${hasCellErrors}`);
        // Remove existing notification if any
        const existingNotification = document.querySelector('.validation-notification');
        if (existingNotification) {
            console.log('Removing existing notification');
            existingNotification.remove();
        }
        
        // Add notification if there are cell errors
        if (hasCellErrors) {
            console.log('Adding cell errors notification');
            const notification = document.createElement('div');
            notification.className = 'validation-notification';
            notification.style = 'margin-top: 10px; padding: 8px 12px; background-color: #fee2e2; border-radius: 4px; color: #b91c1c; font-size: 14px;';
            notification.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please fix all validation errors before converting.';
            
            // Insert after convert button
            convertBtn.parentNode.insertBefore(notification, convertBtn.nextSibling);
        }
    }
    
    function handleConversion() {
        console.log('Convert button clicked, starting conversion process');
        // Final validation before conversion
        const hasAllRequiredFields = 
            validationState.hasFile && 
            validationState.hasTitle &&
            validationState.hasDescription;
        
        const hasCellErrors = window.excelHandler && window.excelHandler.hasValidationErrors;
        
        console.log(`Final validation check: hasAllRequiredFields=${hasAllRequiredFields}, hasCellErrors=${hasCellErrors}`);
        
        // Only proceed if everything is valid
        if (!hasAllRequiredFields || hasCellErrors) {
            if (hasCellErrors) {
                console.warn('Conversion blocked due to cell validation errors');
                // Scroll to error container to make it visible
                const errorContainer = document.getElementById('error-container');
                if (errorContainer) {
                    console.log('Scrolling to error container');
                    errorContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                alert('Please fix all validation errors before converting.');
            } else {
                console.warn('Conversion blocked due to missing required fields');
                alert('Please fill in all required fields.');
            }
            return;
        }
        
        try {
            console.log('All validation passed, creating QTI converter');
            // Create QTI converter
            const converter = new QTIConverter();
            
            // Set quiz metadata
            console.log(`Setting quiz title: "${quizTitle.value.trim()}"`);
            converter.setQuizTitle(quizTitle.value.trim());
            
            console.log(`Setting quiz description (length: ${quizDescription.value.trim().length} chars)`);
            converter.setQuizDescription(quizDescription.value.trim());
            
            // Convert questions
            console.log(`Adding ${questionData ? Object.keys(questionData).length : 'unknown'} questions to converter`);
            converter.addQuestions(questionData);
            
            // Show loading message
            console.log('Creating loading message');
            const loadingMessage = document.createElement('div');
            loadingMessage.id = 'conversion-loading';
            loadingMessage.innerHTML = '<p>Converting questions to QTI format...</p><div class="spinner"></div>';
            document.body.appendChild(loadingMessage);
            
            // Generate QTI package asynchronously
            console.log('Starting asynchronous QTI conversion');
            converter.convert(converter.questions, converter.quizTitle, converter.quizDescription)
                .then(zipBlob => {
                    console.log(`QTI conversion complete, ZIP size: ${zipBlob.size} bytes`);
                    // Remove loading message
                    const loadingElement = document.getElementById('conversion-loading');
                    if (loadingElement) {
                        console.log('Removing loading message');
                        loadingElement.remove();
                    }
                    
                    // Create download URL
                    const downloadUrl = URL.createObjectURL(zipBlob);
                    console.log('Created Blob URL for download');
                    
                    // Set download button attributes
                    const filename = `${quizTitle.value.trim().replace(/\s+/g, '_')}_qti.zip`;
                    console.log(`Setting download filename: ${filename}`);
                    downloadBtn.setAttribute('data-url', downloadUrl);
                    downloadBtn.setAttribute('data-filename', filename);
                    
                    // Show results section
                    resultsSection.classList.remove('hidden');
                    console.log('Results section shown');
                    
                    // Display conversion summary
                    console.log('Generating conversion summary');
                    const summary = countQuestionTypes(questionData);
                    console.log('Question type summary:', summary);
                    
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
                    console.log('Conversion summary displayed');
                    
                    // Scroll to results
                    console.log('Scrolling to results section');
                    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                })
                .catch(error => {
                    // Remove loading message
                    const loadingElement = document.getElementById('conversion-loading');
                    if (loadingElement) {
                        console.log('Removing loading message due to error');
                        loadingElement.remove();
                    }
                    
                    console.error('Error during conversion:', error);
                    console.error('Stack trace:', error.stack);
                    alert('An error occurred during conversion. Please check the console for details.');
                });
        } catch (error) {
            console.error('Error during conversion setup:', error);
            console.error('Stack trace:', error.stack);
            alert(`Error during conversion: ${error.message}`);
        }
    }
    
    // Initialize validation state for title and description
    validationState.hasTitle = quizTitle.value.trim() !== '';
    validationState.hasDescription = quizDescription.value.trim() !== '';
    
    console.log(`Initial validation state: hasTitle=${validationState.hasTitle}, hasDescription=${validationState.hasDescription}`);
    
    // Initial update of the convert button state
    updateConvertButtonState();
    
    // Count question types in data
    function countQuestionTypes(data) {
        console.log('Counting question types in data');
        if (!data) {
            console.log('No data provided for counting');
            return {};
        }
        
        const counts = {
            MC: 0,
            MA: 0,
            TF: 0,
            ESS: 0,
            FIB: 0
        };
        
        console.log(`Data type: ${typeof data}, isArray: ${Array.isArray(data)}`);
        
        // If data is an object with type-specific arrays
        if (typeof data === 'object' && !Array.isArray(data)) {
            console.log('Processing object-based question data with type-specific arrays');
            // Count questions in each type array
            for (const type in counts) {
                if (data[type] && Array.isArray(data[type])) {
                    counts[type] = data[type].length;
                    console.log(`Found ${counts[type]} questions of type ${type}`);
                }
            }
            
            // Also check the 'all' array for any questions not in type-specific arrays
            if (data.all && Array.isArray(data.all)) {
                console.log(`Checking 'all' array with ${data.all.length} items`);
                data.all.forEach(q => {
                    const qType = q.type || (q.data && q.data[0]);
                    if (qType && !counts[qType]) {
                        counts[qType] = (counts[qType] || 0) + 1;
                        console.log(`Found question of type ${qType} in 'all' array`);
                    }
                });
            }
        } else if (Array.isArray(data)) {
            console.log('Processing array-based question data');
            // If data is a simple array, count by first column
            data.forEach((row, index) => {
                if (Array.isArray(row) && row.length > 0) {
                    const type = row[0].toString().trim().toUpperCase();
                    if (counts[type] !== undefined) {
                        counts[type]++;
                        console.log(`Row ${index}: Found question of type ${type}`);
                    } else {
                        console.log(`Row ${index}: Unknown question type "${type}"`);
                    }
                } else {
                    console.log(`Row ${index}: Invalid row format`);
                }
            });
        }
        
        console.log('Final question counts:', counts);
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
        console.log('Download button clicked');
        const url = this.getAttribute('data-url');
        const filename = this.getAttribute('data-filename');
        
        console.log(`Download details: filename=${filename}, URL exists=${!!url}`);
        
        if (url && filename) {
            console.log('Creating temporary download link');
            // Create temporary link
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            
            // Append to body
            document.body.appendChild(link);
            
            // Trigger click
            console.log('Triggering download');
            link.click();
            
            // Clean up
            document.body.removeChild(link);
            console.log('Download initiated');
            
            // Log analytics if available
            if (window.logAnalyticsEvent) {
                console.log('Logging analytics event for download');
                window.logAnalyticsEvent('Downloaded QTI Package', {
                    fileName: currentFile ? currentFile.name : 'Unknown',
                    questionCount: questionData ? (typeof questionData === 'object' ? Object.keys(questionData).length : questionData.length) : 'Unknown'
                });
            }
        } else {
            console.warn('Download failed - missing URL or filename');
        }
    });

    setTimeout(function() {
        console.log('Running delayed preview area sizing');
        const previewSection = document.querySelector('.preview-section');
        const csvPreview = document.getElementById('csv-preview');
        
        if (previewSection && csvPreview) {
            console.log('Setting initial preview section height');
            // Set explicit height to ensure the preview is tall enough
            previewSection.style.minHeight = '70vh';
            csvPreview.style.minHeight = '65vh';
            
            // Force the layout to recalculate
            window.dispatchEvent(new Event('resize'));
            
            console.log('Preview area maximized');
        } else {
            console.warn('Preview elements not found for initial sizing');
        }
    }, 500);
    
    // Add resize observer to dynamically adjust height
    console.log('Setting up ResizeObserver for dynamic sizing');
    const resizeObserver = new ResizeObserver(entries => {
        console.log('ResizeObserver triggered');
        for (let entry of entries) {
            const csvPreview = document.getElementById('csv-preview');
            if (csvPreview) {
                // Calculate available space
                const windowHeight = window.innerHeight;
                const previewRect = entry.target.getBoundingClientRect();
                const availableHeight = windowHeight - previewRect.top - 50; // 50px buffer for footer
                
                // Set the preview height to use available space
                csvPreview.style.height = `${availableHeight}px`;
                
                console.log(`Adjusted preview height to ${availableHeight}px (window: ${windowHeight}px, top: ${previewRect.top}px)`);
            } else {
                console.warn('CSV preview element not found during resize');
            }
        }
    });
    
    // Observe the preview section
    const previewSection = document.querySelector('.preview-section');
    if (previewSection) {
        console.log('Starting ResizeObserver on preview section');
        resizeObserver.observe(previewSection);
    } else {
        console.warn('Preview section not found, cannot observe for resizing');
    }
    
    console.log('QuickConvert initialization complete');
});