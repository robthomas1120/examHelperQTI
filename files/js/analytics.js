// Global Analytics functionality for Exam Helper
// Tracks download/export events across all tabs

const ANALYTICS_FILENAME = "ExamHelper-Analytics.txt";

// Global variable to store file handle
let analyticsFileHandle = null;

// Function to log an analytics event
async function logAnalyticsEvent(action, additionalInfo = {}) {
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
        
        // Get the current page/tab info
        const pageInfo = getCurrentPageInfo();
        
        // Get the quiz title based on the current page
        let quizTitle = "N/A";
        
        // Check for document title in QTI to PDF page
        if (pageInfo === "QtiToPdf") {
            const documentTitleElement = document.getElementById('documentTitle');
            if (documentTitleElement && documentTitleElement.value) {
                quizTitle = documentTitleElement.value.trim() || "Untitled Document";
            }
        } 
        // Check for quiz title in Generate Questions page
        else if (pageInfo === "Generate Questions") {
            const quizTitleElement = document.getElementById('quiz-title');
            if (quizTitleElement && quizTitleElement.value) {
                quizTitle = quizTitleElement.value.trim() || "Untitled Quiz";
            }
        } 
        // Check for quiz title in QuickConvert page
        else if (pageInfo === "QuickConvert") {
            const quizTitleElement = document.getElementById('quizTitle');
            if (quizTitleElement && quizTitleElement.value) {
                quizTitle = quizTitleElement.value.trim() || "Untitled Quiz";
            }
        }
        // Check for quiz title in ItemBank page
        else if (pageInfo === "ItemBank") {
            const quizTitleElement = document.getElementById('quiz-title');
            if (quizTitleElement && quizTitleElement.value) {
                quizTitle = quizTitleElement.value.trim() || "Untitled Quiz";
            }
        }
        
        // Create the log entry with page info
        const logEntry = `${dateTime} - [${pageInfo}] - ${quizTitle} - ${action}${additionalInfo ? ' - ' + JSON.stringify(additionalInfo) : ''}\n`;
        
        // Append to file
        const success = await appendToAnalyticsFile(logEntry);
        if (success) {
            console.log("Analytics event logged:", logEntry.trim());
        } else {
            console.warn("Failed to log analytics event to file");
        }
        return success;
    } catch (error) {
        console.error("Error logging analytics event:", error);
        return false;
    }
}

// Function to get the current page information
function getCurrentPageInfo() {
    // Get the current page path
    const path = window.location.pathname;
    
    // Extract the page name from the path
    let pageName = path.split('/').pop();
    
    // If it's empty (e.g., '/'), use index.html
    if (!pageName) {
        pageName = 'index.html';
    }
    
    // Remove .html extension if present
    pageName = pageName.replace('.html', '');
    
    // Handle specific page names
    if (pageName.toLowerCase().includes('qti-to-pdf') || pageName.toLowerCase().includes('qtitopdf')) {
        return 'QtiToPdf';
    } else if (pageName.toLowerCase().includes('quickconvert')) {
        return 'QuickConvert';
    } else if (pageName.toLowerCase().includes('generate')) {
        return 'Generate Questions';
    } else if (pageName.toLowerCase().includes('item-bank') || pageName.toLowerCase().includes('itembank')) {
        return 'ItemBank';
    }
    
    // Look for section headings to be more specific
    const pageHeader = document.querySelector('.page-header h1');
    if (pageHeader) {
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
    }
    
    return pageName;
}

