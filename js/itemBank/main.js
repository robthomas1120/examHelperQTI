/**
 * Main application entry point for Item Bank
 * Initializes and connects all components
 */
document.addEventListener('DOMContentLoaded', function() {
    // Create file handler instance
    const fileHandler = new FileHandler();
    
    // Create question processor instance
    const questionProcessor = new QuestionProcessor();
    
    // Create UI controller instance
    const uiController = new UIController(fileHandler, questionProcessor);
    
    // Expose instances to global scope for debugging (optional)
    window.app = {
        fileHandler,
        questionProcessor,
        uiController
    };
    
    // Handle sample file loading
    document.getElementById('loadSampleBtn').addEventListener('click', async function(e) {
        e.preventDefault();
        
        try {
            // Show loading state
            uiController.showLoading(true);
            
            // Create a sample dataset based on the examples provided
            const sampleData = {
                MC: [
                    // Multiple Choice questions (from Image 1)
                    ["What is the capital of Canada?", "Ottawa", "correct", "Toronto", "correct", "Vancouver", "incorrect", "Montreal", "incorrect"],
                    ["Who wrote Romeo and Juliet?", "Romeo", "incorrect", "julz", "correct", "rob", "incorrect", "ruth", "incorrect"],
                    ["gold?", "au", "incorrect", "fe", "incofrect", "ga", "correct", "re", "incorrect"],
                    ["Planet?", "pluto", "incorrect", "earh", "incorrect", "mare", "incorrect", "mars", "correct"],
                    ["Who painted the Mona Lisa?", "Ryan", "incorrect", "michael", "incorrect", "jordan", "correct", "Angelo", "incorrect"],
                    
                    // From Image 2
                    ["Which of the following are prime numbers?", "2", "correct", "3", "correct", "5", "incorrect", "9", "incorrect", "15", "incorrect"],
                    ["Which countries are part of the G7?", "USA", "correct", "Germany", "correct", "Canada", "correct", "China", "incorrect", "Taguig", "incorrect"],
                    ["Which elements are noble gases?", "Helium", "correct", "Gold", "incorrect", "Iron", "incorrect", "Argon", "correct"]
                ],
                MA: [
                    // Multiple Answer questions (from Image 2)
                    ["Which of these animals are mammals?", "Dogs", "incorrect", "Whales", "correct", "Cats", "incorrect", "Elephant", "correct"],
                    ["Which planets in our solar system have rings?", "Saturn", "correct", "Earth", "incorrect", "Venus", "correct", "Uranus", "correct"]
                ],
                TF: [
                    // True/False questions (from Image 3)
                    ["The Great Wall of China is visible from space.", "true", "1", "t"],
                    ["Water boils at 100°C at sea level.", "false", "0", "f"],
                    ["The human heart has four chambers.", "true", "1", "t"],
                    ["Mount Everest is the tallest mountain in the world.", "false", "0", "f"],
                    ["Bats are blind.", "false", "0", "f"]
                ],
                ESS: [
                    // Essay questions (from Image 4)
                    ["Tell me your life story."],
                    ["Explain the significance of the Renaissance period in shaping modern art and culture."],
                    ["Discuss the impact of climate change on global ecosystems and human societies."],
                    ["How has technology influenced the way people communicate in the 21st century?"],
                    ["Describe the importance of leadership in achieving success, using examples from history or personal experience."]
                ],
                FIB: [
                    // Fill in the Blank questions (from Image 5)
                    ["The process by which plants make their own food using sunlight is called _____.", "photosynthesis", "Photosynthesis"],
                    ["The capital of France is _____.", "PARIS", "Paris"],
                    ["The _____ is the largest organ in the human body, while the _____ is the longest bone.", "skin", "SKIN", "Femur", "femur"],
                    ["The largest planet in our solar system is _____.", "jupiter", "Jupiter"],
                    ["The first man to walk on the moon was _____ in the year _____.", "Neil", "Neil Armstrong", "1969", "nineteen sixty nine"]
                ]
            };
            
            // Create a simulated file object - we'll just use the name
            const sampleFile = new File(
                ["Sample Data"], 
                "sample_quiz_data.xlsx", 
                { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
            );
            
            // Set the current file without actually parsing it
            fileHandler.currentFile = sampleFile;
            
            // Set the processed data directly
            fileHandler.processedData = await fileHandler.organizeQuestions(sampleData);
            
            // Update UI with file info
            uiController.updateFileInfo();
            
            // Set question data in processor
            questionProcessor.setQuestions(fileHandler.processedData);
            
            // Update summary stats
            uiController.updateSummaryStats();
            
            // Render questions in tabs
            uiController.renderQuestions();
            
            // Show the summary section
            document.getElementById('summary-section').classList.remove('hidden');
            
            // Hide loading state
            uiController.showLoading(false);
        } catch (error) {
            // Hide loading state
            uiController.showLoading(false);
            
            // Show error message
            alert('Error loading sample file: ' + error.message);
            console.error('Error loading sample file:', error);
        }
    });
});