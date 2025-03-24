/**
 * FileHandler - Manages file processing for the Item Bank system
 * Handles CSV/Excel parsing, question extraction, and data formatting
 */
class FileHandler {
    constructor() {
        this.currentFile = null;
        this.processedData = null;
        console.log('FileHandler: Initialized');
    }

    /**
     * Main entry point for file processing
     */
    async processFile(file) {
        try {
            if (!file) {
                console.error('FileHandler: No file provided for processing');
                throw new Error('No file provided for processing');
            }
            
            console.log(`FileHandler: Processing file: ${file.name} (${this.formatFileSize(file.size)})`);
            this.currentFile = file;
            const fileExtension = file.name.split('.').pop().toLowerCase();
            
            let data;
            if (fileExtension === 'csv') {
                console.log('FileHandler: Parsing CSV file');
                data = await this.parseCSV(file);
            } else if (['xlsx', 'xls'].includes(fileExtension)) {
                console.log('FileHandler: Parsing Excel file');
                data = await this.parseExcel(file);
            } else {
                console.error(`FileHandler: Unsupported file format: ${fileExtension}`);
                throw new Error('Unsupported file format. Please upload CSV or Excel file.');
            }
            
            console.log('FileHandler: Organizing extracted question data');
            this.processedData = await this.organizeQuestions(data);
            
            const counts = this.getQuestionCounts();
            console.log(`FileHandler: Successfully processed ${counts.total} questions (MC:${counts.MC}, MA:${counts.MA}, TF:${counts.TF}, ESS:${counts.ESS}, FIB:${counts.FIB})`);
            
            return this.processedData;
        } catch (error) {
            console.error('FileHandler: Error processing file:', error);
            throw error;
        }
    }

    /**
     * Parse CSV file using Papa Parse
     */
    parseCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const csvContent = event.target.result;
                    console.log(`FileHandler: Loaded CSV content (${csvContent.length} bytes)`);
                    
