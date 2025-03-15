/**
 * File Handler for Item Bank
 * Handles file uploads, parsing, and format validation
 */
class FileHandler {
    constructor() {
        this.currentFile = null;
        this.processedData = null;
    }

    /**
     * Process the uploaded file (CSV or Excel)
     * @param {File} file - The uploaded file
     * @returns {Promise} - Resolves with processed data or rejects with error
     */
    async processFile(file) {
        this.currentFile = file;
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        try {
            let data;
            if (fileExtension === 'csv') {
                data = await this.parseCSV(file);
            } else if (['xlsx', 'xls'].includes(fileExtension)) {
                data = await this.parseExcel(file);
            } else {
                throw new Error('Unsupported file format. Please upload CSV or Excel file.');
            }
            
            this.processedData = await this.organizeQuestions(data);
            return this.processedData;
        } catch (error) {
            console.error('Error processing file:', error);
            throw error;
        }
    }

    /**
     * Parse CSV file
     * @param {File} file - The CSV file
     * @returns {Promise} - Resolves with parsed data
     */
    parseCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const csvContent = event.target.result;
                
                Papa.parse(csvContent, {
                    header: false,
                    skipEmptyLines: true,
                    complete: (results) => {
                        // Process the data to identify sheet types
                        const processedData = this.processSheetData(results.data);
                        resolve(processedData);
                    },
                    error: (error) => {
                        reject(new Error('Failed to parse CSV file: ' + error.message));
                    }
                });
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read the file'));
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Parse Excel file
     * @param {File} file - The Excel file
     * @returns {Promise} - Resolves with parsed data
     */
    parseExcel(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    const processedData = {};
                    
                    // Check if we have multiple sheets or just one
                    if (workbook.SheetNames.length > 1) {
                        // Process each sheet
                        workbook.SheetNames.forEach(sheetName => {
                            // Skip the Instructions sheet
                            if (sheetName.toLowerCase() === 'instructions') return;
                            
                            const sheet = workbook.Sheets[sheetName];
                            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                            
                            // Determine question type from sheet name
                            const questionType = this.getQuestionTypeFromSheetName(sheetName);
                            if (questionType) {
                                processedData[questionType] = jsonData;
                            }
                        });
                    } else {
                        // Single sheet - try to process by row type
                        const sheet = workbook.Sheets[workbook.SheetNames[0]];
                        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                        const processedSingleSheet = this.processSheetData(jsonData);
                        Object.assign(processedData, processedSingleSheet);
                    }
                    
                    resolve(processedData);
                } catch (error) {
                    reject(new Error('Failed to parse Excel file: ' + error.message));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read the file'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Process sheet data to identify question types
     * @param {Array} data - Raw data from the sheet
     * @returns {Object} - Data organized by question type
     */
    processSheetData(data) {
        const processedData = {
            MC: [],
            MA: [],
            TF: [],
            ESS: [],
            FIB: []
        };
        
        // First, check if this is a structured file with question types in headers
        const headers = data[0] || [];
        const hasStructuredHeader = headers.length > 0 && 
                                  (headers.includes('Question') || 
                                   headers.includes('Choice1') || 
                                   headers.includes('tagging'));

        // Skip the header row if it exists
        const startRow = hasStructuredHeader ? 1 : 0;
                
        // Process the data
        for (let i = startRow; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;
            
            // Check for patterns in the data to determine question type
            const questionType = this.identifyQuestionType(row);
            if (questionType) {
                processedData[questionType].push(row);
            }
        }
        
        return processedData;
    }

    /**
     * Identify question type based on row structure
     * @param {Array} row - Row data
     * @returns {String|null} - Question type or null if unidentified
     */
    identifyQuestionType(row) {
        // If the first cell explicitly states the question type
        if (row[0] && typeof row[0] === 'string') {
            const firstCell = row[0].toString().trim().toUpperCase();
            if (['MC', 'MA', 'TF', 'ESS', 'FIB'].includes(firstCell)) {
                return firstCell;
            }
        }

        // Image 1 & 2 format (multiple choice/answer questions with tagging)
        if (row.length > 3 && 
            row.some(cell => cell && 
                    (cell.toString().toLowerCase() === 'correct' || 
                     cell.toString().toLowerCase() === 'incorrect' || 
                     cell.toString().toLowerCase() === 'incofrect'))) { // Handle typo seen in sample
            
            // Check if it's multiple answer (has multiple correct answers)
            let correctCount = 0;
            for (let i = 0; i < row.length; i++) {
                if (row[i] && row[i].toString().toLowerCase() === 'correct') {
                    correctCount++;
                }
            }
            
            return correctCount > 1 ? 'MA' : 'MC';
        }
        
        // Image 3 format (true/false)
        if (row.length >= 2 && 
            row[1] && 
            (row[1].toString().toLowerCase() === 'true' || 
             row[1].toString().toLowerCase() === 'false' || 
             row[1].toString().toLowerCase() === 't' || 
             row[1].toString().toLowerCase() === 'f' || 
             row[1].toString() === '1' || 
             row[1].toString() === '0')) {
            return 'TF';
        }
        
        // Image 4 format (essay questions)
        if (row.length >= 1 && 
            row[0] && 
            row[0].toString().includes('?') && 
            row.length === 1) {
            return 'ESS';
        }
        
        // Image 5 format (fill in the blank)
        if (row.length >= 2 && 
            row[0] && 
            row[0].toString().includes('_____')) {
            return 'FIB';
        }
        
        // If question contains blanks indicated by underscores
        if (row[0] && row[0].toString().includes('_')) {
            return 'FIB';
        }
        
        // If no specific pattern is found but there's a question with no options
        if (row[0] && row[0].toString().trim().length > 20 && row.length === 1) {
            return 'ESS';
        }
        
        // Default to MC if we have a question with choices but can't determine type
        if (row.length > 2) {
            return 'MC';
        }
        
        return null;
    }

    /**
     * Get question type from sheet name
     * @param {String} sheetName - Name of the sheet
     * @returns {String|null} - Question type or null if unrecognized
     */
    getQuestionTypeFromSheetName(sheetName) {
        const name = sheetName.trim().toUpperCase();
        
        if (name === 'MC' || name.includes('MULTIPLE CHOICE')) {
            return 'MC';
        } else if (name === 'MA' || name.includes('MULTIPLE ANSWER')) {
            return 'MA';
        } else if (name === 'TF' || name.includes('TRUE FALSE') || name.includes('TRUE/FALSE')) {
            return 'TF';
        } else if (name === 'ESS' || name.includes('ESSAY')) {
            return 'ESS';
        } else if (name === 'FIB' || name.includes('FILL IN') || name.includes('FILL-IN')) {
            return 'FIB';
        }
        
        return null;
    }

    /**
     * Organize questions by type into a structured format
     * @param {Object} data - Raw data organized by question type
     * @returns {Object} - Structured question data
     */
    async organizeQuestions(data) {
        const questions = {
            MC: [],  // Multiple Choice
            MA: [],  // Multiple Answer
            TF: [],  // True/False
            ESS: [], // Essay
            FIB: [], // Fill in Blank
            all: []  // All questions
        };
        
        // Process Multiple Choice questions
        if (data.MC && data.MC.length > 0) {
            data.MC.forEach((row, index) => {
                const question = this.processMCQuestion(row, index);
                if (question) {
                    questions.MC.push(question);
                    questions.all.push(question);
                }
            });
        }
        
        // Process Multiple Answer questions
        if (data.MA && data.MA.length > 0) {
            data.MA.forEach((row, index) => {
                const question = this.processMAQuestion(row, index);
                if (question) {
                    questions.MA.push(question);
                    questions.all.push(question);
                }
            });
        }
        
        // Process True/False questions
        if (data.TF && data.TF.length > 0) {
            data.TF.forEach((row, index) => {
                const question = this.processTFQuestion(row, index);
                if (question) {
                    questions.TF.push(question);
                    questions.all.push(question);
                }
            });
        }
        
        // Process Essay questions
        if (data.ESS && data.ESS.length > 0) {
            data.ESS.forEach((row, index) => {
                const question = this.processESSQuestion(row, index);
                if (question) {
                    questions.ESS.push(question);
                    questions.all.push(question);
                }
            });
        }
        
        // Process Fill in Blank questions
        if (data.FIB && data.FIB.length > 0) {
            data.FIB.forEach((row, index) => {
                const question = this.processFIBQuestion(row, index);
                if (question) {
                    questions.FIB.push(question);
                    questions.all.push(question);
                }
            });
        }
        
        return questions;
    }

    /**
     * Process Multiple Choice question
     * @param {Array} row - Question data row
     * @param {Number} index - Question index
     * @returns {Object|null} - Structured question object or null if invalid
     */
    processMCQuestion(row, index) {
        if (!row || row.length < 3) return null;
        
        let questionText = '';
        let options = [];
        let correctAnswerIndex = -1;
        
        // Check if the first cell is the question type indicator
        const firstCell = row[0].toString().trim().toUpperCase();
        let startIdx = 0;
        
        if (firstCell === 'MC') {
            questionText = row[1] || '';
            startIdx = 2;
        } else {
            questionText = row[0] || '';
            startIdx = 1;
        }
        
        // Look for tagging pattern (Image 1 & 2 format)
        const hasTagging = row.some(cell => cell && 
            (cell.toString().toLowerCase() === 'correct' || 
             cell.toString().toLowerCase() === 'incorrect'));
        
        if (hasTagging) {
            // Process options with tagging format
            for (let i = startIdx; i < row.length; i += 2) {
                if (i + 1 < row.length) {
                    const optionText = row[i] || '';
                    const isCorrect = row[i + 1] && 
                                     row[i + 1].toString().toLowerCase() === 'correct';
                    
                    if (optionText) {
                        options.push({
                            text: optionText,
                            isCorrect: isCorrect
                        });
                        
                        if (isCorrect && correctAnswerIndex === -1) {
                            correctAnswerIndex = options.length - 1;
                        }
                    }
                }
            }
        } else {
            // Standard format: assume options are in sequence, with a correct answer indicated
            for (let i = startIdx; i < row.length; i++) {
                const optionText = row[i] || '';
                if (optionText) {
                    options.push({
                        text: optionText,
                        isCorrect: false // Will update later if we find a correct indicator
                    });
                }
            }
            
            // Default to first option as correct if no indicator is found
            if (options.length > 0) {
                options[0].isCorrect = true;
                correctAnswerIndex = 0;
            }
        }
        
        return {
            id: `mc_${index}`,
            type: 'MC',
            text: questionText,
            data: row,
            options: options,
            correctAnswerIndex: correctAnswerIndex
        };
    }

    /**
     * Process Multiple Answer question
     * @param {Array} row - Question data row
     * @param {Number} index - Question index
     * @returns {Object|null} - Structured question object or null if invalid
     */
    processMAQuestion(row, index) {
        if (!row || row.length < 3) return null;
        
        let questionText = '';
        let options = [];
        let correctAnswerIndices = [];
        
        // Check if the first cell is the question type indicator
        const firstCell = row[0].toString().trim().toUpperCase();
        let startIdx = 0;
        
        if (firstCell === 'MA') {
            questionText = row[1] || '';
            startIdx = 2;
        } else {
            questionText = row[0] || '';
            startIdx = 1;
        }
        
        // Look for tagging pattern (Image 1 & 2 format)
        const hasTagging = row.some(cell => cell && 
            (cell.toString().toLowerCase() === 'correct' || 
             cell.toString().toLowerCase() === 'incorrect'));
        
        if (hasTagging) {
            // Process options with tagging format
            for (let i = startIdx; i < row.length; i += 2) {
                if (i + 1 < row.length) {
                    const optionText = row[i] || '';
                    const isCorrect = row[i + 1] && 
                                     row[i + 1].toString().toLowerCase() === 'correct';
                    
                    if (optionText) {
                        options.push({
                            text: optionText,
                            isCorrect: isCorrect
                        });
                        
                        if (isCorrect) {
                            correctAnswerIndices.push(options.length - 1);
                        }
                    }
                }
            }
        } else {
            // Standard format: assume options are in sequence, with multiple correct answers
            for (let i = startIdx; i < row.length; i++) {
                const optionText = row[i] || '';
                if (optionText) {
                    options.push({
                        text: optionText,
                        isCorrect: i % 2 === 0 // Simple alternating correct/incorrect
                    });
                    
                    if (i % 2 === 0) {
                        correctAnswerIndices.push(options.length - 1);
                    }
                }
            }
        }
        
        return {
            id: `ma_${index}`,
            type: 'MA',
            text: questionText,
            data: row,
            options: options,
            correctAnswerIndices: correctAnswerIndices
        };
    }

    /**
     * Process True/False question
     * @param {Array} row - Question data row
     * @param {Number} index - Question index
     * @returns {Object|null} - Structured question object or null if invalid
     */
    processTFQuestion(row, index) {
        if (!row || row.length < 2) return null;
        
        let questionText = row[0] || '';
        let isTrue = false;
        
        // Determine if answer is True
        if (row.length > 1) {
            const answer = row[1].toString().toLowerCase();
            isTrue = answer === 'true' || answer === 't' || answer === '1';
        }
        
        return {
            id: `tf_${index}`,
            type: 'TF',
            text: questionText,
            data: row,
            isTrue: isTrue
        };
    }

    /**
     * Process Essay question
     * @param {Array} row - Question data row
     * @param {Number} index - Question index
     * @returns {Object|null} - Structured question object or null if invalid
     */
    processESSQuestion(row, index) {
        if (!row || row.length < 1) return null;
        
        let questionText = row[0] || '';
        
        return {
            id: `ess_${index}`,
            type: 'ESS',
            text: questionText,
            data: row
        };
    }

    /**
     * Process Fill in Blank question
     * @param {Array} row - Question data row
     * @param {Number} index - Question index
     * @returns {Object|null} - Structured question object or null if invalid
     */
    processFIBQuestion(row, index) {
        if (!row || row.length < 1) return null;
        
        let questionText = row[0] || '';
        let correctAnswers = [];
        
        // Extract correct answers from columns after the question
        for (let i = 1; i < row.length; i++) {
            if (row[i] && row[i].toString().trim() !== '') {
                correctAnswers.push(row[i].toString());
            }
        }
        
        return {
            id: `fib_${index}`,
            type: 'FIB',
            text: questionText,
            data: row,
            correctAnswers: correctAnswers
        };
    }

    /**
     * Get file information for display
     * @returns {Object} - File info object with name, size, and formatted size
     */
    getFileInfo() {
        if (!this.currentFile) return null;
        
        return {
            name: this.currentFile.name,
            size: this.currentFile.size,
            formattedSize: this.formatFileSize(this.currentFile.size)
        };
    }

    /**
     * Format file size for display
     * @param {Number} bytes - File size in bytes
     * @returns {String} - Formatted file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Clear current file and data
     */
    clearFile() {
        this.currentFile = null;
        this.processedData = null;
    }

    /**
     * Get question counts by type
     * @returns {Object} - Counts of each question type
     */
    getQuestionCounts() {
        if (!this.processedData) {
            return {
                total: 0,
                MC: 0,
                MA: 0,
                TF: 0,
                ESS: 0,
                FIB: 0
            };
        }
        
        return {
            total: this.processedData.all.length,
            MC: this.processedData.MC.length,
            MA: this.processedData.MA.length,
            TF: this.processedData.TF.length,
            ESS: this.processedData.ESS.length,
            FIB: this.processedData.FIB.length
        };
    }
}

// Export the FileHandler class
window.FileHandler = FileHandler;