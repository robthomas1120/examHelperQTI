/**
 * Question Processor for Item Bank
 * Processes and manages question data
 */
class QuestionProcessor {
    constructor() {
        this.questions = {
            all: [],
            MC: [],
            MA: [],
            TF: [],
            ESS: [],
            FIB: []
        };
        this.selectedQuestions = [];
    }

    /**
     * Set questions data
     * @param {Object} questionsData - Organized questions data
     */
    setQuestions(questionsData) {
        this.questions = questionsData;
        this.selectedQuestions = [];
    }

    /**
     * Get all questions
     * @returns {Array} - All questions
     */
    getAllQuestions() {
        return this.questions.all;
    }

    /**
     * Get questions by type
     * @param {String} type - Question type (MC, MA, TF, ESS, FIB)
     * @returns {Array} - Questions of the specified type
     */
    getQuestionsByType(type) {
        return this.questions[type] || [];
    }

    /**
     * Add question to selected questions
     * @param {Object} question - Question to add
     */
    addSelectedQuestion(question) {
        // Check if question already selected
        if (!this.isQuestionSelected(question.id)) {
            this.selectedQuestions.push({...question, selectedId: `sel_${question.id}`});
        }
    }

    /**
     * Remove question from selected questions
     * @param {String} questionId - ID of question to remove
     */
    removeSelectedQuestion(questionId) {
        this.selectedQuestions = this.selectedQuestions.filter(q => 
            q.id !== questionId && q.selectedId !== questionId
        );
    }

    /**
     * Clear all selected questions
     */
    clearSelectedQuestions() {
        this.selectedQuestions = [];
    }

    /**
     * Check if a question is selected
     * @param {String} questionId - Question ID to check
     * @returns {Boolean} - True if question is selected
     */
    isQuestionSelected(questionId) {
        return this.selectedQuestions.some(q => q.id === questionId);
    }

    /**
     * Get selected questions
     * @returns {Array} - Selected questions
     */
    getSelectedQuestions() {
        return this.selectedQuestions;
    }

    /**
     * Get selected questions count
     * @returns {Number} - Count of selected questions
     */
    getSelectedCount() {
        return this.selectedQuestions.length;
    }

    /**
     * Update the order of selected questions
     * @param {Array} newOrder - New order of selected question IDs
     */
    updateSelectedQuestionOrder(newOrder) {
        // Create a new array based on the new order
        const reordered = [];
        
        newOrder.forEach(id => {
            const question = this.selectedQuestions.find(q => q.selectedId === id);
            if (question) {
                reordered.push(question);
            }
        });
        
        this.selectedQuestions = reordered;
    }

    /**
     * Format question data for display
     * @param {Object} question - Question object to format
     * @returns {Object} - Formatted question with additional display data
     */
    formatQuestionForDisplay(question) {
        // Return the question as-is if it already has formatting data
        if (question.options || question.correctAnswers || 
            question.correctAnswerIndex !== undefined || 
            question.correctAnswerIndices ||
            question.isTrue !== undefined) {
            return {...question};
        }
        
        const formattedQuestion = {...question};
        const type = question.type;
        const data = question.data;
        
        switch (type) {
            case 'MC': // Multiple Choice
                formattedQuestion.options = this.formatMultipleChoiceOptions(data);
                formattedQuestion.correctAnswerIndex = this.findCorrectMCAnswer(data);
                break;
                
            case 'MA': // Multiple Answer
                formattedQuestion.options = this.formatMultipleAnswerOptions(data);
                formattedQuestion.correctAnswerIndices = this.findCorrectMAAnswers(data);
                break;
                
            case 'TF': // True/False
                formattedQuestion.isTrue = this.isTrueFalseTrue(data);
                break;
                
            case 'FIB': // Fill in Blank
                formattedQuestion.correctAnswers = this.getFIBAnswers(data);
                formattedQuestion.formattedText = this.formatFIBQuestionText(data[0] || '');
                break;
        }
        
        return formattedQuestion;
    }

