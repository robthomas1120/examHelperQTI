document.addEventListener('DOMContentLoaded', function() {
    const questionsContainer = document.getElementById('questions-container');
    const addQuestionBtn = document.getElementById('add-question-btn');
    const questionTypeDropdown = document.getElementById('question-type-dropdown');
    const exportQtiBtn = document.getElementById('export-qti-btn');
    const successMessage = document.getElementById('success-message');
    const successText = document.getElementById('success-text');
    let questionCounter = 0;
    let draggedItem = null;

    // Show question type dropdown when add button is clicked
    addQuestionBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        questionTypeDropdown.style.display = questionTypeDropdown.style.display === 'none' ? 'block' : 'none';
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.matches('#add-question-btn') && !e.target.closest('#question-type-dropdown')) {
            questionTypeDropdown.style.display = 'none';
        }
    });

    // Add question of selected type
    questionTypeDropdown.addEventListener('click', function(e) {
        const questionType = e.target.getAttribute('data-type');
        if (questionType) {
            addQuestion(questionType);
            questionTypeDropdown.style.display = 'none';
        }
    });

    // Function to add a new question
    function addQuestion(type) {
        const questionNumber = questionsContainer.querySelectorAll('.question-entry').length + 1;
        const questionEntry = document.createElement('div');
        questionEntry.className = 'question-entry';
        questionEntry.setAttribute('draggable', 'true');
        questionEntry.innerHTML = `
            <div class="question-header">
                <span class="question-number">${questionNumber}</span>
                <span class="question-type">${formatQuestionType(type)}</span>
                <div class="question-controls">
                    <button type="button" class="copy-question" title="Duplicate Question"><i class="fas fa-copy"></i></button>
                    <button type="button" class="move-question" title="Drag to Reorder"><i class="fas fa-arrows-alt"></i></button>
                    <button type="button" class="delete-question" title="Delete Question">&times;</button>
                </div>
            </div>
            <div class="question-content">
                ${getQuestionTemplate(type)}
            </div>
        `;
        
        questionsContainer.appendChild(questionEntry);
        updateQuestionNumbers();
        setupDragAndDrop();
        
        // Auto-focus the question text area
        const textArea = questionEntry.querySelector('textarea');
        if (textArea) {
            textArea.focus();
        }
        
        // Store the question text for preview when collapsed
        const questionHeader = questionEntry.querySelector('.question-header');
        textArea.addEventListener('input', function() {
            const questionText = this.value.trim();
            questionHeader.setAttribute('data-question-preview', questionText.substring(0, 50) + (questionText.length > 50 ? '...' : ''));
        });
    }

    // Update question numbers for all questions
    function updateQuestionNumbers() {
        const questionEntries = questionsContainer.querySelectorAll('.question-entry');
        questionEntries.forEach((entry, index) => {
            const questionNumber = entry.querySelector('.question-number');
            if (questionNumber) {
                questionNumber.textContent = (index + 1).toString();
            }
        });
    }

    // Setup drag and drop functionality for question reordering
    function setupDragAndDrop() {
        const questionEntries = document.querySelectorAll('.question-entry');
        let draggedItem = null;
        
        questionEntries.forEach(item => {
            // Only add listeners once
            if (item.getAttribute('data-drag-initialized') === 'true') {
                return;
            }
            
            item.setAttribute('data-drag-initialized', 'true');
            
            const moveHandle = item.querySelector('.move-question');
            
            // Use the move handle to initiate drag
            if (moveHandle) {
                moveHandle.addEventListener('mousedown', function() {
                    item.setAttribute('draggable', 'true');
                });
                
                moveHandle.addEventListener('mouseup', function() {
                    item.setAttribute('draggable', 'false');
                });
            }
            
            item.addEventListener('dragstart', function(e) {
                draggedItem = item;
                setTimeout(() => {
                    item.classList.add('dragging');
                }, 0);
                e.dataTransfer.setData('text/plain', ''); // Required for Firefox
            });
            
            item.addEventListener('dragend', function() {
                item.classList.remove('dragging');
                draggedItem = null;
                updateQuestionNumbers();
            });
        });
        
        // Add dragover and drop handlers to the container
        if (!questionsContainer.getAttribute('data-drop-initialized')) {
            questionsContainer.setAttribute('data-drop-initialized', 'true');
            
            questionsContainer.addEventListener('dragover', function(e) {
                e.preventDefault();
                const afterElement = getDragAfterElement(questionsContainer, e.clientY);
                if (draggedItem) {
                    if (afterElement) {
                        questionsContainer.insertBefore(draggedItem, afterElement);
                    } else {
                        questionsContainer.appendChild(draggedItem);
                    }
                }
            });
            
            questionsContainer.addEventListener('drop', function(e) {
                e.preventDefault();
            });
        }
        
        // Helper function to determine where to place the dragged item
        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('.question-entry:not(.dragging)')];
            
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }
    }

    // Document click handler for collapsing questions when clicking outside
    document.addEventListener('click', function(e) {
        // If we clicked inside a question-entry, expand it and collapse others
        const clickedQuestionEntry = e.target.closest('.question-entry');
        
        // Don't collapse if clicking on add question button or its dropdown
        const isAddQuestionClick = e.target.closest('#add-question-btn') || 
                                 e.target.closest('#question-type-dropdown');
        
        if (isAddQuestionClick) {
            return;
        }
        
        // Process all question entries
        const allQuestionEntries = document.querySelectorAll('.question-entry');
        allQuestionEntries.forEach(entry => {
            const content = entry.querySelector('.question-content');
            
            // If this is the clicked entry, expand it
            if (entry === clickedQuestionEntry) {
                content.style.display = 'block';
                entry.classList.add('expanded');
            } else {
                // Otherwise collapse it
                content.style.display = 'none';
                entry.classList.remove('expanded');
            }
        });
    });
    
    // Handle copy/duplicate question
    questionsContainer.addEventListener('click', function(e) {
        if (e.target.closest('.copy-question')) {
            const questionEntry = e.target.closest('.question-entry');
            const questionType = questionEntry.querySelector('.question-type').textContent.trim();
            const newQuestionEntry = questionEntry.cloneNode(true);
            
            // Clear any entered values in the clone
            const textareas = newQuestionEntry.querySelectorAll('textarea');
            textareas.forEach(textarea => {
                textarea.value = '';
            });
            
            const textInputs = newQuestionEntry.querySelectorAll('input[type="text"]');
            textInputs.forEach(input => {
                input.value = '';
            });
            
            // Reset radio buttons and checkboxes
            const radioButtons = newQuestionEntry.querySelectorAll('input[type="radio"]');
            radioButtons.forEach(radio => {
                radio.checked = false;
            });
            
            const checkboxes = newQuestionEntry.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            
            // Add the cloned question to the container
            questionsContainer.appendChild(newQuestionEntry);
            updateQuestionNumbers();
            setupDragAndDrop();
            
            // Focus the new question's textarea
            const textarea = newQuestionEntry.querySelector('textarea');
            if (textarea) {
                textarea.focus();
            }
        }
    });

    // Handle click events for delete, and add answer
    questionsContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-question')) {
            const questionEntry = e.target.closest('.question-entry');
            questionEntry.remove();
            updateQuestionNumbers();
        }

        if (e.target.classList.contains('add-answer')) {
            const answersGroup = e.target.closest('.form-group');
            const questionType = e.target.closest('.question-entry').querySelector('.question-type').textContent.trim();
            const newAnswer = document.createElement('div');
            newAnswer.className = 'answer-entry';
            
            if (questionType === 'Multiple Answer') {
                newAnswer.innerHTML = `
                    <input type="checkbox">
                    <input type="text" placeholder="New Answer">
                    <button type="button" class="remove-answer">&times;</button>
                `;
            } else {
                newAnswer.innerHTML = `
                    <input type="text" placeholder="New Answer">
                    <button type="button" class="remove-answer">&times;</button>
                `;
            }
            
            answersGroup.insertBefore(newAnswer, e.target);
        }

        if (e.target.classList.contains('remove-answer')) {
            const answerEntry = e.target.closest('.answer-entry');
            answerEntry.remove();
        }
    });

    // Export as QTI functionality
    exportQtiBtn.addEventListener('click', function() {
        if (validateQuiz()) {
            // Prompt for filename
            const quizTitle = document.getElementById('quiz-title').value || 'Untitled Quiz';
            const defaultFilename = quizTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.xml';
            const filename = prompt('Enter filename for export:', defaultFilename);
            
            if (filename) {
                exportAsQTI(filename);
                showSuccessMessage('Quiz exported as QTI successfully!');
            }
        }
    });

    // Function to validate the quiz before export
    function validateQuiz() {
        const questionEntries = questionsContainer.querySelectorAll('.question-entry');
        
        if (questionEntries.length === 0) {
            alert('Please add at least one question before proceeding.');
            return false;
        }

        // Check each question for validity
        for (let i = 0; i < questionEntries.length; i++) {
            const questionText = questionEntries[i].querySelector('textarea').value.trim();
            if (!questionText) {
                alert(`Question ${i + 1} is missing text. Please complete all questions.`);
                return false;
            }

            // Check if multiple choice questions have all options filled and one selected
            const questionType = questionEntries[i].querySelector('.question-type').textContent.trim();
            if (questionType === 'Multiple Choice') {
                const optionEntries = questionEntries[i].querySelectorAll('.option-entry');
                let hasEmptyOption = false;
                
                optionEntries.forEach((option) => {
                    const optionText = option.querySelector('input[type="text"]').value.trim();
                    if (!optionText) {
                        hasEmptyOption = true;
                    }
                });
                
                if (hasEmptyOption) {
                    alert(`Question ${i + 1}: All multiple choice options must be filled in.`);
                    return false;
                }
                
                const hasSelectedOption = Array.from(questionEntries[i].querySelectorAll('input[type="radio"]')).some(radio => radio.checked);
                if (!hasSelectedOption) {
                    alert(`Question ${i + 1}: Please select a correct answer for the multiple choice question.`);
                    return false;
                }
            }

            // Check if multiple answer questions have all options filled and at least one selected
            if (questionType === 'Multiple Answer') {
                const answerEntries = questionEntries[i].querySelectorAll('.answer-entry');
                let hasEmptyAnswer = false;
                
                answerEntries.forEach((answer) => {
                    const answerText = answer.querySelector('input[type="text"]').value.trim();
                    if (!answerText) {
                        hasEmptyAnswer = true;
                    }
                });
                
                if (hasEmptyAnswer) {
                    alert(`Question ${i + 1}: All multiple answer options must be filled in.`);
                    return false;
                }
                
                const hasSelectedOption = Array.from(questionEntries[i].querySelectorAll('input[type="checkbox"]')).some(checkbox => checkbox.checked);
                if (!hasSelectedOption) {
                    alert(`Question ${i + 1}: Please select at least one correct answer for the multiple answer question.`);
                    return false;
                }
            }
            
            // Check if fill in the blank questions have all answers filled
            if (questionType === 'Fill In The Blank') {
                const answerEntries = questionEntries[i].querySelectorAll('.answer-entry');
                
                if (answerEntries.length === 0) {
                    alert(`Question ${i + 1}: Please add at least one answer for the fill in the blank question.`);
                    return false;
                }
                
                let hasEmptyAnswer = false;
                answerEntries.forEach((answer) => {
                    const answerText = answer.querySelector('input[type="text"]').value.trim();
                    if (!answerText) {
                        hasEmptyAnswer = true;
                    }
                });
                
                if (hasEmptyAnswer) {
                    alert(`Question ${i + 1}: All fill in the blank answers must be filled in.`);
                    return false;
                }
            }
        }

        return true;
    }

    // Function to export quiz as QTI
    function exportAsQTI(filename) {
        // Gather all quiz data
        const quizData = collectQuizData();
        
        // Generate QTI XML
        const qtiXML = generateQTIXML(quizData);
        
        // Create a downloadable file
        const blob = new Blob([qtiXML], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Function to collect all quiz data
    function collectQuizData() {
        const questionEntries = questionsContainer.querySelectorAll('.question-entry');
        const quizData = {
            title: document.getElementById('quiz-title').value || 'Untitled Quiz',
            description: document.getElementById('quiz-description').value || '',
            questions: []
        };

        questionEntries.forEach((entry, index) => {
            const questionType = entry.querySelector('.question-type').textContent.trim();
            const questionText = entry.querySelector('textarea').value.trim();
            const questionData = {
                id: `q${index + 1}`,
                type: questionType,
                text: questionText,
                options: []
            };

            // Collect options/answers based on question type
            if (questionType === 'Multiple Choice') {
                const optionEntries = entry.querySelectorAll('.option-entry');
                optionEntries.forEach((optionEntry, optIndex) => {
                    const optionText = optionEntry.querySelector('input[type="text"]').value.trim();
                    const isCorrect = optionEntry.querySelector('input[type="radio"]').checked;
                    if (optionText) {
                        questionData.options.push({
                            id: `q${index + 1}_opt${optIndex + 1}`,
                            text: optionText,
                            isCorrect: isCorrect
                        });
                    }
                });
            } else if (questionType === 'Multiple Answer') {
                const answerEntries = entry.querySelectorAll('.answer-entry');
                answerEntries.forEach((answerEntry, ansIndex) => {
                    const answerText = answerEntry.querySelector('input[type="text"]').value.trim();
                    const isCorrect = answerEntry.querySelector('input[type="checkbox"]').checked;
                    if (answerText) {
                        questionData.options.push({
                            id: `q${index + 1}_ans${ansIndex + 1}`,
                            text: answerText,
                            isCorrect: isCorrect
                        });
                    }
                });
            } else if (questionType === 'Fill in the Blank') {
                const answerEntries = entry.querySelectorAll('.answer-entry');
                answerEntries.forEach((answerEntry, ansIndex) => {
                    const answerText = answerEntry.querySelector('input[type="text"]').value.trim();
                    if (answerText) {
                        questionData.options.push({
                            id: `q${index + 1}_ans${ansIndex + 1}`,
                            text: answerText,
                            isCorrect: true
                        });
                    }
                });
            } else if (questionType === 'Essay') {
                // Essay questions don't have options/answers, but we'll add a placeholder
                questionData.options.push({
                    id: `q${index + 1}_essay`,
                    text: 'Essay response',
                    isCorrect: false
                });
            }

            quizData.questions.push(questionData);
        });

        return quizData;
    }

    // Function to generate QTI XML from quiz data
    function generateQTIXML(quizData) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>';
        xml += '<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">';
        xml += '<assessment title="' + escapeXML(quizData.title) + '" ident="' + generateUUID() + '">';
        xml += '<qtimetadata><qtimetadatafield><fieldlabel>qmd_description</fieldlabel><fieldentry>' + escapeXML(quizData.description) + '</fieldentry></qtimetadatafield></qtimetadata>';
        xml += '<section ident="section1">';
        
        quizData.questions.forEach(question => {
            xml += generateQuestionXML(question);
        });
        
        xml += '</section>';
        xml += '</assessment>';
        xml += '</questestinterop>';
        
        return xml;
    }

    // Function to generate XML for a specific question
    function generateQuestionXML(question) {
        let xml = '';
        
        if (question.type === 'Multiple Choice') {
            xml += '<item ident="' + question.id + '" title="' + escapeXML(question.text) + '">';
            xml += '<itemmetadata><qtimetadata><qtimetadatafield><fieldlabel>question_type</fieldlabel><fieldentry>multiple_choice_question</fieldentry></qtimetadatafield></qtimetadata></itemmetadata>';
            xml += '<presentation><material><mattext texttype="text/html">' + escapeXML(question.text) + '</mattext></material>';
            xml += '<response_lid ident="response1" rcardinality="Single"><render_choice>';
            
            question.options.forEach(option => {
                xml += '<response_label ident="' + option.id + '"><material><mattext texttype="text/html">' + escapeXML(option.text) + '</mattext></material></response_label>';
            });
            
            xml += '</render_choice></response_lid></presentation>';
            xml += '<resprocessing><outcomes><decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/></outcomes>';
            
            question.options.forEach(option => {
                if (option.isCorrect) {
                    xml += '<respcondition continue="No"><conditionvar><varequal respident="response1">' + option.id + '</varequal></conditionvar>';
                    xml += '<setvar action="Set" varname="SCORE">100</setvar></respcondition>';
                }
            });
            
            xml += '</resprocessing></item>';
        } else if (question.type === 'Multiple Answer') {
            xml += '<item ident="' + question.id + '" title="' + escapeXML(question.text) + '">';
            xml += '<itemmetadata><qtimetadata><qtimetadatafield><fieldlabel>question_type</fieldlabel><fieldentry>multiple_answers_question</fieldentry></qtimetadatafield></qtimetadata></itemmetadata>';
            xml += '<presentation><material><mattext texttype="text/html">' + escapeXML(question.text) + '</mattext></material>';
            xml += '<response_lid ident="response1" rcardinality="Multiple"><render_choice>';
            
            question.options.forEach(option => {
                xml += '<response_label ident="' + option.id + '"><material><mattext texttype="text/html">' + escapeXML(option.text) + '</mattext></material></response_label>';
            });
            
            xml += '</render_choice></response_lid></presentation>';
            xml += '<resprocessing><outcomes><decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/></outcomes>';
            
            // Count correct answers
            const correctCount = question.options.filter(opt => opt.isCorrect).length;
            const pointsPerCorrect = 100 / correctCount;
            
            question.options.forEach(option => {
                if (option.isCorrect) {
                    xml += '<respcondition><conditionvar><varequal respident="response1">' + option.id + '</varequal></conditionvar>';
                    xml += '<setvar action="Add" varname="SCORE">' + pointsPerCorrect + '</setvar></respcondition>';
                }
            });
            
            xml += '</resprocessing></item>';
        } else if (question.type === 'Fill in the Blank') {
            xml += '<item ident="' + question.id + '" title="' + escapeXML(question.text) + '">';
            xml += '<itemmetadata><qtimetadata><qtimetadatafield><fieldlabel>question_type</fieldlabel><fieldentry>fill_in_multiple_blanks_question</fieldentry></qtimetadatafield></qtimetadata></itemmetadata>';
            xml += '<presentation><material><mattext texttype="text/html">' + escapeXML(question.text) + '</mattext></material>';
            xml += '<response_str ident="response1" rcardinality="Single"><render_fib>';
            xml += '<response_label ident="answer1"/>';
            xml += '</render_fib></response_str></presentation>';
            xml += '<resprocessing><outcomes><decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/></outcomes>';
            
            question.options.forEach(option => {
                xml += '<respcondition><conditionvar><varequal respident="response1" case="No">' + escapeXML(option.text) + '</varequal></conditionvar>';
                xml += '<setvar action="Set" varname="SCORE">100</setvar></respcondition>';
            });
            
            xml += '</resprocessing></item>';
        } else if (question.type === 'Essay') {
            xml += '<item ident="' + question.id + '" title="' + escapeXML(question.text) + '">';
            xml += '<itemmetadata><qtimetadata><qtimetadatafield><fieldlabel>question_type</fieldlabel><fieldentry>essay_question</fieldentry></qtimetadatafield></qtimetadata></itemmetadata>';
            xml += '<presentation><material><mattext texttype="text/html">' + escapeXML(question.text) + '</mattext></material>';
            xml += '<response_str ident="response1" rcardinality="Single"><render_fib>';
            xml += '<response_label ident="answer1"/>';
            xml += '</render_fib></response_str></presentation>';
            xml += '<resprocessing><outcomes><decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/></outcomes></resprocessing>';
            xml += '</item>';
        }
        
        return xml;
    }

    // Function to show success message
    function showSuccessMessage(message) {
        successText.textContent = message;
        successMessage.classList.add('show');
        setTimeout(() => {
            successMessage.classList.remove('show');
        }, 3000);
    }

    // Helper function to escape XML special characters
    function escapeXML(unsafe) {
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    // Helper function to generate UUID
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Get the HTML template for a specific question type
    function getQuestionTemplate(type) {
        const templates = {
            'multiple-choice': `
                <div class="form-group">
                    <label>Question:</label>
                    <textarea placeholder="Enter your question here"></textarea>
                </div>
                <div class="form-group">
                    <label>Options:</label>
                    <div class="option-entry">
                        <input type="radio" name="correct-option" required>
                        <input type="text" placeholder="Option 1">
                    </div>
                    <div class="option-entry">
                        <input type="radio" name="correct-option">
                        <input type="text" placeholder="Option 2">
                    </div>
                    <div class="option-entry">
                        <input type="radio" name="correct-option">
                        <input type="text" placeholder="Option 3">
                    </div>
                    <div class="option-entry">
                        <input type="radio" name="correct-option">
                        <input type="text" placeholder="Option 4">
                    </div>
                </div>
            `,
            'multiple-answer': `
                <div class="form-group">
                    <label>Question:</label>
                    <textarea placeholder="Enter your question here"></textarea>
                </div>
                <div class="form-group">
                    <label>Answers: (select all correct answers)</label>
                    <div class="answer-entry">
                        <input type="checkbox">
                        <input type="text" placeholder="Answer 1">
                        <button type="button" class="remove-answer">&times;</button>
                    </div>
                    <div class="answer-entry">
                        <input type="checkbox">
                        <input type="text" placeholder="Answer 2">
                        <button type="button" class="remove-answer">&times;</button>
                    </div>
                    <button type="button" class="add-answer">+ Add Answer</button>
                </div>
            `,
            'fill-in-the-blank': `
                <div class="form-group">
                    <label>Question:</label>
                    <textarea placeholder="Enter your question here (use ___ for blanks)"></textarea>
                </div>
                <div class="form-group">
                    <label>Acceptable Answers:</label>
                    <div class="answer-entry">
                        <input type="text" placeholder="Answer 1">
                        <button type="button" class="remove-answer">&times;</button>
                    </div>
                    <button type="button" class="add-answer">+ Add Alternative Answer</button>
                </div>
            `,
            'essay': `
                <div class="form-group">
                    <label>Question:</label>
                    <textarea placeholder="Enter your essay question here"></textarea>
                </div>
            `
        };

        return templates[type] || '';
    }

    function formatQuestionType(type) {
        return type.replace('-', ' ').replace(/\w\S*/g, function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    }
});