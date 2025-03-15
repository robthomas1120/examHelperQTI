/**
 * UI Controller for Item Bank
 * Handles user interface interactions and rendering
 */
class UIController {
    constructor(fileHandler, questionProcessor) {
        this.fileHandler = fileHandler;
        this.questionProcessor = questionProcessor;
        
        // DOM elements
        this.elements = {
            dropArea: document.getElementById('dropArea'),
            fileInput: document.getElementById('excelFile'),
            fileInfo: document.getElementById('fileInfo'),
            fileName: document.getElementById('file-name'),
            fileSize: document.getElementById('file-size'),
            removeFileBtn: document.getElementById('removeFile'),
            loadSampleBtn: document.getElementById('loadSampleBtn'),
            summarySection: document.getElementById('summary-section'),
            totalQuestions: document.getElementById('total-questions'),
            mcQuestions: document.getElementById('mc-questions'),
            maQuestions: document.getElementById('ma-questions'),
            tfQuestions: document.getElementById('tf-questions'),
            essQuestions: document.getElementById('ess-questions'),
            fibQuestions: document.getElementById('fib-questions'),
            tabs: document.querySelectorAll('.tab'),
            mcContainer: document.getElementById('mc-container'),
            maContainer: document.getElementById('ma-container'),
            tfContainer: document.getElementById('tf-container'),
            essContainer: document.getElementById('ess-container'),
            fibContainer: document.getElementById('fib-container'),
            selectedQuestionsContainer: document.getElementById('selected-questions-container'),
            emptySelection: document.getElementById('empty-selection'),
            selectedCount: document.getElementById('selected-count'),
            clearSelectedBtn: document.getElementById('clear-selected-btn'),
            convertBtn: document.getElementById('convert-btn'),
            loadingContainer: document.getElementById('loading-container')
        };
        
        // Sortable instances
        this.sortableInstances = {};
        
        // Initialize UI
        this.init();
    }

    /**
     * Initialize UI components and event listeners
     */
    init() {
        // Initialize drag and drop
        this.initDragAndDrop();
        
        // Initialize file input
        this.initFileInput();
        
        // Initialize tab switching
        this.initTabs();
        
        // Initialize question selection
        this.initQuestionSelection();
        
        // Initialize conversion button
        this.elements.convertBtn.addEventListener('click', this.handleConversion.bind(this));
        
        // Initialize clear selected button
        this.elements.clearSelectedBtn.addEventListener('click', this.clearSelectedQuestions.bind(this));
        
        // Initialize load sample button
        this.elements.loadSampleBtn.addEventListener('click', this.loadSampleFile.bind(this));
    }

