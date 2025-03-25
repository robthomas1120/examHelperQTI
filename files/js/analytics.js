// Global Analytics functionality for Exam Helper
// Tracks download/export events across all tabs

const ANALYTICS_FILENAME = "ExamHelper-Analytics.txt";

// Global variable to store file handle
let analyticsFileHandle = null;

console.log("Analytics module loaded");

// Function to log an analytics event
async function logAnalyticsEvent(action, additionalInfo = {}) {
    console.log(`Attempting to log event: ${action}`, additionalInfo);
    try {
        // Use local time instead of UTC
        const now = new Date();
        const dateTime = now.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(',', '');
        
        console.log(`Formatted date/time: ${dateTime}`);
        
        // Get the current page/tab info
        const pageInfo = getCurrentPageInfo();
        console.log(`Current page identified as: ${pageInfo}`);
        
        // Get the quiz title based on the current page
        let quizTitle = "N/A";
        
        // Check for document title in QTI to PDF page
        if (pageInfo === "QtiToPdf") {
            const documentTitleElement = document.getElementById('documentTitle');
            if (documentTitleElement && documentTitleElement.value) {
                quizTitle = documentTitleElement.value.trim() || "Untitled Document";
            }
            console.log(`QtiToPdf document title: ${quizTitle}`);
        } 
        // Check for quiz title in Generate Questions page
        else if (pageInfo === "Generate Questions") {
            const quizTitleElement = document.getElementById('quiz-title');
            if (quizTitleElement && quizTitleElement.value) {
                quizTitle = quizTitleElement.value.trim() || "Untitled Quiz";
            }
            console.log(`Generate Questions quiz title: ${quizTitle}`);
        } 
        // Check for quiz title in QuickConvert page
        else if (pageInfo === "QuickConvert") {
            const quizTitleElement = document.getElementById('quizTitle');
            if (quizTitleElement && quizTitleElement.value) {
                quizTitle = quizTitleElement.value.trim() || "Untitled Quiz";
            }
            console.log(`QuickConvert quiz title: ${quizTitle}`);
        }
        // Check for quiz title in ItemBank page
        else if (pageInfo === "ItemBank") {
            const quizTitleElement = document.getElementById('quiz-title');
            if (quizTitleElement && quizTitleElement.value) {
                quizTitle = quizTitleElement.value.trim() || "Untitled Quiz";
            }
            console.log(`ItemBank quiz title: ${quizTitle}`);
        }
        
        // Create the log entry with page info
        const logEntry = `${dateTime} - [${pageInfo}] - ${quizTitle} - ${action}${additionalInfo ? ' - ' + JSON.stringify(additionalInfo) : ''}\n`;
        console.log(`Log entry created: ${logEntry.trim()}`);
        
        // Append to file
        console.log(`Attempting to append to analytics file...`);
        const success = await appendToAnalyticsFile(logEntry);
        if (success) {
            console.log("Analytics event logged successfully:", logEntry.trim());
        } else {
            console.warn("Failed to log analytics event to file");
        }
        return success;
    } catch (error) {
        console.error("Error logging analytics event:", error);
        console.error("Error details:", error.message, error.stack);
        return false;
    }
}

// Function to get the current page information
function getCurrentPageInfo() {
    console.log("Getting current page info");
    // Get the current page path
    const path = window.location.pathname;
    console.log(`Current path: ${path}`);
    
    // Extract the page name from the path
    let pageName = path.split('/').pop();
    console.log(`Page name from path: ${pageName}`);
    
    // If it's empty (e.g., '/'), use index.html
    if (!pageName) {
        pageName = 'index.html';
        console.log("Empty page name, using default: index.html");
    }
    
    // Remove .html extension if present
    pageName = pageName.replace('.html', '');
    console.log(`Page name without extension: ${pageName}`);
    
    // Handle specific page names
    if (pageName.toLowerCase().includes('qti-to-pdf') || pageName.toLowerCase().includes('qtitopdf')) {
        console.log("Identified as QtiToPdf page");
        return 'QtiToPdf';
    } else if (pageName.toLowerCase().includes('quickconvert')) {
        console.log("Identified as QuickConvert page");
        return 'QuickConvert';
    } else if (pageName.toLowerCase().includes('generate')) {
        console.log("Identified as Generate Questions page");
        return 'Generate Questions';
    } else if (pageName.toLowerCase().includes('item-bank') || pageName.toLowerCase().includes('itembank')) {
        console.log("Identified as ItemBank page");
        return 'ItemBank';
    }
    
    // Look for section headings to be more specific
    const pageHeader = document.querySelector('.page-header h1');
    if (pageHeader) {
        console.log(`Found page header: "${pageHeader.textContent.trim()}"`);
        if (pageHeader.textContent.trim() === 'Item Bank') {
            return 'ItemBank';
        }
        return pageHeader.textContent.trim();
    }
    
    // Default format for other pages
    pageName = pageName.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    // Handle special case for index
    if (pageName === 'Index') {
        pageName = 'Home';
        console.log("Converted Index to Home page name");
    }
    
    console.log(`Final identified page name: ${pageName}`);
    return pageName;
}

