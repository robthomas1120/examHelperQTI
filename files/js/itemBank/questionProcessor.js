/**
 * QuestionProcessor - Core component for managing question data
 * Handles question filtering, selection, and formatting for display
 */
class QuestionProcessor {
    constructor() {
        this.questions = {
            all: [],
            MC: [],  // Multiple Choice
            MA: [],  // Multiple Answer
            TF: [],  // True/False
            ESS: [], // Essay
            FIB: []  // Fill in Blank
        };
        this.selectedQuestions = [];
        console.log('QuestionProcessor: Initialized');
    }

    /**
     * Load questions data into processor
     */
    setQuestions(questionsData) {
        try {
            if (!questionsData || typeof questionsData !== 'object') {
                console.error('QuestionProcessor: Invalid question data provided', questionsData);
                return;
            }
            
            this.questions = questionsData;
            this.selectedQuestions = [];
            console.log(`QuestionProcessor: Loaded ${this.questions.all.length} questions`);
        } catch (error) {
            console.error('QuestionProcessor: Error setting questions', error);
        }
    }

    /**
     * Get all available questions
     */
    getAllQuestions() {
        return this.questions.all;
    }

    /**
     * Get questions filtered by type
     */
    getQuestionsByType(type) {
        if (!type || !this.questions[type]) {
            console.warn(`QuestionProcessor: Invalid question type requested: ${type}`);
            return [];
        }
        return this.questions[type] || [];
    }

    /**
     * Add question to selection queue
     */
    addSelectedQuestion(question) {
        try {
            if (!question || !question.id) {
                console.error('QuestionProcessor: Cannot select invalid question', question);
                return;
            }
            
            // Check if question already selected
            if (!this.isQuestionSelected(question.id)) {
                this.selectedQuestions.push({...question, selectedId: `sel_${question.id}`});
                console.log(`QuestionProcessor: Selected question ${question.id}`);
            } else {
                console.log(`QuestionProcessor: Question ${question.id} already selected`);
            }
        } catch (error) {
            console.error('QuestionProcessor: Error adding selected question', error);
        }
    }

    /**
     * Remove question from selection queue
     */
    removeSelectedQuestion(questionId) {
        try {
            const originalCount = this.selectedQuestions.length;
            
            this.selectedQuestions = this.selectedQuestions.filter(q => 
                q.id !== questionId && q.selectedId !== questionId
            );
            
            if (originalCount !== this.selectedQuestions.length) {
                console.log(`QuestionProcessor: Removed question ${questionId} from selection`);
            } else {
                console.warn(`QuestionProcessor: Question ${questionId} not found in selection`);
            }
        } catch (error) {
            console.error('QuestionProcessor: Error removing selected question', error);
        }
    }

    /**
     * Reset selection queue
     */
    clearSelectedQuestions() {
        try {
            const count = this.selectedQuestions.length;
            this.selectedQuestions = [];
            console.log(`QuestionProcessor: Cleared ${count} selected questions`);
        } catch (error) {
            console.error('QuestionProcessor: Error clearing selected questions', error);
        }
    }

    /**
     * Check if question is in selection queue
     */
    isQuestionSelected(questionId) {
        if (!questionId) {
            console.warn('QuestionProcessor: Invalid question ID checked for selection');
            return false;
        }
        return this.selectedQuestions.some(q => q.id === questionId);
    }

    /**
     * Get current selection queue
     */
    getSelectedQuestions() {
        return this.selectedQuestions;
    }

    /**
     * Get number of selected questions
     */
    getSelectedCount() {
        return this.selectedQuestions.length;
    }

    /**
     * Reorder questions in selection queue
     */
    updateSelectedQuestionOrder(newOrder) {
        try {
            if (!Array.isArray(newOrder)) {
                console.error('QuestionProcessor: Invalid order array provided', newOrder);
                return;
            }
            
            // Create a new array based on the new order
            const reordered = [];
            
            newOrder.forEach(id => {
                const question = this.selectedQuestions.find(q => q.selectedId === id);
                if (question) {
                    reordered.push(question);
                } else {
                    console.warn(`QuestionProcessor: Question with ID ${id} not found when reordering`);
                }
            });
            
            if (reordered.length !== this.selectedQuestions.length) {
                console.warn(`QuestionProcessor: Reordering lost some questions. Original: ${this.selectedQuestions.length}, New: ${reordered.length}`);
            }
            
            this.selectedQuestions = reordered;
            console.log(`QuestionProcessor: Reordered ${reordered.length} questions`);
        } catch (error) {
            console.error('QuestionProcessor: Error updating question order', error);
        }
    }