// Function to append to analytics file
async function appendToAnalyticsFile(logEntry) {
    // If File System Access API is not supported, return false
    if (!('showSaveFilePicker' in window)) {
        console.warn("File System Access API not supported in this browser");
        return false;
    }
    
    try {
        // Get or create the file handle
        if (!analyticsFileHandle) {
            try {
                // Try to get a saved file handle first
                analyticsFileHandle = await getSavedFileHandle();
                
                // If we have a handle, verify we still have permission and the file exists
                if (analyticsFileHandle) {
                    try {
                        // Check if we have permission
                        const permissionState = await verifyPermission(analyticsFileHandle);
                        if (!permissionState) {
                            console.warn("Permission not granted for saved file handle");
                            analyticsFileHandle = null;
                        } else {
                            // Check if the file still exists
                            try {
                                await analyticsFileHandle.getFile();
                            } catch (error) {
                                console.warn("Saved file no longer exists");
                                analyticsFileHandle = null;
                            }
                        }
                    } catch (error) {
                        console.warn("Error checking saved file handle:", error);
                        analyticsFileHandle = null;
                    }
                }
            } catch (error) {
                console.warn("Error getting saved file handle:", error);
                analyticsFileHandle = null;
            }
            
            // If we still don't have a valid file handle, create one automatically
            if (!analyticsFileHandle) {
                analyticsFileHandle = await createNewAnalyticsFile();
                if (!analyticsFileHandle) {
                    console.warn("Failed to create new analytics file");
                    return false;
                }
            }
        }
        
        // Read existing content or use default header
        let existingContent = "";
        try {
            const file = await analyticsFileHandle.getFile();
            existingContent = await file.text();
        } catch (error) {
            console.error("Error reading file:", error);
            // If we can't read the file, start with a header
            existingContent = "Exam Helper Analytics - Download/Export Tracking\n" +
                              "Date - Time - [Page] - Quiz Title - Action - AdditionalInfo\n" +
                              "--------------------------------------------------------\n";
        }
        
        // If file is empty, add header
        if (!existingContent.trim()) {
            existingContent = "Exam Helper Analytics - Download/Export Tracking\n" +
                              "Date - Time - [Page] - Quiz Title - Action - AdditionalInfo\n" +
                              "--------------------------------------------------------\n";
        }
        
        // Write updated content
        try {
            const writable = await analyticsFileHandle.createWritable();
            await writable.write(existingContent + logEntry);
            await writable.close();
            return true;
        } catch (error) {
            console.error("Error writing to file:", error);
            
            // If we get a permission error, try to create a new file handle
            if (error.name === 'NotAllowedError') {
                analyticsFileHandle = null;
                return await appendToAnalyticsFile(logEntry); // Try again with a new file handle
            }
            
            return false;
        }
    } catch (error) {
        console.error("Error in appendToAnalyticsFile:", error);
        return false;
    }
}

// Function to create a new analytics file automatically
async function createNewAnalyticsFile() {
    console.log("Creating new analytics file automatically");
    
    try {
        // Show the file picker dialog to create a new file
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
        
        // Create the file with the initial header
        try {
            const header = "Exam Helper Analytics - Download/Export Tracking\n" +
                           "Date - Time - [Page] - Quiz Title - Action - AdditionalInfo\n" +
                           "--------------------------------------------------------\n";
            
            const writable = await fileHandle.createWritable();
            await writable.write(header);
            await writable.close();
            
            // Save the file handle for future use
            await saveFileHandle(fileHandle);
            
            console.log("Created new analytics file successfully");
            return fileHandle;
        } catch (writeError) {
            console.error("Error writing initial content to file:", writeError);
            return null;
        }
    } catch (pickError) {
        console.warn("User cancelled file selection or other error:", pickError);
        return null;
    }
}

