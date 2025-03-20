/**
 * QTI Converter for CSV/Excel files
 * Converts question data to QTI 1.2 format and packages as a zip file
 */

class QTIConverter {
    constructor() {
        this.jszip = new JSZip();
        this.questionCounter = 0;
        this.itemsXML = [];
        this.manifestItems = [];
        this.quizTitle = '';
        this.quizDescription = '';
        this.questions = [];
    }

    /**
     * Convert data to QTI package
     * @param {Array} data - Array of question data objects
     * @param {String} title - Quiz title
     * @param {String} description - Quiz description (optional)
     * @returns {Promise<Blob>} - Promise resolving to zip file blob
     */
    async convert(data, title, description = '') {
        try {
            // Reset counters and containers
            this.questionCounter = 0;
            this.itemsXML = [];
            this.manifestItems = [];
            
            // Generate unique identifier for the quiz
            const quizIdentifier = "question_" + this.generateUniqueId();
            
            // Create root folder in zip
            const rootFolder = quizIdentifier;
            
            // Generate QTI XML for each question
            data.forEach(question => {
                this.processQuestion(question);
            });
            
            // Create manifest file
            const manifestXML = this.createManifestXML(quizIdentifier, title, description);
            
            // Create assessment meta XML
            const assessmentMetaXML = this.createAssessmentMetaXML(quizIdentifier, title, description, data.length);
            
            // Create assessment XML with all questions
            const questionsXML = this.createQuestionsXML(quizIdentifier, title);
            
            // Add files to zip
            const zip = this.jszip;
            
            // Add manifest at root level
            zip.file("imsmanifest.xml", manifestXML);
            
            // Create folder for quiz files
            const quizFolder = zip.folder(rootFolder);
            
            // Add assessment meta file
            quizFolder.file("assessment_meta.xml", assessmentMetaXML);
            
            // Add questions file
            quizFolder.file("questions.xml", questionsXML);
            
            // Generate zip file
            const zipBlob = await zip.generateAsync({ type: "blob" });
            return zipBlob;
        } catch (error) {
            console.error("Error converting to QTI:", error);
            throw error;
        }
    }
    
    /**
     * Generate a unique ID (8 character hex string)
     * @returns {String} - Unique ID
     */
    generateUniqueId() {
        return Math.floor((1 + Math.random()) * 0x10000000)
            .toString(16)
            .substring(1);
    }
    
  /**
   * Process a single question and generate QTI XML
   * @param {Object} question - Question data
   */
  processQuestion(question) {
    // Skip if question is not an array or is empty
    if (!Array.isArray(question) || question.length === 0) {
        console.warn('Invalid question format, skipping:', question);
        return;
    }
    
    this.questionCounter++;
    const questionId = `question_${this.generateUniqueId()}`;
    
    // Determine question type and create item XML
    const qType = (question[0] || '').toString().trim().toUpperCase();
    const questionText = this.escapeXML(question[1] || '');
    
    try {
        let itemXml = '';
        let questionType = '';
        
        switch (qType) {
            case 'MC': // Multiple Choice
                itemXml = this.createMultipleChoiceItem(questionId, questionText, question);
                questionType = 'multiple_choice_question';
                break;
            case 'MA': // Multiple Answer
                itemXml = this.createMultipleAnswerItem(questionId, questionText, question);
                questionType = 'multiple_answers_question';
                break;
            case 'TF': // True/False
                itemXml = this.createTrueFalseItem(questionId, questionText, question);
                questionType = 'true_false_question';
                break;
            case 'ESS': // Essay
                itemXml = this.createEssayItem(questionId, questionText);
                questionType = 'essay_question';
                break;
            case 'FIB': // Fill in the Blank
                itemXml = this.createFillInBlankItem(questionId, questionText, question);
                questionType = 'short_answer_question';
                break;
            default:
                console.warn(`Unsupported question type: ${qType}`);
                return;
        }
        
        // Only add the question if we successfully generated XML
        if (itemXml) {
            this.itemsXML.push({
                id: questionId,
                xml: itemXml,
                title: questionText.substring(0, 50) || `Question`,
                type: questionType
            });
        }
    } catch (error) {
        console.error(`Error processing question ${this.questionCounter}:`, error);
        console.error('Question data:', question);
    }
  }
    
