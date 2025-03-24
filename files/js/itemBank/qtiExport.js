/**
 * QTI Export Module
 * Handles conversion of quiz questions to QTI format and packages as a zip file
 * Compatible with Canvas LMS and other QTI-compliant systems
 */

class QTIExport {
  constructor(questionProcessor) {
      this.questionProcessor = questionProcessor;
      this.jszip = new JSZip();
      this.questionCounter = 0;
      this.itemsXML = [];
      this.manifestItems = [];
      
      console.log('QTIExport: Initialized with question processor');
  }

  /**
   * Export selected questions as QTI package
   * @param {String} title - Quiz title
   * @param {String} description - Quiz description (optional)
   * @returns {Promise<Blob>} - Promise resolving to zip file blob
   */
  async exportQTI(title, description = '') {
      console.log(`QTIExport: Starting export of "${title}"`);
      
      try {
          // Reset state for new export
          this.questionCounter = 0;
          this.itemsXML = [];
          this.manifestItems = [];
          
          // Get selected questions
          const selectedQuestions = this.questionProcessor.getSelectedQuestions();
          console.log(`QTIExport: Found ${selectedQuestions.length} selected questions`);
          
          if (selectedQuestions.length === 0) {
              const error = new Error('No questions selected for export');
              console.error('QTIExport:', error);
              throw error;
          }
          
          // Generate unique identifier for the quiz
          const quizIdentifier = "qti_export_" + this.generateUniqueId();
          const rootFolder = quizIdentifier;
          console.log(`QTIExport: Created quiz identifier: ${quizIdentifier}`);
          
          // Process each selected question
          selectedQuestions.forEach((question, index) => {
              console.log(`QTIExport: Processing question ${index + 1}/${selectedQuestions.length} (${question.type})`);
              this.processQuestion(question);
          });
          
          console.log(`QTIExport: Successfully processed ${this.itemsXML.length} questions`);
          
          // Create required XML files
          const manifestXML = this.createManifestXML(quizIdentifier, title, description);
          const assessmentMetaXML = this.createAssessmentMetaXML(quizIdentifier, title, description, selectedQuestions.length);
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
          
          console.log('QTIExport: Generating final zip package');
          
          // Generate zip file
          const zipBlob = await zip.generateAsync({ type: "blob" });
          console.log(`QTIExport: Successfully created ${(zipBlob.size / 1024).toFixed(2)}KB zip file`);
          return zipBlob;
      } catch (error) {
          console.error("QTIExport: Error exporting to QTI:", error);
          throw error;
      }
  }
  
  /**
   * Generate a unique ID (8 character hex string)
   */
  generateUniqueId() {
      return Math.floor((1 + Math.random()) * 0x10000000)
          .toString(16)
          .substring(1);
  }
  
  /**
   * Process question and convert to QTI format
   */
  processQuestion(question) {
      this.questionCounter++;
      const questionId = `question_${this.generateUniqueId()}`;
      
      try {
          let itemXml = '';
          let questionType = '';
          const questionText = this.escapeXML(question.text || '');
          
          // Handle different question types
          switch (question.type) {
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
                  console.warn(`QTIExport: Unsupported question type: ${question.type}`);
                  return;
          }
          
          // Only add the question if XML was generated
          if (itemXml) {
              const title = questionText.substring(0, 50) || `Question ${this.questionCounter}`;
              
              this.itemsXML.push({
                  id: questionId,
                  xml: itemXml,
                  title: title,
                  type: questionType
              });
              
              console.log(`QTIExport: Added ${questionType} with ID ${questionId}`);
          } else {
              console.warn(`QTIExport: Failed to generate XML for question ${this.questionCounter}`);
          }
      } catch (error) {
          console.error(`QTIExport: Error processing question ${this.questionCounter}:`, error);
          console.error('QTIExport: Problem question data:', JSON.stringify(question).substring(0, 200) + '...');
      }
  }
  
  /**
   * Create complete questions XML file with all items
   */
  createQuestionsXML(quizId, title) {
      console.log(`QTIExport: Creating questions XML with ${this.itemsXML.length} items`);
      
      try {
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
      } catch (error) {
          console.error('QTIExport: Error creating questions XML:', error);
          throw new Error('Failed to create questions XML: ' + error.message);
      }
  }
  
