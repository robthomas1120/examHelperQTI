/**
 * QTI to PDF Converter
 * Converts QTI zip files to PDF format for printing
 * Designed for different paper sizes including short bond, long bond, and A4
 */

class QTIToPDFConverter {
    constructor() {
        this.jszip = JSZip;
        this.jspdf = jspdf.jsPDF;
        this.questions = [];
        this.title = "Exam";
        this.includeAnswers = true;
        this.includeImages = true;
        this.includePageNumbers = true;
        this.paperSize = "a4"; // Default paper size
        
        // Paper size configurations
        this.paperSizes = {
            "a4": {
                width: 210,
                height: 297,
                unit: "mm",
                orientation: "portrait"
            },
            "letter": {
                width: 215.9,
                height: 279.4,
                unit: "mm",
                orientation: "portrait"
            },
            "legal": {
                width: 215.9,
                height: 355.6,
                unit: "mm",
                orientation: "portrait"
            },
            "short-bond": {
                width: 215.9,
                height: 279.4, // 8.5" x 11"
                unit: "mm",
                orientation: "portrait"
            },
            "long-bond": {
                width: 215.9,
                height: 355.6, // 8.5" x 14"
                unit: "mm",
                orientation: "portrait"
            }
        };
    }

    /**
     * Set PDF options
     * @param {Object} options - PDF generation options
     */
    setOptions(options) {
        if (options.title) this.title = options.title;
        if (options.includeAnswers !== undefined) this.includeAnswers = options.includeAnswers;
        if (options.includeImages !== undefined) this.includeImages = options.includeImages;
        if (options.includePageNumbers !== undefined) this.includePageNumbers = options.includePageNumbers;
        if (options.paperSize) this.paperSize = options.paperSize;
    }

    /**
     * Convert QTI zip file to PDF
     * @param {File} file - QTI zip file
     * @returns {Promise<Blob>} - Promise resolving to PDF blob
     */
    async convertToPDF(file) {
        try {
            // Extract questions from QTI zip file
            await this.extractQuestionsFromZip(file);
            
            // Generate PDF with questions
            const pdfBlob = await this.generatePDF();
            
            return pdfBlob;
        } catch (error) {
            console.error("Error converting QTI to PDF:", error);
            throw error;
        }
    }

    /**
     * Extract questions from QTI zip file
     * @param {File} file - QTI zip file
     */
    async extractQuestionsFromZip(file) {
        try {
            // Read zip file
            const zipData = await this.jszip.loadAsync(file);
            
            // Look for questions.xml or similar file
            let questionsFile = null;
            let metadataFile = null;
            
            // Search for files in zip
            for (const [path, zipEntry] of Object.entries(zipData.files)) {
                const lowercasePath = path.toLowerCase();
                if (lowercasePath.includes("questions.xml") || lowercasePath.includes("assessment.xml")) {
                    questionsFile = zipEntry;
                }
                if (lowercasePath.includes("meta") || lowercasePath.includes("metadata")) {
                    metadataFile = zipEntry;
                }
            }
            
            if (!questionsFile) {
                throw new Error("No questions file found in QTI package");
            }
            
            // Get questions file content
            const questionsXml = await questionsFile.async("text");
            
            // Parse questions XML
            this.parseQuestionsXml(questionsXml);
            
            // Parse metadata if available
            if (metadataFile) {
                const metadataXml = await metadataFile.async("text");
                this.parseMetadataXml(metadataXml);
            }
            
            // Extract images if includeImages is true
            if (this.includeImages) {
                await this.extractImages(zipData);
            }
        } catch (error) {
            console.error("Error extracting questions from zip:", error);
            throw error;
        }
    }

    /**
     * Parse questions XML
     * @param {String} xml - Questions XML content
     */
    parseQuestionsXml(xmlContent) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
        const questions = [];
        
        // Get all item nodes
        const itemNodes = xmlDoc.querySelectorAll("item");
        