                    Papa.parse(csvContent, {
                        header: false,
                        skipEmptyLines: true,
                        complete: (results) => {
                            console.log(`FileHandler: CSV parsing complete (${results.data.length} rows)`);
                            
                            if (results.errors && results.errors.length > 0) {
                                console.warn('FileHandler: CSV parser warnings:', results.errors);
                            }
                            
                            // Process the data to identify sheet types
                            const processedData = this.processSheetData(results.data);
                            resolve(processedData);
                        },
                        error: (error) => {
                            console.error('FileHandler: CSV parsing failed:', error);
                            reject(new Error('Failed to parse CSV file: ' + error.message));
                        }
                    });
                } catch (error) {
                    console.error('FileHandler: Error processing CSV data:', error);
                    reject(new Error('Failed to process CSV content: ' + error.message));
                }
            };
            
            reader.onerror = (error) => {
                console.error('FileHandler: Failed to read CSV file:', error);
                reject(new Error('Failed to read the file'));
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Parse Excel file using SheetJS library
     */
    parseExcel(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target.result);
                    console.log(`FileHandler: Loaded Excel binary data (${data.length} bytes)`);
                    
                    const workbook = XLSX.read(data, { type: 'array' });
                    console.log(`FileHandler: Parsed Excel workbook with ${workbook.SheetNames.length} sheets`);
                    
                    const processedData = {};
                    
                    // Check if we have multiple sheets or just one
                    if (workbook.SheetNames.length > 1) {
                        console.log('FileHandler: Processing multi-sheet workbook');
                        // Process each sheet
                        workbook.SheetNames.forEach(sheetName => {
                            // Skip the Instructions sheet
                            if (sheetName.toLowerCase() === 'instructions') {
                                console.log(`FileHandler: Skipping Instructions sheet`);
                                return;
                            }
                            
                            console.log(`FileHandler: Processing sheet "${sheetName}"`);
                            const sheet = workbook.Sheets[sheetName];
                            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                            
                            // Remove any rows where the first cell is empty or just "Question"
                            const filteredData = jsonData.filter(row => {
                                if (!row || row.length === 0) return false;
                                const firstCell = row[0] ? row[0].toString().trim() : '';
                                return firstCell !== '' && firstCell.toLowerCase() !== 'question' && firstCell.toLowerCase() !== 'questions';
                            });
                            
                            console.log(`FileHandler: Extracted ${filteredData.length} rows from sheet "${sheetName}"`);
                            
                            // Determine question type from sheet name
                            const questionType = this.getQuestionTypeFromSheetName(sheetName);
                            if (questionType) {
                                console.log(`FileHandler: Identified sheet "${sheetName}" as ${questionType} question type`);
                                processedData[questionType] = filteredData;
                            } else {
                                console.warn(`FileHandler: Could not determine question type for sheet "${sheetName}"`);
                            }
                        });
                    } else {
                        // Single sheet - try to process by row type
                        const sheetName = workbook.SheetNames[0];
                        console.log(`FileHandler: Processing single sheet "${sheetName}"`);
                        
                        const sheet = workbook.Sheets[sheetName];
                        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                        
                        // Remove any rows where the first cell is empty or just "Question"
                        const filteredData = jsonData.filter(row => {
                            if (!row || row.length === 0) return false;
                            const firstCell = row[0] ? row[0].toString().trim() : '';
                            return firstCell !== '' && firstCell.toLowerCase() !== 'question';
                        });
                        
                        console.log(`FileHandler: Extracted ${filteredData.length} rows from single sheet`);
                        
                        const processedSingleSheet = this.processSheetData(filteredData);
                        Object.assign(processedData, processedSingleSheet);
                    }
                    
                    // Validate we have some data
                    const questionTypes = Object.keys(processedData).filter(key => key !== 'all');
                    if (questionTypes.length === 0) {
                        console.warn('FileHandler: No question data found in Excel file');
                    } else {
                        console.log(`FileHandler: Found question types: ${questionTypes.join(', ')}`);
                    }
                    
                    resolve(processedData);
                } catch (error) {
                    console.error('FileHandler: Error parsing Excel file:', error);
                    reject(new Error('Failed to parse Excel file: ' + error.message));
                }
            };
            
            reader.onerror = (error) => {
                console.error('FileHandler: Failed to read Excel file:', error);
                reject(new Error('Failed to read the file'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Process sheet data to categorize by question type
     */
    processSheetData(rows) {
        try {
            if (!rows || !Array.isArray(rows) || rows.length === 0) {
                console.warn('FileHandler: No data rows to process');
                return {};
            }
            
            console.log(`FileHandler: Processing ${rows.length} data rows`);
            
            // Initialize containers for each question type
            const processedData = {
                MC: [],  // Multiple Choice
                MA: [],  // Multiple Answer
                TF: [],  // True/False
                ESS: [], // Essay
                FIB: []  // Fill in Blank
            };
            
            // Track skipped rows for debugging
            let skippedRows = 0;
            
            // Process each row
            rows.forEach((row, index) => {
                if (!row || row.length === 0) {
                    skippedRows++;
                    return;
                }
                
                // Identify the question type
                const questionType = this.identifyQuestionType(row);
                
                if (questionType) {
                    processedData[questionType].push(row);
                } else {
                    skippedRows++;
                    console.warn(`FileHandler: Could not identify question type for row ${index+1}:`, row);
                }
            });
            
            // Log results
            console.log(`FileHandler: Categorized questions - MC:${processedData.MC.length}, MA:${processedData.MA.length}, TF:${processedData.TF.length}, ESS:${processedData.ESS.length}, FIB:${processedData.FIB.length}, Skipped:${skippedRows}`);
            
            return processedData;
        } catch (error) {
            console.error('FileHandler: Error processing sheet data:', error);
            return {};
        }
    }

    /**
     * Identify question type based on row content
     */
    identifyQuestionType(row) {
        try {
            if (!row || !Array.isArray(row) || row.length === 0) {
                return null;
            }
            
            // If the first cell explicitly states the question type
            if (row[0] && typeof row[0] === 'string') {
                const firstCell = row[0].toString().trim().toUpperCase();
                if (['MC', 'MA', 'TF', 'ESS', 'FIB'].includes(firstCell)) {
                    return firstCell;
                }
            }

            // Multiple choice/answer questions with tagging
            if (row.length > 3 && 
                row.some(cell => cell && 
                        (cell.toString().toLowerCase() === 'correct' || 
                         cell.toString().toLowerCase() === 'incorrect' || 
                         cell.toString().toLowerCase() === 'incofrect'))) { // Handle typo
                
                // Check if it's multiple answer (has multiple correct answers)
                let correctCount = 0;
                for (let i = 0; i < row.length; i++) {
                    if (row[i] && row[i].toString().toLowerCase() === 'correct') {
                        correctCount++;
                    }
                }
                
                return correctCount > 1 ? 'MA' : 'MC';
            }
            
            // True/False questions
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
            
            // Essay questions
            if (row.length >= 1 && 
                row[0] && 
                row[0].toString().includes('?') && 
                row.length === 1) {
                return 'ESS';
            }
            
            // Fill in the blank questions with placeholder
            if (row.length >= 2 && 
                row[0] && 
                row[0].toString().includes('_____')) {
                return 'FIB';
            }
            
            // Fill in the blank questions with underscores
            if (row[0] && row[0].toString().includes('_')) {
                return 'FIB';
            }
            
            // Essay questions (long text with no options)
            if (row[0] && row[0].toString().trim().length > 20 && row.length === 1) {
                return 'ESS';
            }
            
            // Default to MC if we have a question with choices
            if (row.length > 2) {
                return 'MC';
            }
            
            return null;
        } catch (error) {
            console.error('FileHandler: Error identifying question type:', error);
            return null;
        }
    }

    /**
     * Extract question type from sheet name
     */
    getQuestionTypeFromSheetName(sheetName) {
        try {
            if (!sheetName) return null;
            
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
        } catch (error) {
            console.error('FileHandler: Error processing sheet name:', error);
            return null;
        }
    }

    /**
     * Structure question data by type
     */
    async organizeQuestions(data) {
        try {
            console.log('FileHandler: Organizing questions by type');
            
            if (!data || typeof data !== 'object') {
                console.error('FileHandler: Invalid data for organizing questions', data);
                return {
                    MC: [], MA: [], TF: [], ESS: [], FIB: [], all: []
                };
            }
            
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
                console.log(`FileHandler: Processing ${data.MC.length} Multiple Choice questions`);
                
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
                console.log(`FileHandler: Processing ${data.MA.length} Multiple Answer questions`);
                
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
                console.log(`FileHandler: Processing ${data.TF.length} True/False questions`);
                
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
                console.log(`FileHandler: Processing ${data.ESS.length} Essay questions`);
                
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
                console.log(`FileHandler: Processing ${data.FIB.length} Fill in Blank questions`);
                
                data.FIB.forEach((row, index) => {
                    const question = this.processFIBQuestion(row, index);
                    if (question) {
                        questions.FIB.push(question);
                        questions.all.push(question);
                    }
                });
            }
            
            console.log(`FileHandler: Organized ${questions.all.length} total questions`);
            return questions;
        } catch (error) {
            console.error('FileHandler: Error organizing questions:', error);
            return {
                MC: [], MA: [], TF: [], ESS: [], FIB: [], all: []
            };
        }
    }

    /**
     * Format Multiple Choice question data
     */
    processMCQuestion(row, index) {
        try {
            if (!row || !Array.isArray(row) || row.length < 3) {
                console.warn(`FileHandler: Invalid MC question data at index ${index}`, row);
                return null;
            }
            
            let questionText = '';
            let options = [];
            let correctAnswerIndex = -1;
            
            // Check if the first cell is the question type indicator
            const firstCell = row[0] ? row[0].toString().trim().toUpperCase() : '';
            let startIdx = 0;
            
            if (firstCell === 'MC') {
                questionText = row[1] || '';
                startIdx = 2;
            } else {
                questionText = row[0] || '';
                startIdx = 1;
            }
            
            // Look for tagging pattern
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
                // Standard format: assume options are in sequence
                for (let i = startIdx; i < row.length; i++) {
                    const optionText = row[i] || '';
                    if (optionText) {
                        options.push({
                            text: optionText,
                            isCorrect: false // Will update later
                        });
                    }
                }
                
                // Default to first option as correct if no indicator
                if (options.length > 0) {
                    options[0].isCorrect = true;
                    correctAnswerIndex = 0;
                }
            }
            
            if (options.length === 0) {
                console.warn(`FileHandler: No options found for MC question at index ${index}`);
            }
            
            if (correctAnswerIndex === -1 && options.length > 0) {
                console.warn(`FileHandler: No correct answer found for MC question at index ${index}, defaulting to first option`);
                options[0].isCorrect = true;
                correctAnswerIndex = 0;
            }
            
            return {
                id: `mc_${index}`,
                type: 'MC',
                text: questionText,
                data: row,
                options: options,
                correctAnswerIndex: correctAnswerIndex >= 0 ? correctAnswerIndex : 0
            };
        } catch (error) {
            console.error(`FileHandler: Error processing MC question at index ${index}:`, error);
            return null;
        }
    }

    /**
     * Format Multiple Answer question data
     */
    processMAQuestion(row, index) {
        try {
            if (!row || !Array.isArray(row) || row.length < 3) {
                console.warn(`FileHandler: Invalid MA question data at index ${index}`, row);
                return null;
            }
            
            let questionText = '';
            let options = [];
            let correctAnswerIndices = [];
            
            // Check if the first cell is the question type indicator
            const firstCell = row[0] ? row[0].toString().trim().toUpperCase() : '';
            let startIdx = 0;
            
            if (firstCell === 'MA') {
                questionText = row[1] || '';
                startIdx = 2;
            } else {
                questionText = row[0] || '';
                startIdx = 1;
            }
            
            // Look for tagging pattern
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
                // Standard format: assume alternating correct/incorrect
                for (let i = startIdx; i < row.length; i++) {
                    const optionText = row[i] || '';
                    if (optionText) {
                        const isCorrect = i % 2 === 0;
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
            
            if (options.length === 0) {
                console.warn(`FileHandler: No options found for MA question at index ${index}`);
            }
            
            if (correctAnswerIndices.length === 0 && options.length > 0) {
                console.warn(`FileHandler: No correct answers found for MA question at index ${index}, defaulting to first option`);
                options[0].isCorrect = true;
                correctAnswerIndices = [0];
            }
            
            return {
                id: `ma_${index}`,
                type: 'MA',
                text: questionText,
                data: row,
                options: options,
                correctAnswerIndices: correctAnswerIndices
            };
        } catch (error) {
            console.error(`FileHandler: Error processing MA question at index ${index}:`, error);
            return null;
        }
    }

    /**
     * Format True/False question data
     */
    processTFQuestion(row, index) {
        try {
            if (!row || !Array.isArray(row) || row.length < 2) {
                console.warn(`FileHandler: Invalid TF question data at index ${index}`, row);
                return null;
            }
            
            let questionText = row[0] || '';
            let isTrue = false;
            
            // Determine if answer is True
            if (row.length > 1 && row[1] !== null && row[1] !== undefined) {
                const answer = row[1].toString().toLowerCase();
                isTrue = answer === 'true' || answer === 't' || answer === '1';
            } else {
                console.warn(`FileHandler: Missing answer for TF question at index ${index}, defaulting to false`);
            }
            
            return {
                id: `tf_${index}`,
                type: 'TF',
                text: questionText,
                data: row,
                isTrue: isTrue
            };
        } catch (error) {
            console.error(`FileHandler: Error processing TF question at index ${index}:`, error);
            return null;
        }
    }

    /**
     * Format Essay question data
     */
    processESSQuestion(row, index) {
        try {
            if (!row || !Array.isArray(row) || row.length < 1) {
                console.warn(`FileHandler: Invalid ESS question data at index ${index}`, row);
                return null;
            }
            
            let questionText = row[0] || '';
            
            if (!questionText) {
                console.warn(`FileHandler: Empty question text for ESS at index ${index}`);
                questionText = 'Essay question';
            }
            
            return {
                id: `ess_${index}`,
                type: 'ESS',
                text: questionText,
                data: row
            };
        } catch (error) {
            console.error(`FileHandler: Error processing ESS question at index ${index}:`, error);
            return null;
        }
    }

    /**
     * Format Fill in Blank question data
     */
    processFIBQuestion(row, index) {
        try {
            if (!row || !Array.isArray(row) || row.length < 1) {
                console.warn(`FileHandler: Invalid FIB question data at index ${index}`, row);
                return null;
            }
            
            let questionText = row[0] || '';
            let correctAnswers = [];
            
            if (!questionText) {
                console.warn(`FileHandler: Empty question text for FIB at index ${index}`);
                questionText = 'Fill in the blank question';
            }
            
            // Extract correct answers from columns after the question
            for (let i = 1; i < row.length; i++) {
                if (row[i] && row[i].toString().trim() !== '') {
                    correctAnswers.push(row[i].toString());
                }
            }
            
            if (correctAnswers.length === 0) {
                console.warn(`FileHandler: No correct answers found for FIB question at index ${index}`);
            }
            
            return {
                id: `fib_${index}`,
                type: 'FIB',
                text: questionText,
                data: row,
                correctAnswers: correctAnswers
            };
        } catch (error) {
            console.error(`FileHandler: Error processing FIB question at index ${index}:`, error);
            return null;
        }
    }

    /**
     * Get file metadata for display
     */
    getFileInfo() {
        try {
            if (!this.currentFile) {
                console.log('FileHandler: No current file to get info from');
                return null;
            }
            
            return {
                name: this.currentFile.name,
                size: this.currentFile.size,
                formattedSize: this.formatFileSize(this.currentFile.size)
            };
        } catch (error) {
            console.error('FileHandler: Error getting file info:', error);
            return null;
        }
    }

    /**
     * Format file size for human readability
     */
    formatFileSize(bytes) {
        try {
            if (bytes === 0) return '0 Bytes';
            
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            
            return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
        } catch (error) {
            console.error('FileHandler: Error formatting file size:', error);
            return bytes + ' Bytes';
        }
    }

    /**
     * Reset the file handler state
     */
    clearFile() {
        try {
            const hadFile = this.currentFile !== null;
            this.currentFile = null;
            this.processedData = null;
            
            if (hadFile) {
                console.log('FileHandler: File data cleared');
            }
        } catch (error) {
            console.error('FileHandler: Error clearing file:', error);
        }
    }

    /**
     * Get count of questions by type
     */
    getQuestionCounts() {
        try {
            if (!this.processedData) {
                console.log('FileHandler: No processed data to count questions');
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
        } catch (error) {
            console.error('FileHandler: Error getting question counts:', error);
            return {
                total: 0,
                MC: 0,
                MA: 0,
                TF: 0,
                ESS: 0,
                FIB: 0
            };
        }
    }
}

// Export the FileHandler class
window.FileHandler = FileHandler;