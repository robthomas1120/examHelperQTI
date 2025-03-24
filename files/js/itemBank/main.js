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
        initializeSampleDataLoader(uiController, fileHandler, questionProcessor);
        
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
function initializeSampleDataLoader(uiController, fileHandler, questionProcessor) {
    const sampleButton = document.getElementById('loadSampleBtn');
    
    if (!sampleButton) {
        console.error('Sample button element not found in DOM');
        return;
    }
    
    console.log('Setting up sample data loader...');
    
    sampleButton.addEventListener('click', async function(e) {
        e.preventDefault();
        console.log('Sample data load requested');
        
        try {
            // Activate loading indicator
            uiController.showLoading(true);
            console.log('Loading sample data set...');
            
            // Prepare sample dataset with various question types
            const sampleData = createSampleDataset();
            
            // Create a simulated file object with appropriate metadata
            const sampleFile = new File(
                ["Sample Data"], 
                "sample_quiz_data.xlsx", 
                { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
            );
            
            // Set file reference in the handler without parsing
            fileHandler.currentFile = sampleFile;
            
            console.log('Organizing sample question data...');
            fileHandler.processedData = await fileHandler.organizeQuestions(sampleData);
            
            // Update application state with sample data
            console.log('Updating UI with sample data...');
            uiController.updateFileInfo();
            questionProcessor.setQuestions(fileHandler.processedData);
            uiController.updateSummaryStats();
            uiController.renderQuestions();
            
            // Display the summary section
            const summarySection = document.getElementById('summary-section');
            if (summarySection) {
                summarySection.classList.remove('hidden');
            } else {
                console.warn('Summary section element not found in DOM');
            }
            
            console.log('Sample data loaded successfully');
            
            // Remove loading indicator
            uiController.showLoading(false);
        } catch (error) {
            console.error('Failed to load sample data:', error);
            
            // Hide loading state
            uiController.showLoading(false);
            
            // Show user-friendly error message
            alert('Error loading sample file: ' + error.message);
        }
    });
}

/**
 * Creates a sample dataset with various question types for demonstration
 * 
 * @returns {Object} Object containing categorized sample questions
 */
function createSampleDataset() {
    return {
        MC: [
            // Multiple Choice questions
            ["What is the capital of Canada?", "Ottawa", "correct", "Toronto", "correct", "Vancouver", "incorrect", "Montreal", "incorrect"],
            ["Who wrote Romeo and Juliet?", "Romeo", "incorrect", "julz", "correct", "rob", "incorrect", "ruth", "incorrect"],
            ["gold?", "au", "incorrect", "fe", "incofrect", "ga", "correct", "re", "incorrect"],
            ["Planet?", "pluto", "incorrect", "earh", "incorrect", "mare", "incorrect", "mars", "correct"],
            ["Who painted the Mona Lisa?", "Ryan", "incorrect", "michael", "incorrect", "jordan", "correct", "Angelo", "incorrect"],
            ["Which of the following are prime numbers?", "2", "correct", "3", "correct", "5", "incorrect", "9", "incorrect", "15", "incorrect"],
            ["Which countries are part of the G7?", "USA", "correct", "Germany", "correct", "Canada", "correct", "China", "incorrect", "Taguig", "incorrect"],
            ["Which elements are noble gases?", "Helium", "correct", "Gold", "incorrect", "Iron", "incorrect", "Argon", "correct"]
        ],
        MA: [
            // Multiple Answer questions
            ["Which of these animals are mammals?", "Dogs", "incorrect", "Whales", "correct", "Cats", "incorrect", "Elephant", "correct"],
            ["Which planets in our solar system have rings?", "Saturn", "correct", "Earth", "incorrect", "Venus", "correct", "Uranus", "correct"]
        ],
        TF: [
            // True/False questions
            ["The Great Wall of China is visible from space.", "true", "1", "t"],
            ["Water boils at 100°C at sea level.", "false", "0", "f"],
            ["The human heart has four chambers.", "true", "1", "t"],
            ["Mount Everest is the tallest mountain in the world.", "false", "0", "f"],
            ["Bats are blind.", "false", "0", "f"]
        ],
        ESS: [
            // Essay questions
            ["Tell me your life story."],
            ["Explain the significance of the Renaissance period in shaping modern art and culture."],
            ["Discuss the impact of climate change on global ecosystems and human societies."],
            ["How has technology influenced the way people communicate in the 21st century?"],
            ["Describe the importance of leadership in achieving success, using examples from history or personal experience."]
        ],
        FIB: [
            // Fill in the Blank questions
            ["The process by which plants make their own food using sunlight is called _____.", "photosynthesis", "Photosynthesis"],
            ["The capital of France is _____.", "PARIS", "Paris"],
            ["The _____ is the largest organ in the human body, while the _____ is the longest bone.", "skin", "SKIN", "Femur", "femur"],
            ["The largest planet in our solar system is _____.", "jupiter", "Jupiter"],
            ["The first man to walk on the moon was _____ in the year _____.", "Neil", "Neil Armstrong", "1969", "nineteen sixty nine"]
        ]
    };
}

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