    /**
     * Prepare question data for UI display
     */
    formatQuestionForDisplay(question) {
        try {
            if (!question || !question.type) {
                console.error('QuestionProcessor: Cannot format invalid question', question);
                return question || {};
            }
            
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
            
            if (!data || !Array.isArray(data)) {
                console.warn(`QuestionProcessor: Question ${question.id} has invalid data`, data);
                return formattedQuestion;
            }
            
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
                    
                default:
                    console.warn(`QuestionProcessor: Unknown question type "${type}" for question ${question.id}`);
            }
            
            return formattedQuestion;
        } catch (error) {
            console.error('QuestionProcessor: Error formatting question for display', error);
            return question || {};
        }
    }

    /**
     * Extract and format MC options from raw data
     */
    formatMultipleChoiceOptions(data) {
        try {
            const options = [];
            
            if (!data || !Array.isArray(data) || data.length < 2) {
                console.warn('QuestionProcessor: Invalid MC data format', data);
                return [{ text: 'No options available', isCorrect: false }];
            }
            
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
            
            if (options.length === 0) {
                console.warn('QuestionProcessor: No options extracted from MC question data');
                return [{ text: 'No options available', isCorrect: false }];
            }
            
            return options;
        } catch (error) {
            console.error('QuestionProcessor: Error formatting MC options', error);
            return [{ text: 'Error processing options', isCorrect: false }];
        }
    }

    /**
     * Find correct answer index for MC questions
     */
    findCorrectMCAnswer(data) {
        try {
            if (!data || !Array.isArray(data)) {
                console.warn('QuestionProcessor: Invalid data for finding MC answer', data);
                return 0;
            }
            
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
        } catch (error) {
            console.error('QuestionProcessor: Error finding MC correct answer', error);
            return 0;
        }
    }

    /**
     * Format MA options (uses MC formatter)
     */
    formatMultipleAnswerOptions(data) {
        // Reuse multiple choice formatter
        return this.formatMultipleChoiceOptions(data);
    }

    /**
     * Find correct answer indices for MA questions
     */
    findCorrectMAAnswers(data) {
        try {
            const correctIndices = [];
            
            if (!data || !Array.isArray(data)) {
                console.warn('QuestionProcessor: Invalid data for finding MA answers', data);
                return [0];
            }
            
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
            
            if (correctIndices.length === 0) {
                console.warn('QuestionProcessor: No correct answers found for MA question');
                return [0]; // Default to first option
            }
            
            return correctIndices;
        } catch (error) {
            console.error('QuestionProcessor: Error finding MA correct answers', error);
            return [0];
        }
    }

    /**
     * Determine if TF question is true
     */
    isTrueFalseTrue(data) {
        try {
            if (!data || !Array.isArray(data) || data.length < 2) {
                console.warn('QuestionProcessor: Invalid TF data format', data);
                return false;
            }
            
            // For TF questions, the answer is typically in the second column
            if (data.length >= 2 && data[1]) {
                const answer = data[1].toString().toLowerCase();
                return answer === 'true' || answer === 't' || answer === '1';
            }
            
            return false;
        } catch (error) {
            console.error('QuestionProcessor: Error processing TF answer', error);
            return false;
        }
    }

    /**
     * Extract correct answers for FIB questions
     */
    getFIBAnswers(data) {
        try {
            const answers = [];
            
            if (!data || !Array.isArray(data)) {
                console.warn('QuestionProcessor: Invalid FIB data format', data);
                return ['(Error processing answers)'];
            }
            
            // Answers typically start from second column
            for (let i = 1; i < data.length; i++) {
                if (data[i] && data[i].toString().trim() !== '') {
                    answers.push(data[i].toString());
                }
            }
            
            // If no answers found but we have a question with blanks, provide placeholder
            if (answers.length === 0 && data[0] && data[0].toString().includes('_')) {
                console.warn('QuestionProcessor: FIB question has blanks but no answers provided');
                answers.push('(No answer provided)');
            }
            
            if (answers.length === 0) {
                console.warn('QuestionProcessor: No answers found for FIB question');
                return ['(No answers available)'];
            }
            
            return answers;
        } catch (error) {
            console.error('QuestionProcessor: Error extracting FIB answers', error);
            return ['(Error processing answers)'];
        }
    }

    /**
     * Format FIB question text with styled blanks
     */
    formatFIBQuestionText(text) {
        try {
            if (!text) {
                console.warn('QuestionProcessor: Empty FIB question text');
                return '';
            }
            
            // Replace underscores with highlighted spans
            return text.replace(/_{2,}/g, '<span class="blank">_____</span>')
                      .replace(/\s_+\s/g, ' <span class="blank">_____</span> ')
                      .replace(/_+/g, '<span class="blank">_____</span>');
        } catch (error) {
            console.error('QuestionProcessor: Error formatting FIB question text', error);
            return text || '';
        }
    }
}

// Export the QuestionProcessor class
window.QuestionProcessor = QuestionProcessor;