// Function to append to analytics file
async function appendToAnalyticsFile(logEntry) {
    console.log("appendToAnalyticsFile called with entry:", logEntry.trim());
    // If File System Access API is not supported, return false
    if (!('showSaveFilePicker' in window)) {
        console.warn("File System Access API not supported in this browser");
        return false;
    }
    
    try {
        // Get or create the file handle
        if (!analyticsFileHandle) {
            console.log("No existing analytics file handle, attempting to get saved handle");
            try {
                // Try to get a saved file handle first
                analyticsFileHandle = await getSavedFileHandle();
                console.log("Retrieved saved file handle:", analyticsFileHandle ? "Success" : "None found");
                
                // If we have a handle, verify we still have permission and the file exists
                if (analyticsFileHandle) {
                    try {
                        // Check if we have permission
                        const permissionState = await verifyPermission(analyticsFileHandle);
                        console.log(`Permission state for saved file: ${permissionState ? "Granted" : "Denied"}`);
                        if (!permissionState) {
                            console.warn("Permission not granted for saved file handle");
                            analyticsFileHandle = null;
                        } else {
                            // Check if the file still exists
                            try {
                                console.log("Checking if file still exists...");
                                await analyticsFileHandle.getFile();
                                console.log("File exists and is accessible");
                            } catch (error) {
                                console.warn("Saved file no longer exists:", error.message);
                                analyticsFileHandle = null;
                            }
                        }
                    } catch (error) {
                        console.warn("Error checking saved file handle:", error);
                        console.warn("Error details:", error.message, error.stack);
                        analyticsFileHandle = null;
                    }
                }
            } catch (error) {
                console.warn("Error getting saved file handle:", error);
                console.warn("Error details:", error.message, error.stack);
                analyticsFileHandle = null;
            }
            
            // If we still don't have a valid file handle, create one automatically
            if (!analyticsFileHandle) {
                console.log("No valid file handle found, creating new analytics file");
                analyticsFileHandle = await createNewAnalyticsFile();
                if (!analyticsFileHandle) {
                    console.warn("Failed to create new analytics file");
                    return false;
                }
                console.log("New analytics file created successfully");
            }
        }
        
        // Read existing content or use default header
        let existingContent = "";
        try {
            console.log("Reading existing file content");
            const file = await analyticsFileHandle.getFile();
            existingContent = await file.text();
            console.log(`Read ${existingContent.length} characters from file`);
        } catch (error) {
            console.error("Error reading file:", error);
            console.error("Error details:", error.message, error.stack);
            // If we can't read the file, start with a header
            console.log("Using default header for file");
            existingContent = "Exam Helper Analytics - Download/Export Tracking\n" +
                            "Date - Time - [Page] - Quiz Title - Action - AdditionalInfo\n" +
                            "--------------------------------------------------------\n";
        }
        
        // If file is empty, add header
        if (!existingContent.trim()) {
            console.log("File is empty, adding header");
            existingContent = "Exam Helper Analytics - Download/Export Tracking\n" +
                            "Date - Time - [Page] - Quiz Title - Action - AdditionalInfo\n" +
                            "--------------------------------------------------------\n";
        }
        
        // Write updated content
        try {
            console.log("Creating writable stream to file");
            const writable = await analyticsFileHandle.createWritable();
            console.log("Writing content to file...");
            await writable.write(existingContent + logEntry);
            console.log("Closing file...");
            await writable.close();
            console.log("File write completed successfully");
            return true;
        } catch (error) {
            console.error("Error writing to file:", error);
            console.error("Error details:", error.message, error.stack);
            
            // If we get a permission error, try to create a new file handle
            if (error.name === 'NotAllowedError') {
                console.log("Permission error, resetting file handle and trying again");
                analyticsFileHandle = null;
                return await appendToAnalyticsFile(logEntry); // Try again with a new file handle
            }
            
            return false;
        }
    } catch (error) {
        console.error("Error in appendToAnalyticsFile:", error);
        console.error("Error details:", error.message, error.stack);
        return false;
    }
}