  /**
   * Create Multiple Choice question XML
   */
  createMultipleChoiceItem(id, questionText, question) {
      try {
          // Generate answer IDs
          const answerIds = [];
          const options = [];
          let correctAnswerId = null;
          
          if (!question.options || question.options.length === 0) {
              console.warn(`QTIExport: Multiple choice question has no options, ID: ${id}`);
          }
          
          if (question.options && question.options.length > 0) {
              // Process options
              question.options.forEach((option, index) => {
                  const answerId = `answer_${this.generateUniqueId()}`;
                  answerIds.push(answerId);
                  
                  options.push({
                      id: answerId,
                      text: this.escapeXML(option.text || ''),
                      correct: option.isCorrect
                  });
                  
                  if (option.isCorrect) {
                      correctAnswerId = answerId;
                  }
              });
          }
          
          if (!correctAnswerId) {
              console.warn(`QTIExport: Multiple choice question has no correct answer, ID: ${id}`);
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
      } catch (error) {
          console.error(`QTIExport: Error creating multiple choice item ${id}:`, error);
          return null;
      }
  }
  
  /**
   * Create Multiple Answer question XML
   */
  createMultipleAnswerItem(id, questionText, question) {
      try {
          // Generate answer IDs
          const answerIds = [];
          const options = [];
          const correctAnswerIds = [];
          
          if (!question.options || question.options.length === 0) {
              console.warn(`QTIExport: Multiple answer question has no options, ID: ${id}`);
          }
          
          if (question.options && question.options.length > 0) {
              // Process options
              question.options.forEach(option => {
                  const answerId = `answer_${this.generateUniqueId()}`;
                  answerIds.push(answerId);
                  
                  const isCorrect = option.isCorrect;
                  
                  options.push({
                      id: answerId,
                      text: this.escapeXML(option.text || ''),
                      correct: isCorrect
                  });
                  
                  if (isCorrect) {
                      correctAnswerIds.push(answerId);
                  }
              });
          }
          
          if (correctAnswerIds.length === 0) {
              console.warn(`QTIExport: Multiple answer question has no correct answers, ID: ${id}`);
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
      } catch (error) {
          console.error(`QTIExport: Error creating multiple answer item ${id}:`, error);
          return null;
      }
  }
  
  /**
   * Create True/False question XML
   */
  createTrueFalseItem(id, questionText, question) {
      try {
          // Determine correct answer
          const correctAnswer = question.isTrue === true;
          
          // Generate answer IDs
          const trueId = `answer_${this.generateUniqueId()}`;
          const falseId = `answer_${this.generateUniqueId()}`;
          
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
      } catch (error) {
          console.error(`QTIExport: Error creating true/false item ${id}:`, error);
          return null;
      }
  }
  
  /**
   * Create Essay question XML
   */
  createEssayItem(id, questionText) {
      try {
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
      } catch (error) {
          console.error(`QTIExport: Error creating essay item ${id}:`, error);
          return null;
      }
  }
  
  /**
   * Create Fill in the Blank question XML
   */
  createFillInBlankItem(id, questionText, question) {
      try {
          // Extract correct answers
          const correctAnswers = [];
          
          if (!question.correctAnswers || question.correctAnswers.length === 0) {
              console.warn(`QTIExport: Fill in blank question has no correct answers, ID: ${id}`);
          }
          
          if (question.correctAnswers && question.correctAnswers.length > 0) {
              question.correctAnswers.forEach(answer => {
                  if (answer && answer.trim() !== '') {
                      correctAnswers.push(this.escapeXML(answer));
                  }
              });
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
      } catch (error) {
          console.error(`QTIExport: Error creating fill in blank item ${id}:`, error);
          return null;
      }
  }
  
  /**
   * Create manifest XML for the QTI package
   */
  createManifestXML(quizId, title, description) {
      try {
          const currentDate = new Date().toISOString().split('T')[0];
          const safeTitle = this.escapeXML(title);
          
          console.log(`QTIExport: Creating manifest XML for ${quizId}`);
          
          let xml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${quizId}_manifest" xmlns="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1" xmlns:lom="http://ltsc.ieee.org/xsd/imsccv1p1/LOM/resource" xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1 http://www.imsglobal.org/xsd/imscp_v1p1.xsd http://ltsc.ieee.org/xsd/imsccv1p1/LOM/resource http://www.imsglobal.org/profile/cc/ccv1p0/LOM/ccv1p0_lomresource_v1p0.xsd http://www.imsglobal.org/xsd/imsmd_v1p2 http://www.imsglobal.org/xsd/imsmd_v1p2p2.xsd">
<metadata>
<schema>IMS Content</schema>
<schemaversion>1.1.3</schemaversion>
<imsmd:lom>
  <imsmd:general>
    <imsmd:title>
      <imsmd:string>${safeTitle}</imsmd:string>
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
      } catch (error) {
          console.error('QTIExport: Error creating manifest XML:', error);
          throw new Error('Failed to create manifest XML: ' + error.message);
      }
  }
  
  /**
   * Create assessment metadata XML
   */
  createAssessmentMetaXML(quizId, title, description, questionCount) {
      try {
          const assignmentId = `itembank_assignment_${quizId.substring(9)}`;
          const assignmentGroupId = `itembank_assignment-group_${quizId.substring(9)}`;
          const safeTitle = this.escapeXML(title);
          const safeDescription = description ? `&lt;p&gt;${this.escapeXML(description)}&lt;/p&gt;` : '';
          const pointsPossible = questionCount.toFixed(1);
          
          console.log(`QTIExport: Creating assessment meta XML for ${quizId} with ${questionCount} questions`);
          
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
      } catch (error) {
          console.error('QTIExport: Error creating assessment meta XML:', error);
          throw new Error('Failed to create assessment meta XML: ' + error.message);
      }
  }
  
  /**
   * Escape special characters for XML safety
   */
  escapeXML(str) {
      try {
          // Ensure we have a string
          if (str === null || str === undefined || typeof str !== 'string') {
              return str ? String(str) : '';
          }
          
          return str
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&apos;');
      } catch (error) {
          console.error('QTIExport: Error escaping XML:', error);
          return ''; // Return empty string as fallback
      }
  }
}

// Export the QTIExport class
window.QTIExport = QTIExport;