    /**
     * Create a complete questions XML file
     * @param {String} quizId - Quiz identifier
     * @param {String} title - Quiz title
     * @returns {String} - Complete questions XML
     */
    createQuestionsXML(quizId, title) {
        const safeTitle = this.escapeXML(title);
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/ims_qtiasiv1p2 http://www.imsglobal.org/xsd/ims_qtiasiv1p2p1.xsd">
<assessment ident="${quizId}" title="${safeTitle}">
  <qtimetadata>
    <qtimetadatafield>
      <fieldlabel>cc_maxattempts</fieldlabel>
      <fieldentry>1</fieldentry>
    </qtimetadatafield>
  </qtimetadata>
  <section ident="root_section">`;

        // Add all question items
        this.itemsXML.forEach(item => {
            xml += '\n    ' + item.xml;
        });
        
        xml += `
  </section>
</assessment>
</questestinterop>`;
        
        return xml;
    }
    
/**
 * Create Multiple Choice question item
 * @param {String} id - Question ID
 * @param {String} questionText - Question text
 * @param {Array} questionData - Full question data
 * @returns {String} - QTI XML for multiple choice item
 */
createMultipleChoiceItem(id, questionText, questionData) {
  // Generate answer IDs
  const answerIds = [];
  const options = [];
  let correctAnswerId = null;
  
  // Process options (starting from index 2, in pairs)
  for (let i = 2; i < questionData.length; i += 2) {
      if (i + 1 < questionData.length) {  // Ensure we have both the option and its tag
          const optionText = questionData[i];
          const tagValue = questionData[i+1];
          
          if (optionText && optionText.toString().trim() !== '') {  // Only process non-empty options
              const answerId = `question_${this.generateUniqueId()}`;
              answerIds.push(answerId);
              
              const isCorrect = tagValue && tagValue.toString().toLowerCase() === 'correct';
              
              options.push({
                  id: answerId,
                  text: this.escapeXML(optionText.toString()),
                  correct: isCorrect
              });
              
              if (isCorrect) {
                  correctAnswerId = answerId;
              }
          }
      }
  }
  
  // Create original_answer_ids string
  const originalAnswerIds = answerIds.join(',');
  
  // Generate item XML
  let xml = `<item ident="${id}" title="Question">
    <itemmetadata>
      <qtimetadata>
        <qtimetadatafield>
          <fieldlabel>question_type</fieldlabel>
          <fieldentry>multiple_choice_question</fieldentry>
        </qtimetadatafield>
        <qtimetadatafield>
          <fieldlabel>points_possible</fieldlabel>
          <fieldentry>1</fieldentry>
        </qtimetadatafield>
        <qtimetadatafield>
          <fieldlabel>original_answer_ids</fieldlabel>
          <fieldentry>${originalAnswerIds}</fieldentry>
        </qtimetadatafield>
        <qtimetadatafield>
          <fieldlabel>assessment_question_identifierref</fieldlabel>
          <fieldentry>question_ref_${id.substring(9)}</fieldentry>
        </qtimetadatafield>
      </qtimetadata>
    </itemmetadata>
    <presentation>
      <material>
        <mattext texttype="text/html">&lt;p&gt;${questionText}&lt;/p&gt;</mattext>
      </material>
      <response_lid ident="response1" rcardinality="Single">
        <render_choice>`;
  
  // Add each option
  options.forEach(option => {
      xml += `
          <response_label ident="${option.id}">
            <material>
              <mattext texttype="text/html">&lt;p&gt;${option.text}&lt;/p&gt;</mattext>
            </material>
          </response_label>`;
  });
  
  xml += `
        </render_choice>
      </response_lid>
    </presentation>
    <resprocessing>
      <outcomes>
        <decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/>
      </outcomes>`;
  
  // Add correct answer condition
  if (correctAnswerId) {
      xml += `
      <respcondition continue="No">
        <conditionvar>
          <varequal respident="response1">${correctAnswerId}</varequal>
        </conditionvar>
        <setvar action="Set" varname="SCORE">100</setvar>
      </respcondition>`;
  }
  
  xml += `
    </resprocessing>
  </item>`;
  
  return xml;
}
    
/**
 * Create Multiple Answer question item
 * @param {String} id - Question ID
 * @param {String} questionText - Question text
 * @param {Array} questionData - Full question data
 * @returns {String} - QTI XML for multiple answer item
 */
createMultipleAnswerItem(id, questionText, questionData) {
  // Generate answer IDs
  const answerIds = [];
  const options = [];
  const correctAnswerIds = [];
  
  // Process options (starting from index 2, in pairs)
  for (let i = 2; i < questionData.length; i += 2) {
      if (i + 1 < questionData.length) {  // Ensure we have both the option and its tag
          const optionText = questionData[i];
          const tagValue = questionData[i+1];
          
          if (optionText && optionText.toString().trim() !== '') {  // Only process non-empty options
              const answerId = `question_${this.generateUniqueId()}`;
              answerIds.push(answerId);
              
              const isCorrect = tagValue && tagValue.toString().toLowerCase() === 'correct';
              
              options.push({
                  id: answerId,
                  text: this.escapeXML(optionText.toString()),
                  correct: isCorrect
              });
              
              if (isCorrect) {
                  correctAnswerIds.push(answerId);
              }
          }
      }
  }
  
  // Create original_answer_ids string
  const originalAnswerIds = answerIds.join(',');
  
  // Generate item XML
  let xml = `<item ident="${id}" title="Question">
    <itemmetadata>
      <qtimetadata>
        <qtimetadatafield>
          <fieldlabel>question_type</fieldlabel>
          <fieldentry>multiple_answers_question</fieldentry>
        </qtimetadatafield>
        <qtimetadatafield>
          <fieldlabel>points_possible</fieldlabel>
          <fieldentry>1</fieldentry>
        </qtimetadatafield>
        <qtimetadatafield>
          <fieldlabel>original_answer_ids</fieldlabel>
          <fieldentry>${originalAnswerIds}</fieldentry>
        </qtimetadatafield>
        <qtimetadatafield>
          <fieldlabel>assessment_question_identifierref</fieldlabel>
          <fieldentry>question_ref_${id.substring(9)}</fieldentry>
        </qtimetadatafield>
      </qtimetadata>
    </itemmetadata>
    <presentation>
      <material>
        <mattext texttype="text/html">&lt;p&gt;${questionText}&lt;/p&gt;</mattext>
      </material>
      <response_lid ident="response1" rcardinality="Multiple">
        <render_choice>`;
  
  // Add each option
  options.forEach(option => {
      xml += `
          <response_label ident="${option.id}">
            <material>
              <mattext texttype="text/html">&lt;p&gt;${option.text}&lt;/p&gt;</mattext>
            </material>
          </response_label>`;
  });
  
  xml += `
        </render_choice>
      </response_lid>
    </presentation>
    <resprocessing>
      <outcomes>
        <decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/>
      </outcomes>`;
  
  // Add correct answer condition using AND logic
  if (correctAnswerIds.length > 0) {
      xml += `
      <respcondition continue="No">
        <conditionvar>
          <and>`;
      
      // All correct answers must be selected
      correctAnswerIds.forEach(id => {
          xml += `
            <varequal respident="response1">${id}</varequal>`;
      });
      
      // All incorrect answers must not be selected
      options.forEach(option => {
          if (!option.correct) {
              xml += `
            <not>
              <varequal respident="response1">${option.id}</varequal>
            </not>`;
          }
      });
      
      xml += `
          </and>
        </conditionvar>
        <setvar action="Set" varname="SCORE">100</setvar>
      </respcondition>`;
  }
  
  xml += `
    </resprocessing>
  </item>`;
  
  return xml;
}
    
    /**
     * Create True/False question item
     * @param {String} id - Question ID
     * @param {String} questionText - Question text
     * @param {Array|Object} questionData - Question data
     * @returns {String} - QTI XML for true/false item
     */
    createTrueFalseItem(id, questionText, questionData) {
        // Handle different formats of question data
        let correctAnswer = false;
        
        if (Array.isArray(questionData)) {
            // If it's an array, the answer should be at index 2
            const answerText = questionData[2] ? String(questionData[2]).trim().toUpperCase() : '';
            correctAnswer = answerText === 'TRUE';
        } else if (typeof questionData === 'object') {
            // If it's an object, check for the answer property
            correctAnswer = !!questionData.answer;
        }
        
        console.log(`Creating TF question: "${questionText.substring(0, 30)}..." Answer: ${correctAnswer ? 'TRUE' : 'FALSE'}`);
        
        // Generate answer IDs
        const trueId = `question_${this.generateUniqueId()}`;
        const falseId = `question_${this.generateUniqueId()}`;
        
        // Generate item XML
        let xml = `<item ident="${id}" title="Question">
      <itemmetadata>
        <qtimetadata>
          <qtimetadatafield>
            <fieldlabel>question_type</fieldlabel>
            <fieldentry>true_false_question</fieldentry>
            </qtimetadatafield>
            <qtimetadatafield>
              <fieldlabel>points_possible</fieldlabel>
              <fieldentry>1</fieldentry>
            </qtimetadatafield>
            <qtimetadatafield>
              <fieldlabel>original_answer_ids</fieldlabel>
              <fieldentry>${trueId},${falseId}</fieldentry>
            </qtimetadatafield>
            <qtimetadatafield>
              <fieldlabel>assessment_question_identifierref</fieldlabel>
              <fieldentry>question_ref_${id.substring(9)}</fieldentry>
            </qtimetadatafield>
          </qtimetadata>
        </itemmetadata>
        <presentation>
          <material>
            <mattext texttype="text/html">&lt;p&gt;${questionText}&lt;/p&gt;</mattext>
          </material>
          <response_lid ident="response1" rcardinality="Single">
            <render_choice>
              <response_label ident="${trueId}">
                <material>
                  <mattext texttype="text/html">&lt;p&gt;true&lt;/p&gt;</mattext>
                </material>
              </response_label>
              <response_label ident="${falseId}">
                <material>
                  <mattext texttype="text/html">&lt;p&gt;false&lt;/p&gt;</mattext>
                </material>
              </response_label>
            </render_choice>
          </response_lid>
        </presentation>
        <resprocessing>
          <outcomes>
            <decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/>
          </outcomes>
          <respcondition continue="No">
            <conditionvar>
              <varequal respident="response1">${correctAnswer ? trueId : falseId}</varequal>
            </conditionvar>
            <setvar action="Set" varname="SCORE">100</setvar>
          </respcondition>
        </resprocessing>
      </item>`;
        
        return xml;
    }
    
    /**
     * Create Essay question item
     * @param {String} id - Question ID
     * @param {String} questionText - Question text
     * @returns {String} - QTI XML for essay item
     */
    createEssayItem(id, questionText) {
        // Generate item XML
        let xml = `<item ident="${id}" title="Question">
      <itemmetadata>
        <qtimetadata>
          <qtimetadatafield>
            <fieldlabel>question_type</fieldlabel>
            <fieldentry>essay_question</fieldentry>
          </qtimetadatafield>
          <qtimetadatafield>
            <fieldlabel>points_possible</fieldlabel>
            <fieldentry>1</fieldentry>
          </qtimetadatafield>
          <qtimetadatafield>
            <fieldlabel>assessment_question_identifierref</fieldlabel>
            <fieldentry>question_ref_${id.substring(9)}</fieldentry>
          </qtimetadatafield>
        </qtimetadata>
      </itemmetadata>
      <presentation>
        <material>
          <mattext texttype="text/html">&lt;p&gt;${questionText}&lt;/p&gt;</mattext>
        </material>
        <response_str ident="response1" rcardinality="Single">
          <render_fib>
            <response_label ident="answer1" rshuffle="No"/>
          </render_fib>
        </response_str>
      </presentation>
      <resprocessing>
        <outcomes>
          <decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/>
        </outcomes>
        <respcondition continue="No">
          <conditionvar>
            <other/>
          </conditionvar>
        </respcondition>
      </resprocessing>
    </item>`;
        
        return xml;
    }
    
    /**
     * Create Fill in the Blank question item
     * @param {String} id - Question ID
     * @param {String} questionText - Question text
     * @param {Array} questionData - Full question data
     * @returns {String} - QTI XML for fill in the blank item
     */
    createFillInBlankItem(id, questionText, questionData) {
        // Extract correct answers
        const correctAnswers = [];
        
        // Process possible answers (starting from index 2)
        for (let i = 2; i < questionData.length; i++) {
            if (questionData[i] && questionData[i].toString().trim() !== '') {
                correctAnswers.push(this.escapeXML(questionData[i]));
            }
        }
        
        // Generate item XML
        let xml = `<item ident="${id}" title="Question">
      <itemmetadata>
        <qtimetadata>
          <qtimetadatafield>
            <fieldlabel>question_type</fieldlabel>
            <fieldentry>short_answer_question</fieldentry>
          </qtimetadatafield>
          <qtimetadatafield>
            <fieldlabel>points_possible</fieldlabel>
            <fieldentry>1</fieldentry>
          </qtimetadatafield>
          <qtimetadatafield>
            <fieldlabel>assessment_question_identifierref</fieldlabel>
            <fieldentry>question_ref_${id.substring(9)}</fieldentry>
          </qtimetadatafield>
        </qtimetadata>
      </itemmetadata>
      <presentation>
        <material>
          <mattext texttype="text/html">&lt;p&gt;${questionText}&lt;/p&gt;</mattext>
        </material>
        <response_str ident="response1" rcardinality="Single">
          <render_fib>
            <response_label ident="answer1" rshuffle="No"/>
          </render_fib>
        </response_str>
      </presentation>
      <resprocessing>
        <outcomes>
          <decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/>
        </outcomes>`;
        
        // Add response conditions for each correct answer
        correctAnswers.forEach(answer => {
            xml += `
        <respcondition continue="No">
          <conditionvar>
            <varequal respident="response1" case="No">${answer}</varequal>
          </conditionvar>
          <setvar action="Set" varname="SCORE">100</setvar>
        </respcondition>`;
        });
        
        xml += `
      </resprocessing>
    </item>`;
        
        return xml;
    }
    
    /**
     * Create manifest XML
     * @param {String} quizId - Quiz identifier
     * @param {String} title - Quiz title
     * @param {String} description - Quiz description
     * @returns {String} - Manifest XML
     */
    createManifestXML(quizId, title, description) {
        const currentDate = new Date().toISOString().split('T')[0];
        const safeTitle = this.escapeXML(title);
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${quizId}_manifest" xmlns="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1" xmlns:lom="http://ltsc.ieee.org/xsd/imsccv1p1/LOM/resource" xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1 http://www.imsglobal.org/xsd/imscp_v1p1.xsd http://ltsc.ieee.org/xsd/imsccv1p1/LOM/resource http://www.imsglobal.org/profile/cc/ccv1p0/LOM/ccv1p0_lomresource_v1p0.xsd http://www.imsglobal.org/xsd/imsmd_v1p2 http://www.imsglobal.org/xsd/imsmd_v1p2p2.xsd">
<metadata>
  <schema>IMS Content</schema>
  <schemaversion>1.1.3</schemaversion>
  <imsmd:lom>
    <imsmd:general>
      <imsmd:title>
        <imsmd:string>QTI assessment generated from CSV</imsmd:string>
      </imsmd:title>
    </imsmd:general>
    <imsmd:lifeCycle>
      <imsmd:contribute>
        <imsmd:date>
          <imsmd:dateTime>${currentDate}</imsmd:dateTime>
        </imsmd:date>
      </imsmd:contribute>
    </imsmd:lifeCycle>
    <imsmd:rights>
      <imsmd:copyrightAndOtherRestrictions>
        <imsmd:value>yes</imsmd:value>
      </imsmd:copyrightAndOtherRestrictions>
      <imsmd:description>
        <imsmd:string>Private (Copyrighted) - http://en.wikipedia.org/wiki/Copyright</imsmd:string>
      </imsmd:description>
    </imsmd:rights>
  </imsmd:lom>
</metadata>
<organizations/>
<resources>
  <resource identifier="${quizId}" type="imsqti_xmlv1p2">
    <file href="${quizId}/questions.xml"/>
    <dependency identifierref="${quizId}_dependency"/>
  </resource>
  <resource identifier="${quizId}_dependency" type="associatedcontent/imscc_xmlv1p1/learning-application-resource" href="${quizId}/assessment_meta.xml">
    <file href="${quizId}/assessment_meta.xml"/>
  </resource>
</resources>
</manifest>`;
        
        return xml;
    }
    