// Function to create a new analytics file automatically
async function createNewAnalyticsFile() {
    console.log("Creating new analytics file automatically");
    
    try {
        // Show the file picker dialog to create a new file
        console.log("Showing file picker dialog");
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: ANALYTICS_FILENAME,
            types: [{
                description: 'Text Files',
                accept: {'text/plain': ['.txt']}
            }],
            excludeAcceptAllOption: false
        });
        
        // Check if we got a valid file handle
        if (!fileHandle) {
            console.warn("No file handle returned from showSaveFilePicker");
            return null;
        }
        console.log("File picker returned a file handle");
        
        // Create the file with the initial header
        try {
            console.log("Writing initial header to file");
            const header = "Exam Helper Analytics - Download/Export Tracking\n" +
                         "Date - Time - [Page] - Quiz Title - Action - AdditionalInfo\n" +
                         "--------------------------------------------------------\n";
            
            const writable = await fileHandle.createWritable();
            await writable.write(header);
            await writable.close();
            console.log("Initial header written to file");
            
            // Save the file handle for future use
            console.log("Attempting to save file handle for future use");
            await saveFileHandle(fileHandle);
            
            console.log("Created new analytics file successfully");
            return fileHandle;
        } catch (writeError) {
            console.error("Error writing initial content to file:", writeError);
            console.error("Error details:", writeError.message, writeError.stack);
            return null;
        }
    } catch (pickError) {
        if (pickError.name === 'AbortError') {
            console.warn("User cancelled file selection");
        } else {
            console.warn("Error selecting file:", pickError);
            console.warn("Error details:", pickError.message, pickError.stack);
        }
        return null;
    }
}

