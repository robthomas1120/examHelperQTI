// Enhanced analytics for QuickConvert that definitely captures all download actions
// This will use multiple approaches to ensure Excel downloads are tracked

// Wait for DOM content to be loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("QuickConvert Enhanced Analytics: DOM loaded");
    
    // Make sure the global analytics script is loaded
    if (typeof logAnalyticsEvent !== 'function') {
        console.error("Global analytics script not loaded. QuickConvert analytics will not work.");
        return;
    }

    console.log("Setting up enhanced download tracking for QuickConvert");
    setupEnhancedDownloadTracking();
});

// Set up enhanced tracking that will definitely catch Excel downloads
function setupEnhancedDownloadTracking() {
    console.log("Setting up enhanced download tracking - initializing three tracking approaches");
    
    // First approach: Use a mutation observer to watch for new buttons added to the DOM
    console.log("Approach 1: Setting up MutationObserver for dynamic buttons");
    const observer = new MutationObserver(function(mutations) {
        console.log(`MutationObserver triggered: ${mutations.length} mutations detected`);
        
        mutations.forEach(function(mutation, index) {
            console.log(`Processing mutation ${index+1}/${mutations.length}, type: ${mutation.type}, added nodes: ${mutation.addedNodes.length}`);
            
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    const node = mutation.addedNodes[i];
                    if (node.nodeType === 1) { // Element node
                        console.log(`Examining added node: ${node.tagName || 'TEXT_NODE'}${node.id ? ' #' + node.id : ''}${node.className ? ' .' + node.className.replace(/ /g, '.') : ''}`);
                        
                        // Check if this is a download button
                        if (isDownloadButton(node)) {
                            console.log("Found download button via observer:", node.outerHTML.substring(0, 100) + (node.outerHTML.length > 100 ? '...' : ''));
                            addDownloadTracking(node);
                        }
                        
                        // Also check children
                        const buttons = node.querySelectorAll('button, a');
                        console.log(`Found ${buttons.length} potential button(s) in children`);
                        
                        buttons.forEach((button, buttonIndex) => {
                            console.log(`Examining child button ${buttonIndex+1}/${buttons.length}: ${button.tagName}${button.id ? ' #' + button.id : ''}${button.className ? ' .' + button.className.replace(/ /g, '.') : ''}`);
                            
                            if (isDownloadButton(button)) {
                                console.log("Found download button in new content:", button.outerHTML.substring(0, 100) + (button.outerHTML.length > 100 ? '...' : ''));
                                addDownloadTracking(button);
                            } else {
                                console.log("Button is not a download button");
                            }
                        });
                    }
                }
            }
        });
    });
    
    // Start observing the body for changes
    console.log("Starting MutationObserver on document.body");
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Second approach: Scan the document periodically for new buttons
    function scanForDownloadButtons() {
        console.log("Periodic scan: Searching for download buttons");
        const allButtons = document.querySelectorAll('button, a');
        console.log(`Periodic scan found ${allButtons.length} potential button elements`);
        
        let downloadButtonsFound = 0;
        let alreadyTrackedButtons = 0;
        
        allButtons.forEach((button, index) => {
            // Skip if we've already added tracking to this button
            if (button.dataset.analyticsTracking === 'added') {
                alreadyTrackedButtons++;
                return;
            }
            
            if (isDownloadButton(button)) {
                console.log(`Periodic scan: Found download button (${index+1}/${allButtons.length}):`, button.outerHTML.substring(0, 100) + (button.outerHTML.length > 100 ? '...' : ''));
                addDownloadTracking(button);
                downloadButtonsFound++;
            }
        });
        
        console.log(`Periodic scan complete: ${downloadButtonsFound} new download buttons found, ${alreadyTrackedButtons} buttons already tracked`);
    }
    
    // Run initial scan after a delay
    console.log("Scheduling initial button scan in 1 second");
    setTimeout(function() {
        console.log("Running initial button scan");
        scanForDownloadButtons();
    }, 1000);
    
    // Then scan periodically
    console.log("Setting up periodic button scan every 3 seconds");
    setInterval(function() {
        console.log("Running periodic button scan");
        scanForDownloadButtons();
    }, 3000);
    
    // Third approach: Add a global click handler to catch all clicks
    console.log("Approach 3: Setting up global click handler");
    document.addEventListener('click', function(event) {
        console.log("Click detected, checking if it's a download button");
        
        const element = event.target.closest('button, a');
        if (!element) {
            console.log("Click was not on a button or link");
            return;
        }
        
        console.log(`Click detected on: ${element.tagName}${element.id ? ' #' + element.id : ''}${element.className ? ' .' + element.className.replace(/ /g, '.') : ''}`);
        
        if (element && isDownloadButton(element)) {
            console.log("Element is a download button");
            
            if (element.dataset.analyticsTracking !== 'added') {
                console.log("Download button wasn't previously tracked, logging via global handler");
                // Log the event immediately
                logDownloadEvent(element);
            } else {
                console.log("Download button was already tracked, event will be logged by its own listener");
            }
        } else {
            console.log("Element is not a download button");
        }
    }, true);
    
    console.log("Enhanced download tracking setup complete");
}