// Function to save file handle for future sessions
async function saveFileHandle(fileHandle) {
    if (!fileHandle) {
        console.warn("No file handle to save");
        return false;
    }
    
    try {
        // Request persistent permission
        if ('permissions' in navigator) {
            try {
                const permissionResult = await fileHandle.requestPermission({ mode: 'readwrite' });
                if (permissionResult !== 'granted') {
                    console.warn("Permission not granted for file handle");
                    return false;
                }
            } catch (permError) {
                console.error("Error requesting permission:", permError);
                return false;
            }
        }
        
        // Store in IndexedDB
        try {
            const db = await openAnalyticsDB();
            const transaction = db.transaction(['handles'], 'readwrite');
            const store = transaction.objectStore('handles');
            
            return new Promise((resolve, reject) => {
                const request = store.put({ id: 'analyticsFile', handle: fileHandle });
                
                request.onsuccess = () => {
                    console.log("File handle saved successfully");
                    resolve(true);
                };
                
                request.onerror = (event) => {
                    console.error("Error saving file handle to IndexedDB:", event.target.error);
                    reject(event.target.error);
                };
                
                transaction.oncomplete = () => {
                    console.log("Transaction completed");
                };
                
                transaction.onerror = (event) => {
                    console.error("Transaction error:", event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (dbError) {
            console.error("Database error when saving file handle:", dbError);
            return false;
        }
    } catch (error) {
        console.error("Error saving file handle:", error);
        return false;
    }
}

// Function to get saved file handle
async function getSavedFileHandle() {
    try {
        const db = await openAnalyticsDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['handles'], 'readonly');
            const store = transaction.objectStore('handles');
            const request = store.get('analyticsFile');
            
            request.onsuccess = () => {
                if (request.result && request.result.handle) {
                    console.log("Retrieved saved file handle");
                    resolve(request.result.handle);
                } else {
                    console.log("No saved file handle found");
                    resolve(null);
                }
            };
            
            request.onerror = (event) => {
                console.error("Error getting saved file handle:", event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error("Error accessing IndexedDB:", error);
        return null;
    }
}

// Function to verify we still have permission to the file
async function verifyPermission(fileHandle) {
    if (!fileHandle) return false;
    
    try {
        // Check current permission state
        if ('permissions' in navigator) {
            try {
                const options = { mode: 'readwrite' };
                // Check if permission was already granted
                const state = await fileHandle.queryPermission(options);
                if (state === 'granted') return true;
                
                // If not, request permission
                const requestState = await fileHandle.requestPermission(options);
                return requestState === 'granted';
            } catch (error) {
                console.error("Error checking permissions:", error);
                return false;
            }
        }
        
        return true; // If permissions API not available, assume granted
    } catch (error) {
        console.error("Error verifying permission:", error);
        return false;
    }
}

// Function to open or create the IndexedDB database for handles
function openAnalyticsDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error("IndexedDB not supported"));
            return;
        }
        
        const request = indexedDB.open('ExamHelperAnalytics', 1);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('handles')) {
                db.createObjectStore('handles', { keyPath: 'id' });
                console.log("Created handles object store");
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
    // Wait a bit for the page to fully load
    setTimeout(() => {
        // Track Generate Questions export button
        const exportQtiBtn = document.getElementById('export-qti-btn');
        if (exportQtiBtn) {
            exportQtiBtn.addEventListener('click', function(e) {
                // Wait for the original click handlers with setTimeout
                setTimeout(async () => {
                    // Log the analytics event
                    await logAnalyticsEvent("Exported Quiz as QTI");
                }, 100);
            });
        }
        
        // Track ItemBank convert button
        const convertBtn = document.getElementById('convert-btn');
        if (convertBtn) {
            convertBtn.addEventListener('click', function() {
                // Get file name if available
                let fileName = 'Unknown file';
                const fileNameElement = document.getElementById('file-name');
                if (fileNameElement && fileNameElement.textContent && fileNameElement.textContent !== 'No file selected') {
                    fileName = fileNameElement.textContent;
                }
                
                // Get selected question count if available
                let questionCount = 'Unknown';
                const selectedCountEl = document.getElementById('selected-count');
                if (selectedCountEl) {
                    questionCount = selectedCountEl.textContent || 'Unknown';
                }
                
                // Log the event
                logAnalyticsEvent('Converted to QTI', {
                    fileName: fileName,
                    selectedQuestions: questionCount
                });
            });
        }
        
        // Track ItemBank download edited file button using MutationObserver
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
                                // Add event listener if it doesn't already have one
                                if (!downloadEditedBtn.getAttribute('data-analytics')) {
                                    downloadEditedBtn.setAttribute('data-analytics', 'tracked');
                                    
                                    downloadEditedBtn.addEventListener('click', function() {
                                        // Get file name if available
                                        let fileName = 'Unknown file';
                                        const fileNameElement = document.getElementById('file-name');
                                        if (fileNameElement && fileNameElement.textContent && fileNameElement.textContent !== 'No file selected') {
                                            fileName = fileNameElement.textContent;
                                        }
                                        
                                        // Log the event
                                        logAnalyticsEvent('Downloaded Edited Excel File', {
                                            fileName: fileName
                                        });
                                    });
                                    
                                    console.log('Added analytics tracking to download edited file button');
                                }
                            }
                        }
                    }
                }
            });
        });
        
        // Start observing the body for the download edited file button
        downloadEditedObserver.observe(document.body, { childList: true, subtree: true });
        
        // Track direct access to the download edited file button (if it already exists)
        const downloadEditedBtn = document.getElementById('download-edited-file-btn');
        if (downloadEditedBtn && !downloadEditedBtn.getAttribute('data-analytics')) {
            downloadEditedBtn.setAttribute('data-analytics', 'tracked');
            
            downloadEditedBtn.addEventListener('click', function() {
                // Get file name if available
                let fileName = 'Unknown file';
                const fileNameElement = document.getElementById('file-name');
                if (fileNameElement && fileNameElement.textContent && fileNameElement.textContent !== 'No file selected') {
                    fileName = fileNameElement.textContent;
                }
                
                // Log the event
                logAnalyticsEvent('Downloaded Edited Excel File', {
                    fileName: fileName
                });
            });
            
            console.log('Added analytics tracking to existing download edited file button');
        }
        
        // QTI to PDF download buttons
        const qtiToPdfDownloadBtn = document.getElementById('downloadBtn');
        const qtiToPdfAnswerKeyBtn = document.getElementById('downloadAnswerKeyBtn');
        
        // Check if we're on the QTI to PDF page by looking for these buttons
        if ((qtiToPdfDownloadBtn || qtiToPdfAnswerKeyBtn) && getCurrentPageInfo() === 'QtiToPdf') {
            // Handle main PDF download button
            if (qtiToPdfDownloadBtn) {
                qtiToPdfDownloadBtn.addEventListener('click', function() {
                    // Get file name if available
                    let fileName = 'Unknown file';
                    const fileNameElement = document.getElementById('file-name');
                    if (fileNameElement && fileNameElement.textContent && fileNameElement.textContent !== 'No file selected') {
                        fileName = fileNameElement.textContent;
                    }
                    
                    // Get selected college
                    const collegeSelect = document.getElementById('collegeSelect');
                    const college = collegeSelect ? collegeSelect.options[collegeSelect.selectedIndex].value : 'Unknown';
                    
                    // Get paper size
                    const paperSizeSelect = document.getElementById('paperSize');
                    const paperSize = paperSizeSelect ? paperSizeSelect.options[paperSizeSelect.selectedIndex].value : 'Unknown';
                    
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
                qtiToPdfAnswerKeyBtn.addEventListener('click', function() {
                    // Get file name if available
                    let fileName = 'Unknown file';
                    const fileNameElement = document.getElementById('file-name');
                    if (fileNameElement && fileNameElement.textContent && fileNameElement.textContent !== 'No file selected') {
                        fileName = fileNameElement.textContent;
                    }
                    
                    // Get selected college
                    const collegeSelect = document.getElementById('collegeSelect');
                    const college = collegeSelect ? collegeSelect.options[collegeSelect.selectedIndex].value : 'Unknown';
                    
                    // Log the download event
                    logAnalyticsEvent('Downloaded Answer Key PDF', {
                        fileName: fileName,
                        college: college
                    });
                });
            }
        }
        
        // Track QuickConvert download button
        const quickConvertDownloadBtn = document.querySelector('#results-section #downloadBtn');
        if (quickConvertDownloadBtn && getCurrentPageInfo() === 'QuickConvert') {
            quickConvertDownloadBtn.addEventListener('click', function() {
                // Get file name if available
                let fileName = 'Unknown file';
                const fileNameElement = document.getElementById('file-name');
                if (fileNameElement && fileNameElement.textContent) {
                    fileName = fileNameElement.textContent;
                }
                
                // Log the download event
                logAnalyticsEvent('Downloaded QTI Package', {
                    fileName: fileName,
                    questionCount: getQuickConvertQuestionCount()
                });
            });
        }
    }, 500);
}

// Helper function to get question count from QuickConvert
function getQuickConvertQuestionCount() {
    const previewBody = document.getElementById('csv-preview-body');
    if (previewBody) {
        const rows = previewBody.querySelectorAll('tr');
        return rows.length > 0 ? rows.length - 1 : 0; // Subtract header row
    }
    return 'Unknown';
}

// Initialize download tracking when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, setting up download tracking");
    setupDownloadTracking();
});