        // Process each item node
        itemNodes.forEach((itemNode, index) => {
            // Get question type
            const questionType = itemNode.querySelector("fieldlabel:contains('question_type')") ? 
                itemNode.querySelector("fieldlabel:contains('question_type')").nextElementSibling.textContent.trim() : "";
            
            // Get question text
            const questionText = itemNode.querySelector("mattext") ? 
                this.cleanHtml(itemNode.querySelector("mattext").textContent) : "";
            
            // Initialize question object
            const question = {
                id: index + 1,
                text: questionText,
                type: questionType,
                options: []
            };
            
            // Process options based on question type
            if (questionType.includes("multiple_choice")) {
                // Get options
                const responseLabels = itemNode.querySelectorAll("response_label");
                responseLabels.forEach((label) => {
                    const id = label.getAttribute("ident");
                    const textNode = label.querySelector("mattext");
                    const text = textNode ? this.cleanHtml(textNode.textContent) : "";
                    
                    question.options.push({
                        id: id,
                        text: text,
                        correct: false
                    });
                });
                
                // Find correct answer
                const respConditions = itemNode.querySelectorAll("respcondition");
                let foundCorrectAnswer = false;
                
                respConditions.forEach((condition) => {
                    const setvarNode = condition.querySelector("setvar[varname='SCORE'][action='Set']");
                    
                    if (setvarNode && parseFloat(setvarNode.textContent) > 0) {
                        const varequal = condition.querySelector("varequal");
                        
                        if (varequal) {
                            const responseId = varequal.textContent.trim();
                            foundCorrectAnswer = true;
                            
                            // Mark option as correct
                            question.options.forEach((option) => {
                                if (option.id === responseId) {
                                    option.correct = true;
                                }
                            });
                        }
                    }
                });
                
                // If no correct answers were found, this might be a different format
                // Try to find correct answers through response_lid/render_choice
                if (!foundCorrectAnswer) {
                    // Reset all options to not correct first
                    question.options.forEach(option => option.correct = false);
                    
                    // Try to find correct answers in a different way
                    const correctPattern = itemNode.querySelector("setvar[varname='SCORE'][action='Set'][textContent^='100']");
                    if (correctPattern) {
                        const parentCondition = correctPattern.closest("respcondition");
                        if (parentCondition) {
                            const correctVarequals = parentCondition.querySelectorAll("varequal");
                            correctVarequals.forEach(varequal => {
                                const correctId = varequal.textContent.trim();
                                question.options.forEach(option => {
                                    if (option.id === correctId) {
                                        option.correct = true;
                                    }
                                });
                            });
                        }
                    }
                }
            } else if (questionType.includes("multiple_answers")) {
                // Get options
                const responseLabels = itemNode.querySelectorAll("response_label");
                responseLabels.forEach((label) => {
                    const id = label.getAttribute("ident");
                    const textNode = label.querySelector("mattext");
                    const text = textNode ? this.cleanHtml(textNode.textContent) : "";
                    
                    question.options.push({
                        id: id,
                        text: text,
                        correct: false
                    });
                });
                
                // Find correct answers - for multiple_answers, we need to look at the <and> structure
                const respConditions = itemNode.querySelectorAll("respcondition");
                
                respConditions.forEach((condition) => {
                    const setvarNode = condition.querySelector("setvar[varname='SCORE'][action='Set']");
                    
                    if (setvarNode && parseFloat(setvarNode.textContent) > 0) {
                        // Look for the <and> element that contains the correct answers
                        const andElement = condition.querySelector("and");
                        
                        if (andElement) {
                            // Get all direct varequal children (these are the correct answers)
                            const directVarequals = Array.from(andElement.children).filter(
                                child => child.tagName === "varequal"
                            );
                            
                            // Mark these options as correct
                            directVarequals.forEach(varequal => {
                                const responseId = varequal.textContent.trim();
                                question.options.forEach(option => {
                                    if (option.id === responseId) {
                                        option.correct = true;
                                    }
                                });
                            });
                            
                            // Get all <not> elements (these contain incorrect answers)
                            const notElements = andElement.querySelectorAll("not");
                            
                            // Make sure these options are marked as incorrect
                            notElements.forEach(notElement => {
                                const varequal = notElement.querySelector("varequal");
                                if (varequal) {
                                    const responseId = varequal.textContent.trim();
                                    question.options.forEach(option => {
                                        if (option.id === responseId) {
                                            option.correct = false;
                                        }
                                    });
                                }
                            });
                        }
                    }
                });
            }
            
            // Add question to array
            questions.push(question);
        });
        