    /**
     * Format multiple choice options
     * @param {Array} data - Raw question data
     * @returns {Array} - Formatted options
     */
    formatMultipleChoiceOptions(data) {
        const options = [];
        let startIdx = 0;
        
        // Check if first element is question type
        if (data[0] && data[0].toString().toUpperCase() === 'MC') {
            startIdx = 2; // Skip question type and question text
        } else {
            startIdx = 1; // Skip question text only
        }
        
        // Check if we have a tagging format (correct/incorrect labels)
        const hasTagging = data.some(cell => cell && 
            (cell.toString().toLowerCase() === 'correct' || 
             cell.toString().toLowerCase() === 'incorrect'));
        
        if (hasTagging) {
            // Process with tagging format
            for (let i = startIdx; i < data.length; i += 2) {
                if (i + 1 < data.length && data[i]) {
                    options.push({
                        text: data[i].toString(),
                        isCorrect: data[i + 1] && data[i + 1].toString().toLowerCase() === 'correct'
                    });
                }
            }
        } else {
            // Process as simple options (assume first option is correct)
            for (let i = startIdx; i < data.length; i++) {
                if (data[i]) {
                    options.push({
                        text: data[i].toString(),
                        isCorrect: i === startIdx // Assume first option is correct
                    });
                }
            }
        }
        
        return options;
    }

    /**
     * Find the index of the correct answer for multiple choice questions
     * @param {Array} data - Raw question data
     * @returns {Number} - Index of correct answer or 0 if none found
     */
    findCorrectMCAnswer(data) {
        let startIdx = 0;
        
        // Check if first element is question type
        if (data[0] && data[0].toString().toUpperCase() === 'MC') {
            startIdx = 2; // Skip question type and question text
        } else {
            startIdx = 1; // Skip question text only
        }
        
        // Check if we have a tagging format
        const hasTagging = data.some(cell => cell && 
            (cell.toString().toLowerCase() === 'correct' || 
             cell.toString().toLowerCase() === 'incorrect'));
        
        if (hasTagging) {
            for (let i = startIdx; i < data.length; i += 2) {
                if (i + 1 < data.length && data[i + 1] && 
                    data[i + 1].toString().toLowerCase() === 'correct') {
                    return Math.floor((i - startIdx) / 2);
                }
            }
        }
        
        // Default to first option
        return 0;
    }

    /**
     * Format multiple answer options
     * @param {Array} data - Raw question data
     * @returns {Array} - Formatted options
     */
    formatMultipleAnswerOptions(data) {
        // Similar to multiple choice
        return this.formatMultipleChoiceOptions(data);
    }

    /**
     * Find the indices of correct answers for multiple answer questions
     * @param {Array} data - Raw question data
     * @returns {Array} - Indices of correct answers
     */
    findCorrectMAAnswers(data) {
        const correctIndices = [];
        let startIdx = 0;
        
        // Check if first element is question type
        if (data[0] && data[0].toString().toUpperCase() === 'MA') {
            startIdx = 2; // Skip question type and question text
        } else {
            startIdx = 1; // Skip question text only
        }
        
        // Check if we have a tagging format
        const hasTagging = data.some(cell => cell && 
            (cell.toString().toLowerCase() === 'correct' || 
             cell.toString().toLowerCase() === 'incorrect'));
        
        if (hasTagging) {
            for (let i = startIdx; i < data.length; i += 2) {
                if (i + 1 < data.length && data[i + 1] && 
                    data[i + 1].toString().toLowerCase() === 'correct') {
                    correctIndices.push(Math.floor((i - startIdx) / 2));
                }
            }
        } else {
            // If no tagging, assume alternating pattern or first few are correct
            for (let i = startIdx; i < Math.min(startIdx + 3, data.length); i++) {
                correctIndices.push(i - startIdx);
            }
        }
        
        return correctIndices;
    }

    /**
     * Check if a True/False question is True
     * @param {Array} data - Raw question data
     * @returns {Boolean} - True if the answer is TRUE
     */
    isTrueFalseTrue(data) {
        // For TF questions, the answer is typically in the second column
        if (data.length >= 2) {
            const answer = data[1].toString().toLowerCase();
            return answer === 'true' || answer === 't' || answer === '1';
        }
        
        return false;
    }

    /**
     * Get correct answers for Fill in Blank questions
     * @param {Array} data - Raw question data
     * @returns {Array} - Array of correct answers
     */
    getFIBAnswers(data) {
        const answers = [];
        
        // Answers typically start from second column
        for (let i = 1; i < data.length; i++) {
            if (data[i] && data[i].toString().trim() !== '') {
                answers.push(data[i].toString());
            }
        }
        
        // If no answers found but we have a question with blanks, provide placeholder
        if (answers.length === 0 && data[0] && data[0].toString().includes('_')) {
            answers.push('(No answer provided)');
        }
        
        return answers;
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
}

// Export the QuestionProcessor class
window.QuestionProcessor = QuestionProcessor;