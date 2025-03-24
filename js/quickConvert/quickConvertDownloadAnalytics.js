// Enhanced analytics for QuickConvert that definitely captures all download actions
// This will use multiple approaches to ensure Excel downloads are tracked

// Wait for DOM content to be loaded
document.addEventListener('DOMContentLoaded', function() {
    // Make sure the global analytics script is loaded
    if (typeof logAnalyticsEvent !== 'function') {
        console.error("Global analytics script not loaded. QuickConvert analytics will not work.");
        return;
    }

    console.log("Setting up enhanced download tracking");
    setupEnhancedDownloadTracking();
});

// Set up enhanced tracking that will definitely catch Excel downloads
function setupEnhancedDownloadTracking() {
    // First approach: Use a mutation observer to watch for new buttons added to the DOM
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    const node = mutation.addedNodes[i];
                    if (node.nodeType === 1) { // Element node
                        // Check if this is a download button
                        if (isDownloadButton(node)) {
                            console.log("Found download button via observer:", node);
                            addDownloadTracking(node);
                        }
                        
                        // Also check children
                        const buttons = node.querySelectorAll('button, a');
                        buttons.forEach(button => {
                            if (isDownloadButton(button)) {
                                console.log("Found download button in new content:", button);
                                addDownloadTracking(button);
                            }
                        });
                    }
                }
            }
        });
    });
    
    // Start observing the body for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Second approach: Scan the document periodically for new buttons
    function scanForDownloadButtons() {
        document.querySelectorAll('button, a').forEach(button => {
            // Skip if we've already added tracking to this button
            if (button.dataset.analyticsTracking === 'added') return;
            
            if (isDownloadButton(button)) {
                console.log("Found download button via scan:", button);
                addDownloadTracking(button);
            }
        });
    }
    
    // Run initial scan after a delay
    setTimeout(scanForDownloadButtons, 1000);
    
    // Then scan periodically
    setInterval(scanForDownloadButtons, 3000);
    
    // Third approach: Add a global click handler to catch all clicks
    document.addEventListener('click', function(event) {
        const element = event.target.closest('button, a');
        if (element && isDownloadButton(element) && element.dataset.analyticsTracking !== 'added') {
            console.log("Caught download button click via global handler:", element);
            // Log the event immediately
            logDownloadEvent(element);
        }
    }, true);
}

// Function to check if an element is a download button
function isDownloadButton(element) {
    if (!element || !element.textContent) return false;
    
    const text = element.textContent.toLowerCase();
    const id = (element.id || '').toLowerCase();
    const classes = (element.className || '').toLowerCase();
    
    // Check for Excel download indicators
    const isExcelDownload = 
        text.includes('excel') || 
        text.includes('xls') || 
        text.includes('spreadsheet') ||
        id.includes('excel') ||
        id.includes('xls') ||
        classes.includes('excel') ||
        classes.includes('xls');
    
    // Check for general download indicators
    const isDownload = 
        text.includes('download') || 
        text.includes('export') || 
        text.includes('save') ||
        id.includes('download') ||
        id.includes('export') ||
        id.includes('save') ||
        classes.includes('download') ||
        classes.includes('export') ||
        classes.includes('save');
    
    // Also check for function attributes
    const hasDownloadFunction = 
        element.getAttribute('onclick')?.toLowerCase().includes('download') ||
        element.getAttribute('onclick')?.toLowerCase().includes('export') ||
        element.getAttribute('onclick')?.toLowerCase().includes('excel') ||
        element.getAttribute('href')?.toLowerCase().includes('download') ||
        element.getAttribute('href')?.toLowerCase().includes('export') ||
        element.getAttribute('href')?.toLowerCase().includes('excel');
    
    // Special case for QuickConvert's Excel download
    const isQuickConvertExcelDownload = 
        id.includes('downloadexcel') || 
        (text.includes('download') && isExcelDownload);
    
    return isQuickConvertExcelDownload || (isDownload && isExcelDownload) || hasDownloadFunction;
}

// Function to add download tracking to a button
function addDownloadTracking(button) {
    // Mark this button as having tracking added
    button.dataset.analyticsTracking = 'added';
    
    // Add click event listener
    button.addEventListener('click', function() {
        logDownloadEvent(button);
    });
}

// Function to log a download event
function logDownloadEvent(button) {
    // Determine what kind of download this is
    let actionType = 'File Download';
    
    if (button.id === 'downloadBtn') {
        actionType = 'QTI Package Download';
    } else if (button.id === 'downloadExcelBtn' || 
              (button.textContent.toLowerCase().includes('excel') && button.textContent.toLowerCase().includes('download'))) {
        actionType = 'Excel File Download';
    } else if (button.textContent.toLowerCase().includes('template')) {
        actionType = 'Template Download';
    }
    
    // Get quiz title if available
    const quizTitle = document.getElementById('quizTitle')?.value.trim() || 'Untitled Quiz';
    
    // Get file name if available
    let fileName = 'Unknown file';
    const fileNameElement = document.getElementById('file-name');
    if (fileNameElement && fileNameElement.textContent) {
        fileName = fileNameElement.textContent;
    }
    
    // Log the event with detailed info
    console.log(`Logging download event: ${actionType}`);
    logAnalyticsEvent(actionType, {
        quizTitle: quizTitle,
        fileName: fileName,
        buttonText: button.textContent.trim(),
        buttonId: button.id || 'unnamed'
    });
}