// Function to save file handle for future sessions
async function saveFileHandle(fileHandle) {
    console.log("saveFileHandle called");
    if (!fileHandle) {
        console.warn("No file handle to save");
        return false;
    }
    
    try {
        // Request persistent permission
        if ('permissions' in navigator) {
            try {
                console.log("Requesting persistent permission for file");
                const permissionResult = await fileHandle.requestPermission({ mode: 'readwrite' });
                console.log(`Permission result: ${permissionResult}`);
                if (permissionResult !== 'granted') {
                    console.warn("Permission not granted for file handle");
                    return false;
                }
            } catch (permError) {
                console.error("Error requesting permission:", permError);
                console.error("Error details:", permError.message, permError.stack);
                return false;
            }
        }
        
        // Store in IndexedDB
        try {
            console.log("Opening IndexedDB to store file handle");
            const db = await openAnalyticsDB();
            const transaction = db.transaction(['handles'], 'readwrite');
            const store = transaction.objectStore('handles');
            
            console.log("Creating promise to track IndexedDB operation");
            return new Promise((resolve, reject) => {
                console.log("Putting file handle in IndexedDB");
                const request = store.put({ id: 'analyticsFile', handle: fileHandle });
                
                request.onsuccess = () => {
                    console.log("File handle saved successfully to IndexedDB");
                    resolve(true);
                };
                
                request.onerror = (event) => {
                    console.error("Error saving file handle to IndexedDB:", event.target.error);
                    reject(event.target.error);
                };
                
                transaction.oncomplete = () => {
                    console.log("IndexedDB transaction completed");
                };
                
                transaction.onerror = (event) => {
                    console.error("IndexedDB transaction error:", event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (dbError) {
            console.error("Database error when saving file handle:", dbError);
            console.error("Error details:", dbError.message, dbError.stack);
            return false;
        }
    } catch (error) {
        console.error("Error saving file handle:", error);
        console.error("Error details:", error.message, error.stack);
        return false;
    }
}

// Function to get saved file handle
async function getSavedFileHandle() {
    console.log("getSavedFileHandle called");
    try {
        console.log("Opening IndexedDB to retrieve file handle");
        const db = await openAnalyticsDB();
        
        console.log("Creating promise to track IndexedDB retrieval");
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['handles'], 'readonly');
            const store = transaction.objectStore('handles');
            console.log("Getting analyticsFile from IndexedDB");
            const request = store.get('analyticsFile');
            
            request.onsuccess = () => {
                if (request.result && request.result.handle) {
                    console.log("Retrieved saved file handle from IndexedDB");
                    resolve(request.result.handle);
                } else {
                    console.log("No saved file handle found in IndexedDB");
                    resolve(null);
                }
            };
            
            request.onerror = (event) => {
                console.error("Error getting saved file handle from IndexedDB:", event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error("Error accessing IndexedDB:", error);
        console.error("Error details:", error.message, error.stack);
        return null;
    }
}

// Function to verify we still have permission to the file
async function verifyPermission(fileHandle) {
    console.log("verifyPermission called");
    if (!fileHandle) {
        console.log("No file handle provided to verify");
        return false;
    }
    
    try {
        // Check current permission state
        if ('permissions' in navigator) {
            try {
                console.log("Checking permission state");
                const options = { mode: 'readwrite' };
                // Check if permission was already granted
                const state = await fileHandle.queryPermission(options);
                console.log(`Current permission state: ${state}`);
                if (state === 'granted') return true;
                
                // If not, request permission
                console.log("Permission not already granted, requesting permission");
                const requestState = await fileHandle.requestPermission(options);
                console.log(`Permission request result: ${requestState}`);
                return requestState === 'granted';
            } catch (error) {
                console.error("Error checking permissions:", error);
                console.error("Error details:", error.message, error.stack);
                return false;
            }
        }
        
        console.log("Permissions API not available, assuming granted");
        return true; // If permissions API not available, assume granted
    } catch (error) {
        console.error("Error verifying permission:", error);
        console.error("Error details:", error.message, error.stack);
        return false;
    }
}

// Function to open or create the IndexedDB database for handles
function openAnalyticsDB() {
    console.log("openAnalyticsDB called");
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            console.error("IndexedDB not supported in this browser");
            reject(new Error("IndexedDB not supported"));
            return;
        }
        
        console.log("Opening IndexedDB database: ExamHelperAnalytics");
        const request = indexedDB.open('ExamHelperAnalytics', 1);
        
        request.onupgradeneeded = (event) => {
            console.log("Database upgrade needed, creating object store");
            const db = event.target.result;
            if (!db.objectStoreNames.contains('handles')) {
                db.createObjectStore('handles', { keyPath: 'id' });
                console.log("Created handles object store");
            } else {
                console.log("Handles object store already exists");
            }
        };
        
        request.onsuccess = (event) => {
            console.log("Database opened successfully");
            resolve(event.target.result);
        };
        
        request.onerror = (event) => {
            console.error("Database error:", event.target.error);
            reject(event.target.error);
        };
    });
}

// Setup event listeners for download/export buttons across all pages
function setupDownloadTracking() {
    console.log("setupDownloadTracking called");
    // Wait a bit for the page to fully load
    setTimeout(() => {
        console.log("Setting up download tracking event listeners");
        
        // Track Generate Questions export button
        const exportQtiBtn = document.getElementById('export-qti-btn');
        if (exportQtiBtn) {
            console.log("Found export-qti-btn, adding event listener");
            exportQtiBtn.addEventListener('click', function(e) {
                console.log("export-qti-btn clicked");
                // Wait for the original click handlers with setTimeout
                setTimeout(async () => {
                    console.log("Logging QTI export analytics event");
                    // Log the analytics event
                    await logAnalyticsEvent("Exported Quiz as QTI");
                }, 100);
            });
        } else {
            console.log("export-qti-btn not found");
        }
        
        // Track ItemBank convert button
        const convertBtn = document.getElementById('convert-btn');
        if (convertBtn) {
            console.log("Found convert-btn, adding event listener");
            convertBtn.addEventListener('click', function() {
                console.log("convert-btn clicked");
                // Get file name if available
                let fileName = 'Unknown file';
                const fileNameElement = document.getElementById('file-name');
                if (fileNameElement && fileNameElement.textContent && fileNameElement.textContent !== 'No file selected') {
                    fileName = fileNameElement.textContent;
                }
                console.log(`Conversion file name: ${fileName}`);
                
                // Get selected question count if available
                let questionCount = 'Unknown';
                const selectedCountEl = document.getElementById('selected-count');
                if (selectedCountEl) {
                    questionCount = selectedCountEl.textContent || 'Unknown';
                }
                console.log(`Selected question count: ${questionCount}`);
                
                // Log the event
                logAnalyticsEvent('Converted to QTI', {
                    fileName: fileName,
                    selectedQuestions: questionCount
                });
            });
        } else {
            console.log("convert-btn not found");
        }
        
        // Track ItemBank download edited file button using MutationObserver
        console.log("Setting up MutationObserver for download edited file button");
        // This is necessary because the button might be added dynamically
        const downloadEditedObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (let node of mutation.addedNodes) {
                        if (node.nodeType === 1) { // Element node
                            const downloadEditedBtn = node.id === 'download-edited-file-btn' ? 
                                                      node : 
                                                      node.querySelector('#download-edited-file-btn');
                                                      
                            if (downloadEditedBtn) {
                                console.log("MutationObserver: download-edited-file-btn detected");
                                // Add event listener if it doesn't already have one
                                if (!downloadEditedBtn.getAttribute('data-analytics')) {
                                    downloadEditedBtn.setAttribute('data-analytics', 'tracked');
                                    
                                    downloadEditedBtn.addEventListener('click', function() {
                                        console.log("download-edited-file-btn clicked (added by MutationObserver)");
                                        // Get file name if available
                                        let fileName = 'Unknown file';
                                        const fileNameElement = document.getElementById('file-name');
                                        if (fileNameElement && fileNameElement.textContent && fileNameElement.textContent !== 'No file selected') {
                                            fileName = fileNameElement.textContent;
                                        }
                                        console.log(`Downloaded edited file name: ${fileName}`);
                                        
                                        // Log the event
                                        logAnalyticsEvent('Downloaded Edited Excel File', {
                                            fileName: fileName
                                        });
                                    });
                                    
                                    console.log('Added analytics tracking to download edited file button');
                                } else {
                                    console.log("Button already has tracking attribute");
                                }
                            }
                        }
                    }
                }
            });
        });
        
        // Start observing the body for the download edited file button
        console.log("Starting MutationObserver on document.body");
        downloadEditedObserver.observe(document.body, { childList: true, subtree: true });
        
        // Track direct access to the download edited file button (if it already exists)
        const downloadEditedBtn = document.getElementById('download-edited-file-btn');
        if (downloadEditedBtn && !downloadEditedBtn.getAttribute('data-analytics')) {
            console.log("Found existing download-edited-file-btn, adding event listener");
            downloadEditedBtn.setAttribute('data-analytics', 'tracked');
            
            downloadEditedBtn.addEventListener('click', function() {
                console.log("download-edited-file-btn clicked (existing button)");
                // Get file name if available
                let fileName = 'Unknown file';
                const fileNameElement = document.getElementById('file-name');
                if (fileNameElement && fileNameElement.textContent && fileNameElement.textContent !== 'No file selected') {
                    fileName = fileNameElement.textContent;
                }
                console.log(`Downloaded edited file name: ${fileName}`);
                
                // Log the event
                logAnalyticsEvent('Downloaded Edited Excel File', {
                    fileName: fileName
                });
            });
            
            console.log('Added analytics tracking to existing download edited file button');
        } else if (downloadEditedBtn) {
            console.log("Existing download-edited-file-btn already has tracking");
        } else {
            console.log("No existing download-edited-file-btn found");
        }
        
        // QTI to PDF download buttons
        const qtiToPdfDownloadBtn = document.getElementById('downloadBtn');
        const qtiToPdfAnswerKeyBtn = document.getElementById('downloadAnswerKeyBtn');
        
        console.log(`QTI to PDF buttons found: downloadBtn=${!!qtiToPdfDownloadBtn}, downloadAnswerKeyBtn=${!!qtiToPdfAnswerKeyBtn}`);
        console.log(`Current page info: ${getCurrentPageInfo()}`);
        
        // Check if we're on the QTI to PDF page by looking for these buttons
        if ((qtiToPdfDownloadBtn || qtiToPdfAnswerKeyBtn) && getCurrentPageInfo() === 'QtiToPdf') {
            console.log("On QTI to PDF page, setting up PDF download tracking");
            
            // Handle main PDF download button
            if (qtiToPdfDownloadBtn) {
                console.log("Adding event listener to QTI to PDF downloadBtn");
                qtiToPdfDownloadBtn.addEventListener('click', function() {
                    console.log("QTI to PDF downloadBtn clicked");
                    // Get file name if available
                    let fileName = 'Unknown file';
                    const fileNameElement = document.getElementById('file-name');
                    if (fileNameElement && fileNameElement.textContent && fileNameElement.textContent !== 'No file selected') {
                        fileName = fileNameElement.textContent;
                    }
                    console.log(`PDF file name: ${fileName}`);
                    
                    // Get selected college
                    const collegeSelect = document.getElementById('collegeSelect');
                    const college = collegeSelect ? collegeSelect.options[collegeSelect.selectedIndex].value : 'Unknown';
                    console.log(`Selected college: ${college}`);
                    
                    // Get paper size
                    const paperSizeSelect = document.getElementById('paperSize');
                    const paperSize = paperSizeSelect ? paperSizeSelect.options[paperSizeSelect.selectedIndex].value : 'Unknown';
                    console.log(`Selected paper size: ${paperSize}`);
                    
                    // Log the download event
                    logAnalyticsEvent('Downloaded PDF', {
                        fileName: fileName,
                        college: college,
                        paperSize: paperSize
                    });
                });
            }
            
            // Handle answer key download button
            if (qtiToPdfAnswerKeyBtn) {
                console.log("Adding event listener to QTI to PDF downloadAnswerKeyBtn");
                qtiToPdfAnswerKeyBtn.addEventListener('click', function() {
                    console.log("QTI to PDF downloadAnswerKeyBtn clicked");
                    // Get file name if available
                    let fileName = 'Unknown file';
                    const fileNameElement = document.getElementById('file-name');
                    if (fileNameElement && fileNameElement.textContent && fileNameElement.textContent !== 'No file selected') {
                        fileName = fileNameElement.textContent;
                    }
                    console.log(`Answer key file name: ${fileName}`);
                    
                    // Get selected college
                    const collegeSelect = document.getElementById('collegeSelect');
                    const college = collegeSelect ? collegeSelect.options[collegeSelect.selectedIndex].value : 'Unknown';
                    console.log(`Selected college: ${college}`);
                    
                    // Log the download event
                    logAnalyticsEvent('Downloaded Answer Key PDF', {
                        fileName: fileName,
                        college: college
                    });
                });
            }
        } else {
            console.log("Not on QTI to PDF page or buttons not found");
        }
        
        // Track QuickConvert download button
        const quickConvertDownloadBtn = document.querySelector('#results-section #downloadBtn');
        if (quickConvertDownloadBtn && getCurrentPageInfo() === 'QuickConvert') {
            console.log("Found QuickConvert downloadBtn, adding event listener");
            quickConvertDownloadBtn.addEventListener('click', function() {
                console.log("QuickConvert downloadBtn clicked");
                // Get file name if available
                let fileName = 'Unknown file';
                const fileNameElement = document.getElementById('file-name');
                if (fileNameElement && fileNameElement.textContent) {
                    fileName = fileNameElement.textContent;
                }
                console.log(`QuickConvert file name: ${fileName}`);
                
                const questionCount = getQuickConvertQuestionCount();
                console.log(`QuickConvert question count: ${questionCount}`);
                
                // Log the download event
                logAnalyticsEvent('Downloaded QTI Package', {
                    fileName: fileName,
                    questionCount: questionCount
                });
            });
        } else if (quickConvertDownloadBtn) {
            console.log("QuickConvert downloadBtn found but not on QuickConvert page");
        } else {
            console.log("QuickConvert downloadBtn not found");
        }
        
        console.log("Download tracking setup complete");
    }, 500);
}

// Helper function to get question count from QuickConvert
function getQuickConvertQuestionCount() {
    console.log("Getting QuickConvert question count");
    const previewBody = document.getElementById('csv-preview-body');
    if (previewBody) {
        const rows = previewBody.querySelectorAll('tr');
        const count = rows.length > 0 ? rows.length - 1 : 0; // Subtract header row
        console.log(`Found ${count} questions in CSV preview`);
        return count;
    }
    console.log("CSV preview body not found");
    return 'Unknown';
}

// Initialize download tracking when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, setting up download tracking");
    setupDownloadTracking();
    console.log("Analytics initialization complete");
});