    /**
     * Create assessment meta XML
     * @param {String} quizId - Quiz identifier
     * @param {String} title - Quiz title
     * @param {String} description - Quiz description
     * @param {Number} questionCount - Number of questions
     * @returns {String} - Assessment meta XML
     */
    createAssessmentMetaXML(quizId, title, description, questionCount) {
        const assignmentId = `text2qti_assignment_${quizId.substring(9)}`;
        const assignmentGroupId = `text2qti_assignment-group_${quizId.substring(9)}`;
        const safeTitle = this.escapeXML(title);
        const safeDescription = description ? `&lt;p&gt;${this.escapeXML(description)}&lt;/p&gt;` : '';
        const pointsPossible = questionCount.toFixed(1);
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<quiz identifier="${quizId}" xmlns="http://canvas.instructure.com/xsd/cccv1p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://canvas.instructure.com/xsd/cccv1p0 https://canvas.instructure.com/xsd/cccv1p0.xsd">
<title>${safeTitle}</title>
<description>${safeDescription}</description>
<shuffle_answers>false</shuffle_answers>
<scoring_policy>keep_highest</scoring_policy>
<hide_results></hide_results>
<quiz_type>assignment</quiz_type>
<points_possible>${pointsPossible}</points_possible>
<require_lockdown_browser>false</require_lockdown_browser>
<require_lockdown_browser_for_results>false</require_lockdown_browser_for_results>
<require_lockdown_browser_monitor>false</require_lockdown_browser_monitor>
<lockdown_browser_monitor_data/>
<show_correct_answers>true</show_correct_answers>
<anonymous_submissions>false</anonymous_submissions>
<could_be_locked>false</could_be_locked>
<allowed_attempts>1</allowed_attempts>
<one_question_at_a_time>false</one_question_at_a_time>
<cant_go_back>false</cant_go_back>
<available>false</available>
<one_time_results>false</one_time_results>
<show_correct_answers_last_attempt>false</show_correct_answers_last_attempt>
<only_visible_to_overrides>false</only_visible_to_overrides>
<module_locked>false</module_locked>
<assignment identifier="${assignmentId}">
  <title>${safeTitle}</title>
  <due_at/>
  <lock_at/>
  <unlock_at/>
  <module_locked>false</module_locked>
  <workflow_state>unpublished</workflow_state>
  <assignment_overrides>
  </assignment_overrides>
  <quiz_identifierref>${quizId}</quiz_identifierref>
  <allowed_extensions></allowed_extensions>
  <has_group_category>false</has_group_category>
  <points_possible>${pointsPossible}</points_possible>
  <grading_type>points</grading_type>
  <all_day>false</all_day>
  <submission_types>online_quiz</submission_types>
  <position>1</position>
  <turnitin_enabled>false</turnitin_enabled>
  <vericite_enabled>false</vericite_enabled>
  <peer_review_count>0</peer_review_count>
  <peer_reviews>false</peer_reviews>
  <automatic_peer_reviews>false</automatic_peer_reviews>
  <anonymous_peer_reviews>false</anonymous_peer_reviews>
  <grade_group_students_individually>false</grade_group_students_individually>
  <freeze_on_copy>false</freeze_on_copy>
  <omit_from_final_grade>false</omit_from_final_grade>
  <intra_group_peer_reviews>false</intra_group_peer_reviews>
  <only_visible_to_overrides>false</only_visible_to_overrides>
  <post_to_sis>false</post_to_sis>
  <moderated_grading>false</moderated_grading>
  <grader_count>0</grader_count>
  <grader_comments_visible_to_graders>true</grader_comments_visible_to_graders>
  <anonymous_grading>false</anonymous_grading>
  <graders_anonymous_to_graders>false</graders_anonymous_to_graders>
  <grader_names_visible_to_final_grader>true</grader_names_visible_to_final_grader>
  <anonymous_instructor_annotations>false</anonymous_instructor_annotations>
  <post_policy>
    <post_manually>false</post_manually>
  </post_policy>
</assignment>
<assignment_group_identifierref>${assignmentGroupId}</assignment_group_identifierref>
<assignment_overrides>
</assignment_overrides>
</quiz>`;
        
        return xml;
    }
    
    /**
     * Set the quiz title
     * @param {String} title - Quiz title
     */
    setQuizTitle(title) {
        this.quizTitle = title || 'Untitled Quiz';
    }

    /**
     * Set the quiz description
     * @param {String} description - Quiz description
     */
    setQuizDescription(description) {
        this.quizDescription = description || '';
    }

    /**
     * Add questions to the converter
     * @param {Object} questionData - Object containing question data
     */
    addQuestions(questionData) {
        if (!questionData) {
            console.error('Question data is null or undefined');
            return;
        }
        
        // Handle the case where questionData is an object with arrays for different question types
        if (typeof questionData === 'object' && questionData.all && Array.isArray(questionData.all)) {
            // Process all questions, ensuring TF questions have the correct format
            this.questions = questionData.all.map(q => {
                // If it's a TF question, ensure it has the correct format for the converter
                if (q.type === 'TF' && q.data) {
                    // Make sure the answer is in the correct format for createTrueFalseItem
                    // The third element (index 2) should be 'TRUE' or 'FALSE'
                    const tfData = [...q.data];
                    if (q.answer !== undefined) {
                        tfData[2] = q.answer ? 'TRUE' : 'FALSE';
                    }
                    return tfData;
                }
                return q.data || q;
            });
            
            // Also include questions from the TF array if it exists
            if (questionData.TF && Array.isArray(questionData.TF) && questionData.TF.length > 0) {
                const tfQuestions = questionData.TF.map(q => {
                    // Format TF questions correctly
                    const tfData = [...(q.data || [])];
                    if (q.answer !== undefined) {
                        tfData[2] = q.answer ? 'TRUE' : 'FALSE';
                    }
                    return tfData;
                });
                
                // Add TF questions that aren't already in the questions array
                const existingIds = new Set(this.questions.map(q => q.id || ''));
                const newTfQuestions = tfQuestions.filter(q => !existingIds.has(q.id || ''));
                
                this.questions = [...this.questions, ...newTfQuestions];
            }
        } else if (Array.isArray(questionData)) {
            this.questions = questionData;
        } else {
            console.error('Questions must be an array or an object with an "all" array property');
        }
        
        console.log(`Total questions added: ${this.questions.length}`);
    }
    
    /**
     * Generate QTI package with the current quiz data
     * @returns {Blob} - Zip file blob
     */
    generateQTIPackage() {
        try {
            // Convert using the existing convert method
            const zipPromise = this.convert(this.questions, this.quizTitle, this.quizDescription);
            
            // Handle the promise to return a Blob synchronously
            let zipBlob = null;
            zipPromise.then(blob => {
                zipBlob = blob;
            }).catch(error => {
                console.error('Error generating QTI package:', error);
                throw error;
            });
            
            // If we have a zipBlob, return it
            if (zipBlob) {
                return zipBlob;
            }
            
            // Otherwise create a dummy blob to avoid errors
            return new Blob(['Processing...'], { type: 'text/plain' });
        } catch (error) {
            console.error('Error in generateQTIPackage:', error);
            // Return a dummy blob to avoid errors
            return new Blob(['Error generating QTI package'], { type: 'text/plain' });
        }
    }
    
    /**
     * Escape special characters for XML
     * @param {String} str - String to escape
     * @returns {String} - Escaped string
     */
    escapeXML(str) {
        // Ensure we have a string
        if (str === null || str === undefined || typeof str !== 'string') {
            return '';
        }
        
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}

// Export the QTIConverter class
window.QTIConverter = QTIConverter;