// Function to check if an element is a download button
function isDownloadButton(element) {
    if (!element || !element.textContent) {
        console.log("isDownloadButton: Element is null or has no text content");
        return false;
    }
    
    const text = element.textContent.toLowerCase();
    const id = (element.id || '').toLowerCase();
    const classes = (element.className || '').toLowerCase();
    
    console.log(`isDownloadButton checking: text="${text.substring(0, 30)}${text.length > 30 ? '...' : ''}", id="${id}", classes="${classes}"`);
    
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
    const onclick = element.getAttribute('onclick');
    const href = element.getAttribute('href');
    
    const hasDownloadFunction = 
        (onclick && onclick.toLowerCase().includes('download')) ||
        (onclick && onclick.toLowerCase().includes('export')) ||
        (onclick && onclick.toLowerCase().includes('excel')) ||
        (href && href.toLowerCase().includes('download')) ||
        (href && href.toLowerCase().includes('export')) ||
        (href && href.toLowerCase().includes('excel'));
    
    // Special case for QuickConvert's Excel download
    const isQuickConvertExcelDownload = 
        id.includes('downloadexcel') || 
        (text.includes('download') && isExcelDownload);
    
    console.log(`Button properties: isExcelDownload=${isExcelDownload}, isDownload=${isDownload}, hasDownloadFunction=${hasDownloadFunction}, isQuickConvertExcelDownload=${isQuickConvertExcelDownload}`);
    
    const result = isQuickConvertExcelDownload || (isDownload && isExcelDownload) || hasDownloadFunction;
    console.log(`isDownloadButton result: ${result}`);
    
    return result;
}

// Function to add download tracking to a button
function addDownloadTracking(button) {
    console.log(`Adding download tracking to button: ${button.tagName}${button.id ? ' #' + button.id : ''}${button.className ? ' .' + button.className.replace(/ /g, '.') : ''}`);
    
    // Check if tracking was already added
    if (button.dataset.analyticsTracking === 'added') {
        console.log("Button already has tracking, skipping");
        return;
    }
    
    // Mark this button as having tracking added
    button.dataset.analyticsTracking = 'added';
    console.log("Marked button with data-analytics-tracking='added'");
    
    // Add click event listener
    console.log("Adding click event listener for analytics");
    button.addEventListener('click', function(event) {
        console.log(`Download button clicked: ${button.tagName}${button.id ? ' #' + button.id : ''}${button.className ? ' .' + button.className.replace(/ /g, '.') : ''}`);
        logDownloadEvent(button);
    });
    
    console.log("Download tracking added successfully");
}

// Function to log a download event
function logDownloadEvent(button) {
    console.log(`logDownloadEvent called for: ${button.tagName}${button.id ? ' #' + button.id : ''}${button.className ? ' .' + button.className.replace(/ /g, '.') : ''}`);
    
    // Determine what kind of download this is
    let actionType = 'File Download';
    const buttonText = (button.textContent || '').toLowerCase().trim();
    const buttonId = (button.id || '').toLowerCase();
    
    console.log(`Button properties: id="${buttonId}", text="${buttonText}"`);
    
    if (buttonId === 'downloadbtn') {
        actionType = 'QTI Package Download';
        console.log("Identified as QTI Package Download");
    } else if (buttonId === 'downloadexcelbtn' || 
              (buttonText.includes('excel') && buttonText.includes('download'))) {
        actionType = 'Excel File Download';
        console.log("Identified as Excel File Download");
    } else if (buttonText.includes('template')) {
        actionType = 'Template Download';
        console.log("Identified as Template Download");
    } else {
        console.log("Identified as generic File Download");
    }
    
    // Get quiz title if available
    const quizTitleElement = document.getElementById('quizTitle');
    const quizTitle = quizTitleElement ? quizTitleElement.value.trim() : 'Untitled Quiz';
    console.log(`Quiz title: "${quizTitle}"`);
    
    // Get file name if available
    let fileName = 'Unknown file';
    const fileNameElement = document.getElementById('file-name');
    if (fileNameElement && fileNameElement.textContent) {
        fileName = fileNameElement.textContent;
        console.log(`File name: "${fileName}"`);
    } else {
        console.log("File name element not found or empty");
    }
    
    // Collect additional details for the log
    const additionalInfo = {
        quizTitle: quizTitle,
        fileName: fileName,
        buttonText: button.textContent.trim(),
        buttonId: button.id || 'unnamed',
        timestamp: new Date().toISOString()
    };
    
    console.log(`Logging download event: ${actionType}`, additionalInfo);
    
    // Try-catch to prevent analytics errors from breaking functionality
    try {
        logAnalyticsEvent(actionType, additionalInfo);
        console.log("Analytics event logged successfully");
    } catch (error) {
        console.error("Error logging analytics event:", error);
        console.error("Error details:", error.message, error.stack);
    }
}

// Log that the enhanced analytics script has loaded
console.log("QuickConvert Enhanced Analytics script loaded");