    /**
     * Initialize drag and drop functionality
     */
    initDragAndDrop() {
        const dropArea = this.elements.dropArea;
        
        // Prevent default behaviors for drag events
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        // Highlight drop area when dragging over
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.add('dragover');
            });
        });
        
        // Remove highlight when leaving or dropping
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.remove('dragover');
            });
        });
        
        // Handle file drop
        dropArea.addEventListener('drop', e => {
            const files = e.dataTransfer.files;
            if (files.length) {
                this.processUploadedFile(files[0]);
            }
        });
        
        // Trigger file input when clicking drop area
        dropArea.addEventListener('click', () => {
            // Only trigger if the file info is not visible
            if (this.elements.fileInfo.classList.contains('hidden')) {
                this.elements.fileInput.click();
            }
        });
    }

    /**
     * Initialize file input
     */
    initFileInput() {
        // Handle file selection
        this.elements.fileInput.addEventListener('change', e => {
            const files = e.target.files;
            if (files.length) {
                this.processUploadedFile(files[0]);
            }
        });
        
        // Handle remove file button
        this.elements.removeFileBtn.addEventListener('click', e => {
            e.stopPropagation(); // Prevent triggering the drop area click
            this.removeFile();
        });
    }

    /**
     * Initialize tab switching functionality
     */
    initTabs() {
        // Add click event to each tab
        this.elements.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs
                this.elements.tabs.forEach(t => t.classList.remove('active'));
                
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Hide all tab content
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                // Show the corresponding tab content
                const targetId = tab.getAttribute('data-target');
                document.getElementById(targetId).classList.add('active');
            });
        });
    }

    /**
     * Initialize question selection functionality
     */
    initQuestionSelection() {
        // Initialize sortable for available question containers
        this.initSortableForContainer(this.elements.mcContainer, 'MC');
        this.initSortableForContainer(this.elements.maContainer, 'MA');
        this.initSortableForContainer(this.elements.tfContainer, 'TF');
        this.initSortableForContainer(this.elements.essContainer, 'ESS');
        this.initSortableForContainer(this.elements.fibContainer, 'FIB');
        
        // Initialize sortable for selected questions container
        this.initSortableForSelectedContainer();
    }

    /**
     * Initialize sortable for available question container
     * @param {HTMLElement} container - Container element
     * @param {String} type - Question type
     */
    initSortableForContainer(container, type) {
        this.sortableInstances[type] = new Sortable(container, {
            group: {
                name: 'questions',
                pull: 'clone',
                put: false
            },
            sort: false,
            animation: 150,
            ghostClass: 'sortable-ghost',
            onStart: (evt) => {
                evt.item.classList.add('dragging');
            },
            onEnd: (evt) => {
                evt.item.classList.remove('dragging');
                
                // If item was moved to selected container
                if (evt.to.id === 'selected-questions-container') {
                    const questionId = evt.item.getAttribute('data-id');
                    const question = this.questionProcessor.getAllQuestions().find(q => q.id === questionId);
                    
                    if (question) {
                        this.questionProcessor.addSelectedQuestion(question);
                        this.renderSelectedQuestions();
                    }
                    
                    // Remove the clone from the selected container
                    if (evt.item.parentNode) {
                        evt.item.parentNode.removeChild(evt.item);
                    }
                }
            }
        });
    }

    /**
     * Initialize sortable for selected questions container
     */
    initSortableForSelectedContainer() {
        this.sortableInstances.selected = new Sortable(this.elements.selectedQuestionsContainer, {
            group: {
                name: 'questions',
                pull: false
            },
            animation: 150,
            ghostClass: 'sortable-ghost',
            onSort: (evt) => {
                // Update the order of selected questions
                const newOrder = Array.from(this.elements.selectedQuestionsContainer.children)
                    .filter(el => el.classList.contains('selected-question-card'))
                    .map(el => el.getAttribute('data-id'));
                
                this.questionProcessor.updateSelectedQuestionOrder(newOrder);
                this.updateSelectedCount();
            }
        });
    }

    /**
     * Process uploaded file
     * @param {File} file - The uploaded file
     */
    async processUploadedFile(file) {
        try {
            // Show loading state
            this.showLoading(true);
            
            // Process the file
            await this.fileHandler.processFile(file);
            
            // Update UI with file info
            this.updateFileInfo();
            
            // Set question data in processor
            this.questionProcessor.setQuestions(this.fileHandler.processedData);
            
            // Update summary stats
            this.updateSummaryStats();
            
            // Render questions in tabs
            this.renderQuestions();
            
            // Show the summary section
            this.elements.summarySection.classList.remove('hidden');
            
            // Hide loading state
            this.showLoading(false);
        } catch (error) {
            // Hide loading state
            this.showLoading(false);
            
            // Show error message
            alert('Error processing file: ' + error.message);
            console.error('Error processing file:', error);
        }
    }

    /**
     * Update file info in UI
     */
    updateFileInfo() {
        const fileInfo = this.fileHandler.getFileInfo();
        
        if (fileInfo) {
            this.elements.fileName.textContent = fileInfo.name;
            this.elements.fileSize.textContent = fileInfo.formattedSize;
            this.elements.fileInfo.classList.remove('hidden');
            this.elements.dropArea.classList.add('file-selected');
        } else {
            this.elements.fileInfo.classList.add('hidden');
            this.elements.dropArea.classList.remove('file-selected');
        }
    }

    /**
     * Remove the current file
     */
    removeFile() {
        // Clear file input
        this.elements.fileInput.value = '';
        
        // Clear file handler data
        this.fileHandler.clearFile();
        
        // Clear question processor data
        this.questionProcessor.setQuestions({
            all: [],
            MC: [],
            MA: [],
            TF: [],
            ESS: [],
            FIB: []
        });
        this.questionProcessor.clearSelectedQuestions();
        
        // Update UI
        this.updateFileInfo();
        this.updateSummaryStats();
        this.renderQuestions();
        this.renderSelectedQuestions();
        
        // Hide the summary section
        this.elements.summarySection.classList.add('hidden');
    }

    /**
     * Update summary statistics
     */
    updateSummaryStats() {
        const counts = this.fileHandler.getQuestionCounts();
        
        this.elements.totalQuestions.textContent = counts.total;
        this.elements.mcQuestions.textContent = counts.MC;
        this.elements.maQuestions.textContent = counts.MA;
        this.elements.tfQuestions.textContent = counts.TF;
        this.elements.essQuestions.textContent = counts.ESS;
        this.elements.fibQuestions.textContent = counts.FIB;
    }

    /**
     * Render questions in the appropriate containers
     */
    renderQuestions() {
        // Clear existing questions
        this.elements.mcContainer.innerHTML = '';
        this.elements.maContainer.innerHTML = '';
        this.elements.tfContainer.innerHTML = '';
        this.elements.essContainer.innerHTML = '';
        this.elements.fibContainer.innerHTML = '';
        
        // Render Multiple Choice questions
        this.renderQuestionsByType('MC', this.elements.mcContainer);
        
        // Render Multiple Answer questions
        this.renderQuestionsByType('MA', this.elements.maContainer);
        
        // Render True/False questions
        this.renderQuestionsByType('TF', this.elements.tfContainer);
        
        // Render Essay questions
        this.renderQuestionsByType('ESS', this.elements.essContainer);
        
        // Render Fill in Blank questions
        this.renderQuestionsByType('FIB', this.elements.fibContainer);
    }

    /**
     * Render questions of a specific type
     * @param {String} type - Question type
     * @param {HTMLElement} container - Container to render questions in
     */
    renderQuestionsByType(type, container) {
        const questions = this.questionProcessor.getQuestionsByType(type);
        
        if (questions.length === 0) {
            container.innerHTML = `
                <div class="no-questions">
                    <i class="fas fa-info-circle"></i>
                    <p>No ${this.getQuestionTypeName(type)} questions found</p>
                </div>
            `;
            return;
        }
        
        questions.forEach((question, index) => {
            const formattedQuestion = this.questionProcessor.formatQuestionForDisplay(question);
            const card = this.createQuestionCard(formattedQuestion, index + 1);
            container.appendChild(card);
        });
    }

    /**
     * Create a question card element
     * @param {Object} question - Question data
     * @param {Number} index - Question number
     * @returns {HTMLElement} - Question card element
     */
    createQuestionCard(question, index) {
        const card = document.createElement('div');
        card.className = 'question-card';
        card.setAttribute('data-id', question.id);
        card.setAttribute('draggable', 'true');
        
        // Mark as selected if in selected questions
        if (this.questionProcessor.isQuestionSelected(question.id)) {
            card.classList.add('is-selected');
        }
        
        // Add question type badge
        const typeBadge = document.createElement('div');
        typeBadge.className = `question-type ${question.type}`;
        typeBadge.textContent = question.type;
        card.appendChild(typeBadge);
        
        // Add question number
        const questionNumber = document.createElement('div');
        questionNumber.className = 'question-number';
        questionNumber.textContent = index;
        card.appendChild(questionNumber);
        
        // Add question title - ensure text is a string
        const questionTitle = document.createElement('div');
        questionTitle.className = 'question-title';
        // Convert question text to string to avoid truncateText issues
        const questionText = question.text === undefined || question.text === null ? '' : String(question.text);
        questionTitle.textContent = this.truncateText(questionText, 60);
        card.appendChild(questionTitle);
        
        // Add type-specific content
        this.addTypeSpecificContent(card, question);
        
        // Add add button if not already selected
        if (!this.questionProcessor.isQuestionSelected(question.id)) {
            const addBtn = document.createElement('div');
            addBtn.className = 'add-remove-btn add-btn';
            addBtn.innerHTML = '<i class="fas fa-plus"></i>';
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.questionProcessor.addSelectedQuestion(question);
                this.renderSelectedQuestions();
                card.classList.add('is-selected');
            });
            card.appendChild(addBtn);
        }
        
        return card;
    }
    

    /**
     * Add type-specific content to question card
     * @param {HTMLElement} card - Card element
     * @param {Object} question - Question data
     */
    addTypeSpecificContent(card, question) {
        const type = question.type;
        
        if (type === 'TF') {
            // Add True/False answer indication
            const tfAnswer = document.createElement('div');
            tfAnswer.className = 'tf-answer';
            tfAnswer.innerHTML = `
                <span>Answer:</span>
                <div class="true ${question.isTrue ? 'selected' : ''}">True</div>
                <div class="false ${!question.isTrue ? 'selected' : ''}">False</div>
            `;
            card.appendChild(tfAnswer);
        } else if (type === 'MC' && question.options && question.options.length > 0) {
            // Add multiple choice options preview
            const optionsPreview = document.createElement('div');
            optionsPreview.className = 'options-preview';
            
            // Display only the first 2-3 options
            const displayLimit = Math.min(3, question.options.length);
            for (let i = 0; i < displayLimit; i++) {
                const option = question.options[i];
                const optionEl = document.createElement('div');
                optionEl.className = `option ${option.isCorrect ? 'correct' : ''}`;
                optionEl.innerHTML = `
                    <span class="option-marker">${option.isCorrect ? '✓' : '○'}</span>
                    <span class="option-text">${this.truncateText(option.text, 20)}</span>
                `;
                optionsPreview.appendChild(optionEl);
            }
            
            if (question.options.length > displayLimit) {
                const moreIndicator = document.createElement('div');
                moreIndicator.className = 'more-options';
                moreIndicator.textContent = `+ ${question.options.length - displayLimit} more`;
                optionsPreview.appendChild(moreIndicator);
            }
            
            card.appendChild(optionsPreview);
        } else if (type === 'MA' && question.options && question.options.length > 0) {
            // Add multiple answer options preview (similar to MC)
            const optionsPreview = document.createElement('div');
            optionsPreview.className = 'options-preview';
            
            // Display only the first 2-3 options
            const displayLimit = Math.min(3, question.options.length);
            
            // Show how many correct answers there are
            const correctCount = question.options.filter(opt => opt.isCorrect).length;
            const countIndicator = document.createElement('div');
            countIndicator.className = 'correct-count';
            countIndicator.textContent = `${correctCount} correct ${correctCount === 1 ? 'answer' : 'answers'}`;
            optionsPreview.appendChild(countIndicator);
            
            for (let i = 0; i < displayLimit; i++) {
                const option = question.options[i];
                const optionEl = document.createElement('div');
                optionEl.className = `option ${option.isCorrect ? 'correct' : ''}`;
                optionEl.innerHTML = `
                    <span class="option-marker">${option.isCorrect ? '☑' : '☐'}</span>
                    <span class="option-text">${this.truncateText(option.text, 20)}</span>
                `;
                optionsPreview.appendChild(optionEl);
            }
            
            if (question.options.length > displayLimit) {
                const moreIndicator = document.createElement('div');
                moreIndicator.className = 'more-options';
                moreIndicator.textContent = `+ ${question.options.length - displayLimit} more`;
                optionsPreview.appendChild(moreIndicator);
            }
            
            card.appendChild(optionsPreview);
        } else if (type === 'FIB' && question.correctAnswers && question.correctAnswers.length > 0) {
            // Add fill in blank answers preview
            const answersPreview = document.createElement('div');
            answersPreview.className = 'fib-answers';
            
            // Check if we have formatted text or need to format the question text
            if (question.formattedText) {
                const formattedQuestion = document.createElement('div');
                formattedQuestion.className = 'fib-formatted-question';
                formattedQuestion.innerHTML = question.formattedText;
                answersPreview.appendChild(formattedQuestion);
            }
            
            const answersList = document.createElement('div');
            answersList.className = 'fib-answers-list';
            answersList.innerHTML = `<span>Answers:</span> ${question.correctAnswers.join(', ')}`;
            answersPreview.appendChild(answersList);
            
            card.appendChild(answersPreview);
        }
    }

    /**
     * Render selected questions
     */
    renderSelectedQuestions() {
        // Get selected questions
        const selectedQuestions = this.questionProcessor.getSelectedQuestions();
        
        // Clear existing selected questions
        const existingCards = this.elements.selectedQuestionsContainer.querySelectorAll('.selected-question-card');
        existingCards.forEach(card => card.remove());
        
        // Show/hide empty selection message
        if (selectedQuestions.length === 0) {
            this.elements.emptySelection.classList.remove('hidden');
        } else {
            this.elements.emptySelection.classList.add('hidden');
            
            // Create and append cards for each selected question
            selectedQuestions.forEach((question, index) => {
                const card = this.createSelectedQuestionCard(question, index + 1);
                this.elements.selectedQuestionsContainer.appendChild(card);
            });
        }
        
        // Update selected count
        this.updateSelectedCount();
    }

    /**
     * Create a selected question card
     * @param {Object} question - Question data
     * @param {Number} index - Question number
     * @returns {HTMLElement} - Selected question card
     */
    addTypeSpecificContent(card, question) {
        const type = question.type;
        
        if (type === 'TF') {
            // Add True/False answer indication
            const tfAnswer = document.createElement('div');
            tfAnswer.className = 'tf-answer';
            tfAnswer.innerHTML = `
                <span>Answer:</span>
                <div class="true ${question.isTrue ? 'selected' : ''}">True</div>
                <div class="false ${!question.isTrue ? 'selected' : ''}">False</div>
            `;
            card.appendChild(tfAnswer);
        } else if (type === 'MC' && question.options && question.options.length > 0) {
            // Add multiple choice options preview
            const optionsPreview = document.createElement('div');
            optionsPreview.className = 'options-preview';
            
            // Display only the first 2-3 options
            const displayLimit = Math.min(3, question.options.length);
            for (let i = 0; i < displayLimit; i++) {
                const option = question.options[i];
                if (!option) continue;
                
                const optionEl = document.createElement('div');
                optionEl.className = `option ${option.isCorrect ? 'correct' : ''}`;
                // Convert option text to string safely
                const optionText = option.text === undefined || option.text === null ? '' : String(option.text);
                optionEl.innerHTML = `
                    <span class="option-marker">${option.isCorrect ? '✓' : '○'}</span>
                    <span class="option-text">${this.truncateText(optionText, 20)}</span>
                `;
                optionsPreview.appendChild(optionEl);
            }
            
            if (question.options.length > displayLimit) {
                const moreIndicator = document.createElement('div');
                moreIndicator.className = 'more-options';
                moreIndicator.textContent = `+ ${question.options.length - displayLimit} more`;
                optionsPreview.appendChild(moreIndicator);
            }
            
            card.appendChild(optionsPreview);
        } else if (type === 'MA' && question.options && question.options.length > 0) {
            // Add multiple answer options preview (similar to MC)
            const optionsPreview = document.createElement('div');
            optionsPreview.className = 'options-preview';
            
            // Display only the first 2-3 options
            const displayLimit = Math.min(3, question.options.length);
            
            // Show how many correct answers there are
            const correctCount = question.options.filter(opt => opt.isCorrect).length;
            const countIndicator = document.createElement('div');
            countIndicator.className = 'correct-count';
            countIndicator.textContent = `${correctCount} correct ${correctCount === 1 ? 'answer' : 'answers'}`;
            optionsPreview.appendChild(countIndicator);
            
            for (let i = 0; i < displayLimit; i++) {
                const option = question.options[i];
                if (!option) continue;
                
                const optionEl = document.createElement('div');
                optionEl.className = `option ${option.isCorrect ? 'correct' : ''}`;
                // Convert option text to string safely
                const optionText = option.text === undefined || option.text === null ? '' : String(option.text);
                optionEl.innerHTML = `
                    <span class="option-marker">${option.isCorrect ? '☑' : '☐'}</span>
                    <span class="option-text">${this.truncateText(optionText, 20)}</span>
                `;
                optionsPreview.appendChild(optionEl);
            }
            
            if (question.options.length > displayLimit) {
                const moreIndicator = document.createElement('div');
                moreIndicator.className = 'more-options';
                moreIndicator.textContent = `+ ${question.options.length - displayLimit} more`;
                optionsPreview.appendChild(moreIndicator);
            }
            
            card.appendChild(optionsPreview);
        } else if (type === 'FIB' && question.correctAnswers && question.correctAnswers.length > 0) {
            // Add fill in blank answers preview
            const answersPreview = document.createElement('div');
            answersPreview.className = 'fib-answers';
            
            // Check if we have formatted text or need to format the question text
            if (question.formattedText) {
                const formattedQuestion = document.createElement('div');
                formattedQuestion.className = 'fib-formatted-question';
                formattedQuestion.innerHTML = question.formattedText;
                answersPreview.appendChild(formattedQuestion);
            } else if (question.text) {
                // Format the text to highlight blanks
                const questionText = typeof question.text === 'string' ? question.text : String(question.text);
                const formattedQuestion = document.createElement('div');
                formattedQuestion.className = 'fib-formatted-question';
                formattedQuestion.innerHTML = this.formatFIBQuestionText(questionText);
                answersPreview.appendChild(formattedQuestion);
            }
            
            const answersList = document.createElement('div');
            answersList.className = 'fib-answers-list';
            answersList.innerHTML = `<span>Answers:</span> ${question.correctAnswers.join(', ')}`;
            answersPreview.appendChild(answersList);
            
            card.appendChild(answersPreview);
        } else if (type === 'ESS') {
            // Add essay indication
            const essayIndicator = document.createElement('div');
            essayIndicator.className = 'essay-indicator';
            essayIndicator.innerHTML = '<i class="fas fa-pen"></i> Essay question';
            card.appendChild(essayIndicator);
        }
        
        // Add add button if not already selected
        if (!this.questionProcessor.isQuestionSelected(question.id)) {
            const addBtn = document.createElement('div');
            addBtn.className = 'add-remove-btn add-btn';
            addBtn.innerHTML = '<i class="fas fa-plus"></i>';
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.questionProcessor.addSelectedQuestion(question);
                this.renderSelectedQuestions();
                card.classList.add('is-selected');
            });
            card.appendChild(addBtn);
        }
    }
    
    // Helper method to format FIB question text (add this if not already present)
    formatFIBQuestionText(text) {
        if (!text) return '';
        
        // Replace underscores with highlighted spans
        return text.replace(/_{2,}/g, '<span class="blank">_____</span>')
                  .replace(/\s_+\s/g, ' <span class="blank">_____</span> ')
                  .replace(/_+/g, '<span class="blank">_____</span>');
    }

    /**
     * Update the selected questions count
     */
    updateSelectedCount() {
        const count = this.questionProcessor.getSelectedCount();
        this.elements.selectedCount.textContent = count;
        
        // Enable/disable convert button based on selection
        this.elements.convertBtn.disabled = count === 0;
    }

    /**
     * Clear all selected questions
     */
    clearSelectedQuestions() {
        this.questionProcessor.clearSelectedQuestions();
        this.renderSelectedQuestions();
        this.renderQuestions(); // Re-render to update 'is-selected' class
    }

    /**
     * Handle conversion button click
     */
    handleConversion() {
        const selectedQuestions = this.questionProcessor.getSelectedQuestions();
        
        if (selectedQuestions.length === 0) {
            alert('Please select at least one question to convert.');
            return;
        }
        
        // Here you would implement the conversion logic
        // This would typically convert the selected questions to QTI format
        // For now, we'll just show an alert as a placeholder
        alert(`Ready to convert ${selectedQuestions.length} questions to QTI format. This functionality is not yet implemented.`);
    }

    /**
     * Load sample file for demonstration
     */
    loadSampleFile() {
        // In a real implementation, this would load a sample file from the server
        // For now, we'll just show an alert as a placeholder
        alert('Sample file loading not implemented in this demo. Please upload your own file.');
    }

    /**
     * Show or hide loading indicator
     * @param {Boolean} show - Whether to show the loading indicator
     */
    showLoading(show) {
        if (show) {
            this.elements.loadingContainer.classList.add('active');
        } else {
            this.elements.loadingContainer.classList.remove('active');
        }
    }

    /**
     * Get full name of question type
     * @param {String} type - Question type code
     * @returns {String} - Full question type name
     */
    getQuestionTypeName(type) {
        const types = {
            'MC': 'Multiple Choice',
            'MA': 'Multiple Answer',
            'TF': 'True/False',
            'ESS': 'Essay',
            'FIB': 'Fill in Blank'
        };
        
        return types[type] || type;
    }

    /**
     * Truncate text to a specific length
     * @param {String} text - Text to truncate
     * @param {Number} maxLength - Maximum length
     * @returns {String} - Truncated text
     */
    truncateText(text, maxLength) {
        // Ensure text is a string
        const safeText = text === null || text === undefined ? '' : String(text);
        
        if (safeText.length <= maxLength) {
            return safeText;
        }
        
        return safeText.substring(0, maxLength) + '...';
    }
    
}

// Export the UIController class
window.UIController = UIController;