        this.questions = questions;
    }

    /**
     * Parse metadata XML
     * @param {String} xml - Metadata XML content
     */
    parseMetadataXml(xml) {
        try {
            // Parse XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, "text/xml");
            
            // Extract title
            const titleNode = xmlDoc.querySelector("title");
            if (titleNode && titleNode.textContent) {
                this.title = titleNode.textContent.trim();
            }
            
            // Extract description if needed
            const descriptionNode = xmlDoc.querySelector("description");
            if (descriptionNode && descriptionNode.textContent) {
                this.description = this.cleanHtml(descriptionNode.textContent);
            }
        } catch (error) {
            console.error("Error parsing metadata XML:", error);
            // Continue without metadata - not critical
        }
    }

    /**
     * Extract images from zip file
     * @param {JSZip} zipData - ZIP file data
     */
    async extractImages(zipData) {
        try {
            const imageFiles = {};
            
            // Find image files in zip
            for (const [path, zipEntry] of Object.entries(zipData.files)) {
                const lowercasePath = path.toLowerCase();
                if (
                    !zipEntry.dir && 
                    (lowercasePath.endsWith(".jpg") || 
                     lowercasePath.endsWith(".jpeg") || 
                     lowercasePath.endsWith(".png") || 
                     lowercasePath.endsWith(".gif"))
                ) {
                    // Extract image data
                    const imageData = await zipEntry.async("blob");
                    
                    // Convert to data URL
                    const dataUrl = await this.blobToDataUrl(imageData);
                    
                    // Store in imageFiles object
                    const filename = path.split("/").pop();
                    imageFiles[filename] = dataUrl;
                }
            }
            
            // Store extracted images
            this.imageFiles = imageFiles;
        } catch (error) {
            console.error("Error extracting images:", error);
            // Continue without images - not critical
            this.imageFiles = {};
        }
    }

    /**
     * Convert Blob to Data URL
     * @param {Blob} blob - Image blob
     * @returns {Promise<String>} - Data URL
     */
    blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Generate PDF with extracted questions
     * @returns {Promise<Blob>} - PDF blob
     */
    async generatePDF() {
        // Get paper size configuration
        const paperConfig = this.paperSizes[this.paperSize] || this.paperSizes.a4;
        
        // Create new PDF document
        const pdf = new this.jspdf({
            orientation: paperConfig.orientation,
            unit: paperConfig.unit,
            format: [paperConfig.width, paperConfig.height]
        });
        
        // Set metadata
        pdf.setProperties({
            title: this.title,
            subject: "QTI Exam",
            author: "QTI to PDF Converter",
            creator: "QTI to PDF Converter"
        });
        
        // Margin settings
        const margin = {
            top: 20,
            right: 20,
            bottom: 20,
            left: 20
        };
        
        // Available width for content
        const contentWidth = paperConfig.width - margin.left - margin.right;
        
        // Current Y position
        let y = margin.top;
        
        // Add title
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        
        // Center the title
        const titleWidth = pdf.getStringUnitWidth(this.title) * 16 / pdf.internal.scaleFactor;
        const titleX = (paperConfig.width - titleWidth) / 2;
        
        pdf.text(this.title, titleX, y);
        y += 10;
        
        // Add description if available
        if (this.description) {
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
            
            const descLines = pdf.splitTextToSize(this.description, contentWidth);
            pdf.text(descLines, margin.left, y);
            y += descLines.length * 5 + 5;
        }
        
        // Add exam details
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Date: ${new Date().toLocaleDateString()}`, margin.left, y);
        pdf.text(`Number of Questions: ${this.questions.length}`, margin.left, y + 5);
        y += 15;
        
        // Draw a horizontal line
        pdf.setLineWidth(0.5);
        pdf.line(margin.left, y, paperConfig.width - margin.right, y);
        y += 10;
        
        // Process each question
        for (let i = 0; i < this.questions.length; i++) {
            const question = this.questions[i];
            
            // Check if we need a new page
            if (y > paperConfig.height - margin.bottom - 40) {
                pdf.addPage();
                y = margin.top;
                
                // Add page number if enabled
                if (this.includePageNumbers) {
                    this.addPageNumber(pdf);
                }
            }
            
            // Question number and text
            pdf.setFontSize(12);
            pdf.setFont("helvetica", "bold");
            pdf.text(`${i + 1}. `, margin.left, y);
            
            // Question text (indented)
            const questionIndent = margin.left + 7;
            pdf.setFont("helvetica", "normal");
            
            // Check if question text contains HTML, and clean it
            const cleanedText = this.cleanHtml(question.text);
            
            // Split long text to fit page width
            const textLines = pdf.splitTextToSize(cleanedText, contentWidth - 7);
            pdf.text(textLines, questionIndent, y);
            
            // Move down based on number of lines
            y += textLines.length * 5 + 5;
            
            // Process answer options based on question type
            if (question.type.includes("multiple_choice") || question.type.includes("multiple_answers")) {
                pdf.setFontSize(10);
                
                // Draw options
                for (let j = 0; j < question.options.length; j++) {
                    const option = question.options[j];
                    
                    // Check if we need a new page
                    if (y > paperConfig.height - margin.bottom - 20) {
                        pdf.addPage();
                        y = margin.top;
                        
                        // Add page number if enabled
                        if (this.includePageNumbers) {
                            this.addPageNumber(pdf);
                        }
                    }
                    
                    // Option letter (A, B, C, etc.)
                    const optionLetter = String.fromCharCode(65 + j);
                    
                    // Draw checkbox/circle for the option
                    if (question.type.includes("multiple_choice")) {
                        pdf.circle(margin.left + 3, y - 1.5, 1.5, 'S');
                    } else if (question.type.includes("multiple_answers")) {
                        // Draw a square for multiple answer questions
                        pdf.rect(margin.left + 2, y - 3, 3, 3, 'S');
                    }
                    
                    // If including answers and this is the correct answer
                    if (this.includeAnswers && option.correct) {
                        if (question.type.includes("multiple_choice")) {
                            // Fill the circle for correct answer
                            pdf.circle(margin.left + 3, y - 1.5, 0.8, 'F');
                        } else if (question.type.includes("multiple_answers")) {
                            // Draw an X in the square for correct answer
                            pdf.setLineWidth(0.3);
                            pdf.line(margin.left + 2, y - 3, margin.left + 5, y);
                            pdf.line(margin.left + 5, y - 3, margin.left + 2, y);
                            pdf.setLineWidth(0.2);
                        }
                    }
                    
                    // Option text
                    const optionText = `${optionLetter}. ${this.cleanHtml(option.text)}`;
                    const optionIndent = margin.left + 7;
                    
                    // Split long option text
                    const optionLines = pdf.splitTextToSize(optionText, contentWidth - 10);
                    pdf.text(optionLines, optionIndent, y);
                    
                    // Move down based on number of lines
                    y += optionLines.length * 5 + 3;
                }
            } else if (question.type.includes("true_false")) {
                // For true/false questions, add one underline before the question number
                // Go back to the question number position
                const questionY = y - textLines.length * 5 - 5; // Go back to the question number position
                
                // Draw one underline before the question number
                pdf.setDrawColor(0, 0, 0);
                pdf.setLineWidth(0.5);
                
                // Calculate the position for the underline (before the question number)
                const underlineX = margin.left - 15;
                const underlineWidth = 12;
                
                // Draw one underline
                pdf.line(underlineX, questionY, underlineX + underlineWidth, questionY);
                
                // If including answers, indicate the correct answer
                if (this.includeAnswers) {
                    // Find the correct answer
                    const correctAnswer = question.options.find(option => option.correct);
                    if (correctAnswer) {
                        pdf.setFontSize(10);
                        pdf.setTextColor(70, 130, 180); // Steel Blue color for answers
                        pdf.text(`Answer: ${correctAnswer.text}`, margin.left, y);
                        pdf.setTextColor(0, 0, 0); // Reset to black
                        y += 8;
                    }
                }
            } else if (question.type.includes("essay")) {
                // Add blank lines for essay response
                pdf.setDrawColor(200, 200, 200);
                
                for (let j = 0; j < 10; j++) {
                    // Check if we need a new page
                    if (y > paperConfig.height - margin.bottom - 15) {
                        pdf.addPage();
                        y = margin.top;
                        
                        // Add page number if enabled
                        if (this.includePageNumbers) {
                            this.addPageNumber(pdf);
                        }
                    }
                    
                    // Draw a line for writing
                    pdf.line(margin.left, y + 4, paperConfig.width - margin.right, y + 4);
                    y += 8;
                }
                
                pdf.setDrawColor(0, 0, 0);
            } else if (question.type.includes("short_answer") || question.type.includes("fill_in")) {
                // Add blank space for short answer - no underlines
                
                // Check if we need a new page
                if (y > paperConfig.height - margin.bottom - 15) {
                    pdf.addPage();
                    y = margin.top;
                    
                    // Add page number if enabled
                    if (this.includePageNumbers) {
                        this.addPageNumber(pdf);
                    }
                }
                
                // Add some space instead of drawing a line
                y += 8;
                
                // Show correct answer if enabled
                if (this.includeAnswers && question.correctAnswer) {
                    pdf.setFontSize(10);
                    pdf.setTextColor(70, 130, 180); // Steel Blue color for answers
                    pdf.text(`Answer: ${question.correctAnswer}`, margin.left, y);
                    pdf.setTextColor(0, 0, 0); // Reset to black
                    y += 8;
                }
            }
            
            // Add extra space between questions
            y += 5;
        }
        
        // Add page number to the last page if enabled
        if (this.includePageNumbers) {
            this.addPageNumber(pdf);
        }
        
        // Return the PDF as a blob
        return pdf.output("blob");
    }

    /**
     * Add page number to the current page
     * @param {jsPDF} pdf - PDF document
     */
    addPageNumber(pdf) {
        const pageNum = pdf.internal.getNumberOfPages();
        const paperConfig = this.paperSizes[this.paperSize] || this.paperSizes.a4;
        
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Page ${pageNum}`, paperConfig.width / 2, paperConfig.height - 10, { align: "center" });
    }

    /**
     * Clean HTML tags from text while preserving some basic formatting
     * @param {String} html - HTML text
     * @returns {String} - Cleaned text
     */
    cleanHtml(html) {
        if (!html) return "";
        
        // Simple HTML cleaning - replace some common tags with text equivalents
        let cleaned = html
            .replace(/<p>/gi, "")
            .replace(/<\/p>/gi, "\n")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<div>/gi, "")
            .replace(/<\/div>/gi, "\n")
            .replace(/<li>/gi, "• ")
            .replace(/<\/li>/gi, "\n")
            .replace(/<strong>/gi, "")
            .replace(/<\/strong>/gi, "")
            .replace(/<em>/gi, "")
            .replace(/<\/em>/gi, "")
            .replace(/<u>/gi, "")
            .replace(/<\/u>/gi, "")
            .replace(/<ul>/gi, "\n")
            .replace(/<\/ul>/gi, "\n")
            .replace(/<ol>/gi, "\n")
            .replace(/<\/ol>/gi, "\n");
            
        // Remove any remaining HTML tags
        cleaned = cleaned.replace(/<[^>]*>/g, "");
        
        // Decode HTML entities
        cleaned = this.decodeHtmlEntities(cleaned);
        
        // Trim whitespace and remove excessive newlines
        cleaned = cleaned.trim().replace(/\n{3,}/g, "\n\n");
        
        return cleaned;
    }

    /**
     * Decode HTML entities
     * @param {String} html - Text with HTML entities
     * @returns {String} - Decoded text
     */
    decodeHtmlEntities(html) {
        const textarea = document.createElement("textarea");
        textarea.innerHTML = html;
        return textarea.value;
    }
}

// Export the QTIToPDFConverter class
window.QTIToPDFConverter = QTIToPDFConverter;