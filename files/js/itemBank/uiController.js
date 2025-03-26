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
            loadingContainer: document.getElementById('loading-container'),
            quizTitleInput: document.getElementById('quiz-title'),
            quizDescriptionInput: document.getElementById('quiz-description')
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
        
        // Initialize clear selected button
        this.elements.clearSelectedBtn.addEventListener('click', this.clearSelectedQuestions.bind(this));
        
        // Initialize load sample button
        //this.elements.loadSampleBtn.addEventListener('click', this.loadSampleFile.bind(this));
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
        
        // Make sure we're only triggering the file input click when clicking on the label or drop area
        // NOT when clicking on the file info area
        dropArea.addEventListener('click', (e) => {
            // Only trigger if the file info is not visible and the click isn't on the remove button
            if (this.elements.fileInfo.classList.contains('hidden') && 
                !e.target.closest('#removeFile')) {
                
                // Find if there's a label element being clicked
                const isLabel = e.target.tagName === 'LABEL' || e.target.closest('label');
                
                // Only trigger if clicking directly on the drop area or specifically on the label
                if (!isLabel && e.target !== dropArea) {
                    return;
                }
                
                // For label clicks, prevent default to avoid duplicate triggers
                if (isLabel) {
                    e.preventDefault();
                }
                
                this.elements.fileInput.click();
            }
        });
        
        // Remove the direct click handler from the label element to prevent double triggering
        const fileInputLabel = dropArea.querySelector('label[for="excelFile"]');
        if (fileInputLabel) {
            fileInputLabel.removeAttribute('for');
        }
    }

    /**
     * Initialize file input
     */
    initFileInput() {
        // Handle file selection - Make sure we only attach this once
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
                put: function(to, from, dragEl) {
                    // Only allow dropping if it's a selected question being dragged back
                    return dragEl.classList.contains('selected-question-card');
                }
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
                        
                        // Also update available questions to show it's selected
                        this.updateAvailableQuestionStatus(questionId, true);
                    }
                    
                    // Remove the clone from the selected container
                    if (evt.item.parentNode) {
                        evt.item.parentNode.removeChild(evt.item);
                    }
                }
            },
            onAdd: (evt) => {
                // Handle when a selected question is dragged back
                if (evt.from.id === 'selected-questions-container') {
                    const questionId = evt.item.getAttribute('data-id');
                    // Extract the original ID from the selectedId format "sel_originalId"
                    const originalId = questionId.startsWith('sel_') ? questionId.substring(4) : questionId;
                    
                    // Remove from selected questions
                    this.questionProcessor.removeSelectedQuestion(originalId);
                    this.renderSelectedQuestions();
                    
                    // Update available question status to show it's not selected
                    this.updateAvailableQuestionStatus(originalId, false);
                    
                    // Remove the dragged clone
                    if (evt.item.parentNode) {
                        evt.item.parentNode.removeChild(evt.item);
                    }
                }
            }
        });
    }

    /**
     * Update the visual status of an available question
     * @param {String} questionId - Question ID
     * @param {Boolean} isSelected - Whether the question is selected
     */
    updateAvailableQuestionStatus(questionId, isSelected) {
        // Find the question card in all available containers
        const questionCards = document.querySelectorAll(`.question-card[data-id="${questionId}"]`);
        
        questionCards.forEach(card => {
            if (isSelected) {
                card.classList.add('is-selected');
            } else {
                card.classList.remove('is-selected');
            }
        });
        
        // Update + button visibility
        questionCards.forEach(card => {
            const addBtn = card.querySelector('.add-btn');
            if (addBtn) {
                if (isSelected) {
                    addBtn.style.display = 'none';
                } else {
                    addBtn.style.display = 'flex';
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
                pull: true  // Allow dragging from selected to available
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
            },
            onRemove: (evt) => {
                // When item is removed from selected questions
                const questionId = evt.item.getAttribute('data-id');
                // Extract the original ID from the selectedId format "sel_originalId"
                const originalId = questionId.startsWith('sel_') ? questionId.substring(4) : questionId;
                
                // If it was dragged to an available questions container, handle that separately in onAdd above
                // Otherwise, we still need to remove it from the selection
                if (!evt.to.classList.contains('question-list')) {
                    this.questionProcessor.removeSelectedQuestion(originalId);
                    this.renderSelectedQuestions();
                    
                    // Update available question status to show it's not selected
                    this.updateAvailableQuestionStatus(originalId, false);
                }
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
            
            // Auto-fill quiz title based on file name
            if (this.elements.quizTitleInput && !this.elements.quizTitleInput.value) {
                const baseName = fileInfo.name.split('.')[0];
                this.elements.quizTitleInput.value = baseName.replace(/_/g, ' ');
            }
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
        
        // Clear quiz title and description
        if (this.elements.quizTitleInput) {
            this.elements.quizTitleInput.value = '';
        }
        if (this.elements.quizDescriptionInput) {
            this.elements.quizDescriptionInput.value = '';
        }
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
        
        // Clear container first
        container.innerHTML = '';
        
        // Add the "Add All" button
        this.addAddAllButton(type, container);
        
        if (questions.length === 0) {
            container.innerHTML += `
                <div class="no-questions">
                    <i class="fas fa-info-circle"></i>
                    <p>No ${this.getQuestionTypeName(type)} questions found</p>
                </div>
            `;
            return;
        }
        
        // Filter out invalid questions
        const validQuestions = questions.filter(question => {
            // Skip if question doesn't have required properties
            if (!question.id || !question.text) return false;
            
            // Skip if the question appears to be a summary or metadata
            if (typeof question.text === 'object' || 
                Array.isArray(question.text) || 
                question.id.includes('summary') || 
                question.id.includes('count')) {
                return false;
            }
            
            return true;
        });
        
        validQuestions.forEach((question, index) => {
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
        const isSelected = this.questionProcessor.isQuestionSelected(question.id);
        if (isSelected) {
            card.classList.add('is-selected');
        }
        
        // Create a flexbox container for better layout control
        const contentContainer = document.createElement('div');
        contentContainer.className = 'question-content-container';
        contentContainer.style.cssText = 'display: flex; flex: 1; align-items: center; min-width: 0;';
        
        // Add question number
        const questionNumber = document.createElement('div');
        questionNumber.className = 'question-number';
        questionNumber.textContent = index;
        questionNumber.style.cssText = 'margin-right: 10px; flex-shrink: 0; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; background-color: rgb(169, 169, 169); border-radius: 50%; font-size: 12px; font-weight: 500;';
        contentContainer.appendChild(questionNumber);
        
        // Add question type badge
        const typeBadge = document.createElement('div');
        typeBadge.className = `question-type ${question.type}`;
        typeBadge.textContent = question.type;
        typeBadge.style.cssText = 'margin-right: 30px; flex-shrink: 0; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 500; background-color: rgb(169, 169, 169);';
        contentContainer.appendChild(typeBadge);
        
        // Add question title with proper text truncation
        const questionTitle = document.createElement('div');
        questionTitle.className = 'question-title';
        // Convert question text to string to avoid truncateText issues
        const questionText = question.text === undefined || question.text === null ? '' : String(question.text);
        questionTitle.textContent = this.truncateText(questionText, 60);
        questionTitle.style.cssText = 'flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px; padding-left: 30px;';
        contentContainer.appendChild(questionTitle);
        
        // Add content container to card
        card.appendChild(contentContainer);
        
        // Add add button if not already selected
        const addBtn = document.createElement('div');
        addBtn.className = 'add-remove-btn add-btn';
        addBtn.innerHTML = '<i class="fas fa-plus"></i>';
        addBtn.style.cssText = 'flex-shrink: 0; margin-left: 10px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background-color: #ffb81c; color: white; border-radius: 50%; cursor: pointer;';
        
        if (isSelected) {
            addBtn.style.display = 'none';
        }
        
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.questionProcessor.addSelectedQuestion(question);
            this.renderSelectedQuestions();
            card.classList.add('is-selected');
            addBtn.style.display = 'none';
        });
        card.appendChild(addBtn);
        
        // Add styles for selected state
        if (isSelected) {
            card.style.cssText = 'display: flex; align-items: center; padding: 10px 15px; margin-bottom: 10px; background-color: #f0f4ff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); cursor: grab; transition: all 0.2s ease; border-left: 3px solid #4a6cf7;';
        } else {
            card.style.cssText = 'display: flex; align-items: center; padding: 10px 15px; margin-bottom: 10px; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); cursor: grab; transition: all 0.2s ease;';
        }
        
        return card;
    }


    /**
     * Check if text is a metadata field
     * @param {String} text - Text to check
     * @returns {Boolean} - True if text is a metadata field
     */
    isMetadataText(text) {
        if (!text) return true;
        const lowerText = String(text).toLowerCase();
        return lowerText === 'question' || 
               lowerText.includes('choice1') || 
               lowerText.includes('tagging') || 
               lowerText.includes('choice2') ||
               lowerText.includes('choice3') ||
               lowerText.includes('choice4') ||
               lowerText.includes('choice5') ||
               lowerText.includes('choice6') ||
               lowerText.includes('choice1a') ||
               lowerText.includes('choice1b') ||
               lowerText.includes('choice2a') ||
               lowerText.includes('choice2b');
    }

    /**
     * Add "Add All" button to question type tab
     * @param {String} type - Question type
     * @param {HTMLElement} container - Container to add button to
     */
    addAddAllButton(type, container) {
        // Check if we have questions of this type
        const questions = this.questionProcessor.getQuestionsByType(type);
        if (questions.length === 0) return;

        // Create Add All button
        const addAllButton = document.createElement('button');
        addAllButton.className = 'add-all-btn';
        addAllButton.innerHTML = '<i class="fas fa-plus"></i> Add All';
        addAllButton.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background-color: #ffb81c;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 8px 16px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            margin-bottom: 15px;
            transition: background-color 0.3s ease;
        `;

        // Add hover effect
        addAllButton.addEventListener('mouseenter', () => {
            addAllButton.style.backgroundColor = '#e6a619';
        });

        addAllButton.addEventListener('mouseleave', () => {
            addAllButton.style.backgroundColor = '#ffb81c';
        });

        // Add click handler
        addAllButton.addEventListener('click', () => {
            this.addAllQuestionsOfType(type);
        });

        // Add button to the top of the container
        container.insertBefore(addAllButton, container.firstChild);
    }

    /**
     * Add all questions of a specific type to selected questions
     * @param {String} type - Question type
     */
    addAllQuestionsOfType(type) {
        // Get all questions of this type
        const questions = this.questionProcessor.getQuestionsByType(type);
        
        // Add each question to selected questions if not already selected
        let addedCount = 0;
        questions.forEach(question => {
            if (!this.questionProcessor.isQuestionSelected(question.id)) {
                this.questionProcessor.addSelectedQuestion(question);
                addedCount++;
            }
        });
        
        // Render selected questions
        this.renderSelectedQuestions();
        
        // Re-render the questions in the tab to update their "selected" status
        this.renderQuestionsByType(type, this.elements[`${type.toLowerCase()}Container`]);
        
        // Show feedback message
        this.showNotification(`Added ${addedCount} ${this.getQuestionTypeName(type)} questions to selection.`, 'success');
    }

    /**
     * Show notification message
     * @param {String} message - Message to show
     * @param {String} type - Message type (success, error, info)
     */
    showNotification(message, type = 'info') {
        // Check if a notification container already exists
        let notificationContainer = document.querySelector('.notification-container');
        
        if (!notificationContainer) {
            // Create notification container
            notificationContainer = document.createElement('div');
            notificationContainer.className = 'notification-container';
            notificationContainer.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 1000;
            `;
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            background-color: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            margin-top: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        
        // Add icon
        const icon = document.createElement('i');
        icon.className = `fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}`;
        icon.style.marginRight = '12px';
        notification.appendChild(icon);
        
        // Add message
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        notification.appendChild(messageSpan);
        
        // Add notification to container
        notificationContainer.appendChild(notification);
        
        // Add slideIn animation to the document if it doesn't exist
        if (!document.getElementById('notification-animation-style')) {
            const style = document.createElement('style');
            style.id = 'notification-animation-style';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            notification.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                
                // Remove container if empty
                if (notificationContainer.children.length === 0) {
                    document.body.removeChild(notificationContainer);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Add type-specific content to question card
     * @param {HTMLElement} card - Card element
     * @param {Object} question - Question data
     */
    addTypeSpecificContent(card, question) {
        const type = question.type;
        
        // Check if the question text is just a header or field name and not a real question
        if (this.isMetadataText(question.text) && question.data && question.data.length > 1) {
            // Try to find a real question text in the data
            for (let i = 1; i < question.data.length; i++) {
                const item = question.data[i];
                if (item && !this.isMetadataText(item) && String(item).length > 5) {
                    // Replace the card's question title with this better text
                    const existingTitle = card.querySelector('.question-title');
                    if (existingTitle) {
                        existingTitle.textContent = this.truncateText(String(item), 60);
                    }
                    break;
                }
            }
        }
        
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
                
                // Skip options that are just metadata labels
                if (this.isMetadataText(option.text)) continue;
                
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
            
            // Filter out metadata labels
            const realOptions = question.options.filter(opt => opt && !this.isMetadataText(opt.text));
            
            // Show how many correct answers there are
            const correctCount = realOptions.filter(opt => opt.isCorrect).length;
            const countIndicator = document.createElement('div');
            countIndicator.className = 'correct-count';
            countIndicator.textContent = `${correctCount} correct ${correctCount === 1 ? 'answer' : 'answers'}`;
            optionsPreview.appendChild(countIndicator);
            
            for (let i = 0; i < Math.min(displayLimit, realOptions.length); i++) {
                const option = realOptions[i];
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
            
            if (realOptions.length > displayLimit) {
                const moreIndicator = document.createElement('div');
                moreIndicator.className = 'more-options';
                moreIndicator.textContent = `+ ${realOptions.length - displayLimit} more`;
                optionsPreview.appendChild(moreIndicator);
            }
            
            card.appendChild(optionsPreview);
        } else if (type === 'FIB' && question.correctAnswers && question.correctAnswers.length > 0) {
            // Filter out metadata from answers
            const realAnswers = question.correctAnswers.filter(ans => !this.isMetadataText(ans));
            
            if (realAnswers.length === 0) return; // Skip if no real answers
            
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
            answersList.innerHTML = `<span>Answers:</span> ${realAnswers.join(', ')}`;
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

    /**
     * Format Fill in Blank question text to highlight blanks
     * @param {String} text - Raw question text
     * @returns {String} - Formatted text with highlighted blanks
     */
    formatFIBQuestionText(text) {
        if (!text) return '';
        
        // Replace underscores with highlighted spans
        return text.replace(/_{2,}/g, '<span class="blank">_____</span>')
                  .replace(/\s_+\s/g, ' <span class="blank">_____</span> ')
                  .replace(/_+/g, '<span class="blank">_____</span>');
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
    createSelectedQuestionCard(question, index) {
        const card = document.createElement('div');
        card.className = 'selected-question-card';
        card.setAttribute('data-id', question.selectedId);
        card.setAttribute('draggable', 'true');
        
        // Create content container for better layout
        const contentContainer = document.createElement('div');
        contentContainer.className = 'question-content-container';
        contentContainer.style.cssText = 'display: flex; flex: 1; align-items: center; min-width: 0; Padding-left: 20px;';
        
        // Question number
        const numberSpan = document.createElement('div');
        numberSpan.className = 'question-number';
        numberSpan.textContent = index;
        numberSpan.style.cssText = 'margin-right: 10px; flex-shrink: 0; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; background-color:rgb(169, 169, 169); border-radius: 50%; font-size: 12px; font-weight: 500;';
        contentContainer.appendChild(numberSpan);
        
        // Question type badge
        const typeBadge = document.createElement('span');
        typeBadge.className = `question-type-badge ${question.type}`;
        typeBadge.textContent = question.type;
        typeBadge.style.cssText = 'margin-right: 10px; flex-shrink: 0; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 500; background-color: #e5e7eb;';
        contentContainer.appendChild(typeBadge);
        
        // Question text
        const textSpan = document.createElement('span');
        textSpan.className = 'question-text';
        
        // Handle metadata text
        let displayText = question.text;
        if (this.isMetadataText(displayText) && question.data && question.data.length > 1) {
            // Try to find a better text
            for (let i = 1; i < question.data.length; i++) {
                const item = question.data[i];
                if (item && !this.isMetadataText(item) && String(item).length > 5) {
                    displayText = item;
                    break;
                }
            }
        }
        
        const questionText = displayText === undefined || displayText === null ? '' : String(displayText);
        textSpan.textContent = this.truncateText(questionText, 40);
        textSpan.style.cssText = 'flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px;';
        contentContainer.appendChild(textSpan);
        
        // Add content container to card
        card.appendChild(contentContainer);
        
        // Add a hint about dragging back
        card.setAttribute('title', 'Drag back to Available Questions to remove');
        
        // Remove button
        const removeBtn = document.createElement('i');
        removeBtn.className = 'fas fa-times remove-selected';
        removeBtn.style.cssText = 'flex-shrink: 0; cursor: pointer; color: #ef4444; margin-left: 10px; font-size: 14px; padding: 5px;';
        removeBtn.addEventListener('click', () => {
            // Extract the original ID from the selectedId format "sel_originalId"
            const originalId = question.id;
            
            this.questionProcessor.removeSelectedQuestion(originalId);
            this.renderSelectedQuestions();
            
            // Update available question status
            this.updateAvailableQuestionStatus(originalId, false);
        });
        card.appendChild(removeBtn);
        
        // Add overall styles
        card.style.cssText = 'display: flex; align-items: center; padding: 10px 15px; margin-bottom: 10px; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); cursor: grab; transition: all 0.2s ease;';
        
        return card;
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
     * Load sample file for demonstration
     */
    // loadSampleFile() {
    //     // In a real implementation, this would load a sample file from the server
    //     // For now, we'll just show an alert as a placeholder
    //     alert('Sample file loading not implemented in this demo. Please upload your own file.');
    // }

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