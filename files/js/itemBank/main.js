/**
 * Item Bank Application - Main Entry Point
 * 
 * This file serves as the main initialization point for the Item Bank application.
 * It connects all core components (FileHandler, QuestionProcessor, UIController, etc.),
 * sets up event listeners, and handles the sample data loading functionality.
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Item Bank application components...');
    
    try {
        // Initialize core system components
        const fileHandler = new FileHandler();
        const questionProcessor = new QuestionProcessor();
        const uiController = new UIController(fileHandler, questionProcessor);
        const excelFilePreview = new ExcelFilePreview();
        const qtiExportUI = new QTIExportUI(questionProcessor);
        
        // Expose application instances to global scope for debugging and development purposes
        window.app = {
            fileHandler,
            questionProcessor,
            uiController,
            qtiExportUI,
            excelFilePreview
        };
        
        // Make excelFilePreview available globally for external error handling
        window.excelFilePreview = excelFilePreview;
        
        console.log('Core components initialized successfully');
        
        // Set up sample data loader functionality
        
        // Initialize Excel file preview component if available
        initializeExcelPreview(window.excelFilePreview);
        
        console.log('Item Bank application initialization complete');
    } catch (error) {
        console.error('Critical error during application initialization:', error);
        alert('Failed to initialize application: ' + error.message);
    }
});

/**
 * Initializes the sample data loader functionality
 * 
 * @param {UIController} uiController - The UI controller instance
 * @param {FileHandler} fileHandler - The file handler instance
 * @param {QuestionProcessor} questionProcessor - The question processor instance
 */


/**
 * Creates a sample dataset with various question types for demonstration
 * 
 * @returns {Object} Object containing categorized sample questions
 */


/**
 * Initializes the Excel file preview component if available
 * 
 * @param {ExcelFilePreview} excelFilePreview - The Excel file preview instance
 */
function initializeExcelPreview(excelFilePreview) {
    if (!excelFilePreview) {
        console.warn('Excel file preview component not available');
        return;
    }
    
    console.log('Initializing Excel file preview component...');
    
    try {
        // Get required DOM elements
        const elements = {
            dropArea: document.getElementById('dropArea'),
            fileInput: document.getElementById('excelFile'),
            fileInfo: document.getElementById('fileInfo'),
            fileName: document.getElementById('file-name'),
            fileSize: document.getElementById('file-size'),
            removeFileBtn: document.getElementById('removeFile'),
            previewElement: document.getElementById('csv-preview')
        };
        
        // Verify required elements exist
        for (const [key, element] of Object.entries(elements)) {
            if (!element) {
                console.warn(`Excel preview element '${key}' not found in DOM`);
            }
        }
        
        // Initialize preview component with DOM elements
        excelFilePreview.initialize(elements);
        console.log('Excel file preview component initialized');
    } catch (error) {
        console.error('Failed to initialize Excel file preview:', error);
    }
}
