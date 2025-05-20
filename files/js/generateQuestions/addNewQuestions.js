document.addEventListener("DOMContentLoaded", function () {
  const questionsContainer = document.getElementById("questions-container");
  const addQuestionBtn = document.getElementById("add-question-btn");
  const questionTypeDropdown = document.getElementById(
    "question-type-dropdown"
  );
  const exportQtiBtn = document.getElementById("export-qti-btn");
  const successMessage = document.getElementById("success-message");
  const successText = document.getElementById("success-text");
  let questionCounter = 0;
  let draggedItem = null;

  // Show question type dropdown when add button is clicked
  addQuestionBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    questionTypeDropdown.style.display =
      questionTypeDropdown.style.display === "none" ? "block" : "none";
  });

  // Hide dropdown when clicking outside
  document.addEventListener("click", function (e) {
    if (
      !e.target.matches("#add-question-btn") &&
      !e.target.closest("#question-type-dropdown")
    ) {
      questionTypeDropdown.style.display = "none";
    }
  });

  // Add question of selected type
  questionTypeDropdown.addEventListener("click", function (e) {
    const questionType = e.target.getAttribute("data-type");
    if (questionType) {
      addQuestion(questionType);
      questionTypeDropdown.style.display = "none";
    }
  });

  // Creates and appends a new question element of the specified type
  function addQuestion(type) {
    try {
      const questionNumber =
        questionsContainer.querySelectorAll(".question-entry").length + 1;
      const questionEntry = document.createElement("div");
      questionEntry.className = "question-entry expanded";
      questionEntry.setAttribute("draggable", "false");

      // Create unique radio group ID
      const radioGroupId = `question-${generateUUID()}`;
      questionEntry.dataset.radioGroupId = radioGroupId;

      questionEntry.innerHTML = `
            <div class="question-header">
                <span class="question-number" data-question-preview=""></span>
                <span class="question-type">${formatQuestionType(type)}</span>
                <div class="question-controls">
                    <button type="button" class="copy-question" title="Duplicate Question"><i class="fas fa-copy"></i></button>
                    <button type="button" class="move-question" title="Drag to Reorder"><i class="fas fa-arrows-alt"></i></button>
                    <button type="button" class="delete-question" title="Delete Question">&times;</button>
                </div>
            </div>
            <div class="question-content">
                ${getQuestionTemplate(type, radioGroupId)}
            </div>
        `;

      // Set question number
      const questionNumberSpan =
        questionEntry.querySelector(".question-number");
      questionNumberSpan.textContent = questionNumber;

      questionsContainer.appendChild(questionEntry);
      updateQuestionNumbers();
      setupDragAndDrop();
      setupButtonListeners();

      // Setup textarea focus and preview functionality
      const textArea = questionEntry.querySelector("textarea");
      if (textArea) {
        textArea.focus();

        const questionNumberElement =
          questionEntry.querySelector(".question-number");
        textArea.addEventListener("input", function () {
          const questionText = this.value.trim();
          questionNumberElement.setAttribute(
            "data-question-preview",
            questionText.substring(0, 80) +
              (questionText.length > 80 ? "..." : "")
          );
        });
      }

      // Remove unwanted elements
      const cbvElements = questionEntry.querySelectorAll(".cbv");
      cbvElements.forEach((el) => el.remove());
    } catch (error) {
      console.error("Error adding question:", error);
    }
  }

  // Updates the numbering for all questions in the container
  function updateQuestionNumbers() {
    try {
      const questionEntries =
        questionsContainer.querySelectorAll(".question-entry");
      questionEntries.forEach((entry, index) => {
        const questionNumberElement = entry.querySelector(".question-number");
        const previewText =
          questionNumberElement.getAttribute("data-question-preview") || "";
        questionNumberElement.textContent = index + 1;
        questionNumberElement.setAttribute(
          "data-question-preview",
          previewText
        );
      });
    } catch (error) {
      console.error("Error updating question numbers:", error);
    }
  }

  // Sets up drag and drop functionality for reordering questions
  function setupDragAndDrop() {
    try {
      const questionEntries = document.querySelectorAll(".question-entry");

      questionEntries.forEach((questionEntry) => {
        // Enable dragging via move button
        const moveButton = questionEntry.querySelector(".move-question");
        if (moveButton) {
          moveButton.addEventListener("mousedown", function (e) {
            try {
              e.stopPropagation();
              questionEntry.setAttribute("draggable", "true");
              questionEntry.style.cursor = "grabbing";
            } catch (error) {
              console.error("Error on move button mousedown:", error);
            }
          });

          document.addEventListener("mouseup", function () {
            try {
              questionEntry.setAttribute("draggable", "false");
              questionEntry.style.cursor = "";
            } catch (error) {
              console.error("Error on document mouseup:", error);
            }
          });
        }

        // Drag start event
        questionEntry.addEventListener("dragstart", function (e) {
          try {
            e.dataTransfer.setData(
              "text/plain",
              Array.from(questionsContainer.children).indexOf(questionEntry)
            );
            setTimeout(() => {
              questionEntry.classList.add("dragging");
            }, 0);
          } catch (error) {
            console.error("Error on dragstart:", error);
          }
        });

        // Drag end event
        questionEntry.addEventListener("dragend", function () {
          try {
            questionEntry.classList.remove("dragging");
            questionEntry.style.cursor = "";
            questionEntry.setAttribute("draggable", "false");

            document.querySelectorAll(".drag-over").forEach((el) => {
              el.classList.remove("drag-over");
            });
          } catch (error) {
            console.error("Error on dragend:", error);
          }
        });

        // Drag over event
        questionEntry.addEventListener("dragover", function (e) {
          try {
            e.preventDefault();
            if (!questionEntry.classList.contains("dragging")) {
              questionEntry.classList.add("drag-over");
            }
          } catch (error) {
            console.error("Error on dragover:", error);
          }
        });

        // Drag leave event
        questionEntry.addEventListener("dragleave", function () {
          try {
            questionEntry.classList.remove("drag-over");
          } catch (error) {
            console.error("Error on dragleave:", error);
          }
        });

        // Drop event
        questionEntry.addEventListener("drop", function (e) {
          try {
            e.preventDefault();
            const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
            const toIndex = Array.from(questionsContainer.children).indexOf(
              questionEntry
            );

            if (fromIndex !== toIndex) {
              // Reorder the question
              const allQuestions = Array.from(questionsContainer.children);
              const questionToMove = allQuestions[fromIndex];

              if (fromIndex < toIndex) {
                questionsContainer.insertBefore(
                  questionToMove,
                  allQuestions[toIndex + 1]
                );
              } else {
                questionsContainer.insertBefore(
                  questionToMove,
                  allQuestions[toIndex]
                );
              }

              updateQuestionNumbers();
            }

            questionEntry.classList.remove("drag-over");
          } catch (error) {
            console.error("Error on drop:", error);
          }
        });
      });
    } catch (error) {
      console.error("Error setting up drag and drop:", error);
    }
  }

  // Sets up event listeners for adding/removing question options
  function setupButtonListeners() {
    try {
      // Prevent duplicate listeners
      document.removeEventListener("click", handleButtonClicks);
      document.addEventListener("click", handleButtonClicks);

      function handleButtonClicks(e) {
        try {
          // Add answer for multiple answers
          if (e.target.classList.contains("add-answer-btn")) {
            e.stopPropagation();
            const optionsContainer = e.target.closest(".options-container");
            const newAnswerId = `answer${
              optionsContainer.querySelectorAll(".answer-entry").length + 1
            }-${generateUUID()}`;

            const answerEntry = document.createElement("div");
            answerEntry.className = "answer-entry";
            answerEntry.innerHTML = `
                        <input type="checkbox" id="${newAnswerId}">
                        <label></label>
                        <input type="text" placeholder="Answer ${
                          optionsContainer.querySelectorAll(".answer-entry")
                            .length + 1
                        }">
                        <button type="button" class="remove-answer-btn"><i class="fas fa-times"></i></button>
                    `;

            optionsContainer.insertBefore(answerEntry, e.target);
          }

          // Add alternate answer for fill in the blank
          if (e.target.classList.contains("add-alternate-answer-btn")) {
            e.stopPropagation();
            const optionsContainer = optionsContainer.closest(".options-container");
            const alternateAnswersContainer = optionsContainer.querySelector(
              ".alternate-answers-container"
            );

            const altAnswerEntry = document.createElement("div");
            altAnswerEntry.className = "answer-entry";
            altAnswerEntry.innerHTML = `
                        <input type="text" placeholder="Alternate Answer">
                        <button type="button" class="remove-answer-btn"><i class="fas fa-times"></i></button>
                    `;

            alternateAnswersContainer.appendChild(altAnswerEntry);
          }

          // Add option for multiple choice
          if (e.target.classList.contains("add-option-btn")) {
            e.stopPropagation();
            const optionsContainer = optionsContainer.closest(".options-container");
            const newOptionId = `option${
              optionsContainer.querySelectorAll(".option-entry").length + 1
            }-${generateUUID()}`;

            const optionEntry = document.createElement("div");
            optionEntry.className = "option-entry";
            optionEntry.innerHTML = `
                        <input type="radio" name="${
                          optionsContainer.closest(".question-entry").dataset
                            .radioGroupId
                        }" id="${newOptionId}">
                        <label></label>
                        <input type="text" placeholder="Option ${
                          optionsContainer.querySelectorAll(".option-entry")
                            .length + 1
                        }">
                        <button type="button" class="remove-option-btn"><i class="fas fa-times"></i></button>
                    `;

            optionsContainer.insertBefore(optionEntry, e.target);
          }

          // Remove answer
          if (
            e.target.classList.contains("remove-answer-btn") ||
            (e.target.parentElement &&
              e.target.parentElement.classList.contains("remove-answer-btn"))
          ) {
            const button = e.target.classList.contains("remove-answer-btn")
              ? e.target
              : e.target.parentElement;
            const answerEntry = button.closest(".answer-entry");
            answerEntry.remove();
          }

          // Remove alternate answer
          if (
            e.target.classList.contains("remove-alt-answer-btn") ||
            (e.target.parentElement &&
              e.target.parentElement.classList.contains(
                "remove-alt-answer-btn"
              ))
          ) {
            const button = e.target.classList.contains("remove-alt-answer-btn")
              ? e.target
              : e.target.parentElement;
            const altAnswerEntry = button.closest(".alt-answer-entry");
            altAnswerEntry.remove();
          }

          // Remove option
          if (
            e.target.classList.contains("remove-option-btn") ||
            (e.target.parentElement &&
              e.target.parentElement.classList.contains("remove-option-btn"))
          ) {
            const button = e.target.classList.contains("remove-option-btn")
              ? e.target
              : e.target.parentElement;
            const optionEntry = button.closest(".option-entry");
            optionEntry.remove();
          }
        } catch (error) {
          console.error("Error handling button clicks:", error);
        }
      }
    } catch (error) {
      console.error("Error setting up button listeners:", error);
    }
  }

  // Document click handler for collapsing questions when clicking outside
  document.addEventListener("click", function (e) {
    // If we clicked inside a question-entry, expand it and collapse others
    const clickedQuestionEntry = e.target.closest(".question-entry");

    // Don't collapse if clicking on add question button or its dropdown
    const isAddQuestionClick =
      e.target.closest("#add-question-btn") ||
      e.target.closest("#question-type-dropdown") ||
      e.target.closest("#export-qti-btn");

    if (isAddQuestionClick) {
      return;
    }

    // Process all question entries
    const allQuestionEntries = document.querySelectorAll(".question-entry");
    allQuestionEntries.forEach((entry) => {
      const content = entry.querySelector(".question-content");
      const questionHeader = entry.querySelector(".question-header");
      const textarea = entry.querySelector("textarea");

      // If this is the clicked entry, expand it
      if (entry === clickedQuestionEntry) {
        content.style.display = "block";
        entry.classList.add("expanded");
      } else {
        // Otherwise collapse it and update the preview text
        content.style.display = "none";
        entry.classList.remove("expanded");

        // Update the preview text if it's not already set
        if (
          textarea &&
          (!questionHeader
            .querySelector(".question-number")
            .getAttribute("data-question-preview") ||
            questionHeader
              .querySelector(".question-number")
              .getAttribute("data-question-preview") === "")
        ) {
          const questionText = textarea.value.trim();
          questionHeader
            .querySelector(".question-number")
            .setAttribute(
              "data-question-preview",
              questionText.substring(0, 80) +
                (questionText.length > 80 ? "..." : "")
            );
        }
      }
    });
  });

  // Handle copy/duplicate question
  questionsContainer.addEventListener("click", function (e) {
    if (e.target.closest(".copy-question")) {
      const questionEntry = e.target.closest(".question-entry");
      const questionType = questionEntry
        .querySelector(".question-type")
        .textContent.trim();
      const newQuestionEntry = questionEntry.cloneNode(true);
  
      // Generate new UUIDs for all inputs to avoid duplicate IDs
      const radioGroups = newQuestionEntry.querySelectorAll(
        'input[type="radio"]'
      );
      if (radioGroups.length > 0) {
        const newGroupId = generateUUID();
        newQuestionEntry.dataset.radioGroupId = newGroupId; // Update the radio group ID in the dataset
        radioGroups.forEach((radio) => {
          radio.name = newGroupId;
          radio.id = `option${generateUUID()}`;
        });
      }
  
      // Copy textarea content and update preview
      const originalTextarea = questionEntry.querySelector("textarea");
      const newTextarea = newQuestionEntry.querySelector("textarea");
      if (originalTextarea && newTextarea) {
        const questionText = originalTextarea.value;
        newTextarea.value = questionText;
        const preview =
          questionText.substring(0, 80) +
          (questionText.length > 80 ? "..." : "");
        newQuestionEntry
          .querySelector(".question-number")
          .setAttribute("data-question-preview", preview);
          
        // Add event listener to the new textarea to update the preview when the content changes
        newTextarea.addEventListener("input", function () {
          const updatedQuestionText = this.value.trim();
          newQuestionEntry
            .querySelector(".question-number")
            .setAttribute(
              "data-question-preview",
              updatedQuestionText.substring(0, 80) +
                (updatedQuestionText.length > 80 ? "..." : "")
            );
        });
      }
  
      // Copy text input values
      const originalInputs =
        questionEntry.querySelectorAll('input[type="text"]');
      const newInputs = newQuestionEntry.querySelectorAll('input[type="text"]');
      for (let i = 0; i < originalInputs.length; i++) {
        if (newInputs[i]) {
          newInputs[i].value = originalInputs[i].value;
        }
      }
  
      // Copy checkbox/radio states
      const originalCheckboxes = questionEntry.querySelectorAll(
        'input[type="checkbox"], input[type="radio"]'
      );
      const newCheckboxes = newQuestionEntry.querySelectorAll(
        'input[type="checkbox"], input[type="radio"]'
      );
      for (let i = 0; i < originalCheckboxes.length; i++) {
        if (newCheckboxes[i]) {
          newCheckboxes[i].checked = originalCheckboxes[i].checked;
        }
      }
  
      // Insert after the original question and update numbers
      questionEntry.after(newQuestionEntry);
      updateQuestionNumbers();
      setupDragAndDrop(); // Make sure drag and drop is set up for the new question
    }
  });

  // Handle click events for delete, and add answer
  questionsContainer.addEventListener("click", function (e) {
    if (e.target.classList.contains("delete-question")) {
      const questionEntry = e.target.closest(".question-entry");
      questionEntry.remove();
      updateQuestionNumbers();
    }

    if (e.target.classList.contains("add-answer")) {
      const answersGroup = e.target.closest(".form-group");
      const questionType = e.target
        .closest(".question-entry")
        .querySelector(".question-type")
        .textContent.trim();

      // Don't add more options for multiple choice
      if (questionType === "Multiple Choice") {
        return;
      }

      const newEntry = document.createElement("div");

      if (questionType === "Multiple Answer") {
        newEntry.className = "answer-entry";
        newEntry.innerHTML = `
                    <input type="checkbox">
                    <input type="text" placeholder="New answer">
                    <button type="button" class="remove-answer">&times;</button>
                `;
      } else if (questionType === "Fill In The Blank") {
        newEntry.className = "answer-entry";
        newEntry.innerHTML = `
                    <input type="text" placeholder="Alternative answer">
                    <button type="button" class="remove-answer">&times;</button>
                `;
      }

      answersGroup.insertBefore(newEntry, e.target);
    }

    if (e.target.classList.contains("remove-answer")) {
      const answerEntry = e.target.closest(".answer-entry");
      answerEntry.remove();
    }
  });

  // Export as QTI functionality
  exportQtiBtn.addEventListener("click", async function () {
    if (validateQuiz()) {
      // Get the quiz title from the input field
      const quizTitle = document.getElementById("quiz-title").value.trim();

      // Format the filename as v2samplequiz_qti instead of using the time
      const filename = quizTitle
        ? quizTitle.toLowerCase().replace(/\s+/g, "") + "_qti"
        : "v2samplequiz_qti";

      try {
        await exportAsQTI(filename);
      } catch (error) {
        console.error("Error exporting quiz:", error);
        alert(
          "Failed to export quiz. Please make sure all questions are properly filled out."
        );
      }
    }
  });

  // Function to validate the quiz before export
  function validateQuiz() {
    const questionEntries =
      questionsContainer.querySelectorAll(".question-entry");
    // Check if title is filled
    const quizTitle = document.getElementById("quiz-title").value.trim();
    if (!quizTitle) {
      alert("Please enter a quiz title before proceeding.");
      document.getElementById("quiz-title").focus();
      return false;
    }
    // Do NOT require description
    if (questionEntries.length === 0) {
      alert("Please add at least one question before proceeding.");
      return false;
    }
    return true;
  }

  // Function to export quiz as QTI
  async function exportAsQTI(filename) {
    try {
      // Gather all quiz data
      const quizData = collectQuizData();

      // Create JSZip instance
      const zip = new JSZip();

      // Generate unique identifier for the quiz
      const quizIdentifier = "qti_export_" + generateUUID().substring(0, 7);

      // Create questions XML with all questions
      const questionsXML = generateQuestionsXML(quizData, quizIdentifier);

      // Create manifest XML
      const manifestXML = generateManifestXML(
        quizIdentifier,
        quizData.title,
        quizData.description
      );

      // Create assessment meta XML
      const assessmentMetaXML = generateAssessmentMetaXML(
        quizIdentifier,
        quizData.title,
        quizData.description,
        quizData.questions.length
      );

      // Add manifest at root level
      zip.file("imsmanifest.xml", manifestXML);

      // Create folder for quiz files
      const quizFolder = zip.folder(quizIdentifier);

      // Add assessment meta file
      quizFolder.file("assessment_meta.xml", assessmentMetaXML);

      // Add questions file
      quizFolder.file("questions.xml", questionsXML);

      // Generate zip file
      const blob = await zip.generateAsync({ type: "blob" });

      // Create a downloadable file
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Ensure filename has .zip extension but don't add it if it already has _qti suffix
      if (!filename.toLowerCase().endsWith(".zip")) {
        filename = filename + ".zip";
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccessMessage("Quiz exported successfully as QTI ZIP file!");
    } catch (error) {
      console.error("Error exporting quiz:", error);
      alert(
        "Failed to export quiz. Please make sure all questions are properly filled out."
      );
    }
  }

  // Creates the XML manifest with quiz metadata in IMS format
  function generateManifestXML(quizId, title, description) {
    try {
      const safeTitle = escapeXML(title);
      const safeDescription = escapeXML(description);
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

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
          <imsmd:dateTime>${today}</imsmd:dateTime>
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
      console.error("Error generating manifest XML:", error);
      throw error;
    }
  }

  // Creates the assessment metadata XML with quiz settings and configuration
  function generateAssessmentMetaXML(
    quizId,
    title,
    description,
    questionCount
  ) {
    try {
      const safeTitle = escapeXML(title);
      const safeDescription = escapeXML(description);
      const pointsPossible = questionCount.toFixed(1); // One decimal place

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
<assignment identifier="itembank_assignment_t_${quizId.substring(
        quizId.indexOf("_") + 1
      )}">
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
</assignment>
</quiz>`;

      return xml;
    } catch (error) {
      console.error("Error generating assessment meta XML:", error);
      throw error;
    }
  }

  // Function to generate complete questions XML
  function generateQuestionsXML(quizData, quizId) {
    const safeTitle = escapeXML(quizData.title);

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
    quizData.questions.forEach((question) => {
      xml += "\n    " + generateQuestionXML(question);
    });

    xml += `
  </section>
</assessment>
</questestinterop>`;

    return xml;
  }
  // Collects and organizes all quiz data into a structured object
  function collectQuizData() {
    try {
      const questionEntries =
        questionsContainer.querySelectorAll(".question-entry");
      const quizData = {
        title: document.getElementById("quiz-title").value || "Untitled Quiz",
        description: document.getElementById("quiz-description")
          ? document.getElementById("quiz-description").value
          : "",
        questions: [],
      };

      questionEntries.forEach((entry, index) => {
        const questionType = entry
          .querySelector(".question-type")
          .textContent.trim();
        const questionText = entry.querySelector("textarea").value.trim();
        const questionData = {
          id: `q${index + 1}`,
          type: questionType,
          text: questionText,
          options: [],
        };

        // Process Multiple Choice questions
        if (questionType === "Multiple Choice") {
          const optionEntries = entry.querySelectorAll(".option-entry");

          if (optionEntries.length === 0) {
            console.warn(`Question ${index + 1} has no options.`);
          } else {
            optionEntries.forEach((optionEntry, optIndex) => {
              const optionText = optionEntry
                .querySelector('input[type="text"]')
                .value.trim();
              const isCorrect = optionEntry.querySelector(
                'input[type="radio"]'
              ).checked;
              if (optionText) {
                questionData.options.push({
                  id: `q${index + 1}_opt${optIndex + 1}`,
                  text: optionText,
                  isCorrect: isCorrect,
                });
              }
            });

            // Set default correct answer if none selected
            if (!questionData.options.some((opt) => opt.isCorrect)) {
              if (questionData.options.length > 0) {
                console.warn(
                  `Question ${
                    index + 1
                  } has no correct answer selected. Marking the first option as correct.`
                );
                questionData.options[0].isCorrect = true;
              }
            }
          }
        }
        // Process Multiple Answer questions
        else if (questionType === "Multiple Answer") {
          const answerEntries = entry.querySelectorAll(".answer-entry");
          answerEntries.forEach((answerEntry, ansIndex) => {
            const answerText = answerEntry
              .querySelector('input[type="text"]')
              .value.trim();
            const isCorrect = answerEntry.querySelector(
              'input[type="checkbox"]'
            ).checked;
            if (answerText) {
              questionData.options.push({
                id: `q${index + 1}_ans${ansIndex + 1}`,
                text: answerText,
                isCorrect: isCorrect,
              });
            }
          });
        }
        // Process Fill In The Blank questions
        else if (questionType === "Fill In The Blank") {
          const answerEntries = entry.querySelectorAll(".answer-entry");
          answerEntries.forEach((answerEntry, ansIndex) => {
            const answerText = answerEntry
              .querySelector('input[type="text"]')
              .value.trim();
            if (answerText) {
              questionData.options.push({
                id: `q${index + 1}_ans${ansIndex + 1}`,
                text: answerText,
                isCorrect: true,
              });
            }
          });

          // Process alternate answers
          const alternateAnswersContainer = entry.querySelector(
            ".alternate-answers-container"
          );
          const alternateAnswerEntries =
            alternateAnswersContainer.querySelectorAll(".answer-entry");
          alternateAnswerEntries.forEach((altAnswerEntry, altAnsIndex) => {
            const altAnswerText = altAnswerEntry
              .querySelector('input[type="text"]')
              .value.trim();
            if (altAnswerText) {
              questionData.options.push({
                id: `q${index + 1}_alt${altAnsIndex + 1}`,
                text: altAnswerText,
                isCorrect: true,
              });
            }
          });
        }
        // Process True Or False questions
        else if (questionType === "True Or False") {
          const trueOption = entry.querySelector('input[value="true"]');
          const falseOption = entry.querySelector('input[value="false"]');
          const fillBlankCheckbox = entry.querySelector(".fill-blank-checkbox");

          questionData.isFillInTheBlank =
            fillBlankCheckbox && fillBlankCheckbox.checked;

          questionData.options.push({
            id: `q${index + 1}_true`,
            text: "True",
            isCorrect: trueOption && trueOption.checked,
          });

          questionData.options.push({
            id: `q${index + 1}_false`,
            text: "False",
            isCorrect: falseOption && falseOption.checked,
          });
        }
        // Process Essay questions
        else if (questionType === "Essay") {
          questionData.options.push({
            id: `q${index + 1}_essay`,
            text: "Essay response",
            isCorrect: false,
          });
        }

        quizData.questions.push(questionData);
      });

      return quizData;
    } catch (error) {
      console.error("Error collecting quiz data:", error);
      return { title: "Error Quiz", description: "", questions: [] };
    }
  }

  // Function to generate QTI XML from quiz data
  function generateQTIXML(quizData) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>';
    xml +=
      '<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">';
    xml +=
      '<assessment title="' +
      escapeXML(quizData.title) +
      '" ident="' +
      generateUUID() +
      '">';
    xml +=
      "<qtimetadata><qtimetadatafield><fieldlabel>qmd_description</fieldlabel><fieldentry>" +
      escapeXML(quizData.description) +
      "</fieldentry></qtimetadatafield></qtimetadata>";
    xml += '<section ident="section1">';

    quizData.questions.forEach((question) => {
      xml += generateQuestionXML(question);
    });

    xml += "</section>";
    xml += "</assessment>";
    xml += "</questestinterop>";

    return xml;
  }

  // Function to generate XML for a specific question
  function generateQuestionXML(question) {
    let xml = "";

    if (question.type === "Multiple Choice") {
      xml +=
        '<item ident="' +
        question.id +
        '" title="' +
        escapeXML(question.text) +
        '">';
      xml +=
        "<itemmetadata><qtimetadata><qtimetadatafield><fieldlabel>question_type</fieldlabel><fieldentry>multiple_choice_question</fieldentry></qtimetadatafield></qtimetadata></itemmetadata>";
      xml +=
        '<presentation><material><mattext texttype="text/html">' +
        escapeXML(question.text) +
        "</mattext></material>";
      xml +=
        '<response_lid ident="response1" rcardinality="Single"><render_choice>';

      question.options.forEach((option) => {
        xml +=
          '<response_label ident="' +
          option.id +
          '"><material><mattext texttype="text/html">' +
          escapeXML(option.text) +
          "</mattext></material></response_label>";
      });

      xml += "</render_choice></response_lid></presentation>";
      xml +=
        '<resprocessing><outcomes><decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/></outcomes>';

      question.options.forEach((option) => {
        xml += "<respcondition>";
        if (option.isCorrect) {
          xml +=
            '<conditionvar><varequal respident="response1">' +
            option.id +
            "</varequal></conditionvar>";
          xml += '<setvar action="Set" varname="SCORE">100</setvar>';
        } else {
          xml +=
            '<conditionvar><not><varequal respident="response1">' +
            option.id +
            "</varequal></not></conditionvar>";
          xml += '<setvar action="Set" varname="SCORE">0</setvar>';
        }
        xml += "</respcondition>";
      });

      xml += "</resprocessing></item>";
    } else if (question.type === "Multiple Answer") {
      xml +=
        '<item ident="' +
        question.id +
        '" title="' +
        escapeXML(question.text) +
        '">';
      xml +=
        "<itemmetadata><qtimetadata><qtimetadatafield><fieldlabel>question_type</fieldlabel><fieldentry>multiple_answers_question</fieldentry></qtimetadatafield></qtimetadata></itemmetadata>";
      xml +=
        '<presentation><material><mattext texttype="text/html">' +
        escapeXML(question.text) +
        "</mattext></material>";
      xml +=
        '<response_lid ident="response1" rcardinality="Multiple"><render_choice>';

      question.options.forEach((option) => {
        xml +=
          '<response_label ident="' +
          option.id +
          '"><material><mattext texttype="text/html">' +
          escapeXML(option.text) +
          "</mattext></material></response_label>";
      });

      xml += "</render_choice></response_lid></presentation>";
      xml +=
        '<resprocessing><outcomes><decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/></outcomes>';

      // Count the number of correct answers for point calculation
      const correctOptionsCount = question.options.filter(
        (opt) => opt.isCorrect
      ).length;
      const pointsPerCorrectAnswer =
        correctOptionsCount > 0 ? (100 / correctOptionsCount).toFixed(2) : 0;

      // Use a single respcondition with and/or logic for proper scoring
      xml += "<respcondition>";
      xml += "<conditionvar>";

      // Create logical conditions for scoring
      if (correctOptionsCount > 0) {
        // Start with an <and> tag to ensure all conditions must be met
        xml += "<and>";

        // All correct options must be selected
        question.options.forEach((option) => {
          if (option.isCorrect) {
            xml +=
              '<varequal respident="response1">' + option.id + "</varequal>";
          } else {
            xml +=
              '<not><varequal respident="response1">' +
              option.id +
              "</varequal></not>";
          }
        });

        xml += "</and>";
      }

      xml += "</conditionvar>";
      xml += '<setvar action="Set" varname="SCORE">100</setvar>';
      xml += "</respcondition>";

      // Add partial credit for partially correct answers
      const correctOptions = question.options.filter((opt) => opt.isCorrect);
      correctOptions.forEach((option) => {
        xml += "<respcondition>";
        xml += "<conditionvar>";
        xml += '<varequal respident="response1">' + option.id + "</varequal>";
        xml += "</conditionvar>";
        xml +=
          '<setvar action="Add" varname="SCORE">' +
          pointsPerCorrectAnswer +
          "</setvar>";
        xml += "</respcondition>";
      });

      // Penalize for incorrect selections
      const incorrectOptions = question.options.filter((opt) => !opt.isCorrect);
      incorrectOptions.forEach((option) => {
        xml += "<respcondition>";
        xml += "<conditionvar>";
        xml += '<varequal respident="response1">' + option.id + "</varequal>";
        xml += "</conditionvar>";
        xml +=
          '<setvar action="Add" varname="SCORE">-' +
          pointsPerCorrectAnswer +
          "</setvar>";
        xml += "</respcondition>";
      });

      xml += "</resprocessing></item>";
    } else if (question.type === "Fill In The Blank") {
      xml +=
        '<item ident="' +
        question.id +
        '" title="' +
        escapeXML(question.text) +
        '">';
      xml +=
        "<itemmetadata><qtimetadata><qtimetadatafield><fieldlabel>question_type</fieldlabel><fieldentry>fill_in_multiple_blanks_question</fieldentry></qtimetadatafield></qtimetadata></itemmetadata>";
      xml +=
        '<presentation><material><mattext texttype="text/html">' +
        escapeXML(question.text) +
        "</mattext></material>";
      xml +=
        '<response_str ident="response1" rcardinality="Single"><render_fib>';
      xml +=
        '<response_label ident="answer1"><material><mattext texttype="text/html">Fill in the blank</mattext></material></response_label>';
      xml += "</render_fib></response_str></presentation>";
      xml +=
        '<resprocessing><outcomes><decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/></outcomes>';

      // For fill in the blank, any of the provided answers is acceptable
      xml += "<respcondition>";
      xml += "<conditionvar>";

      question.options.forEach((option) => {
        xml +=
          '<varequal respident="response1">' +
          escapeXML(option.text) +
          "</varequal>";
      });

      xml += "</conditionvar>";
      xml += '<setvar action="Set" varname="SCORE">100</setvar>';
      xml += "</respcondition>";

      xml += "</resprocessing></item>";
    } else if (question.type === "True Or False") {
      xml +=
        '<item ident="' +
        question.id +
        '" title="' +
        escapeXML(question.text) +
        '">';

      // Check if this is a fill-in-the-blank style true/false question
      if (question.isFillInTheBlank) {
        // Use the fill-in-the-blank question type
        xml +=
          "<itemmetadata><qtimetadata><qtimetadatafield><fieldlabel>question_type</fieldlabel><fieldentry>true_false_question</fieldentry></qtimetadatafield>";
        xml +=
          "<qtimetadatafield><fieldlabel>is_fill_in_the_blank</fieldlabel><fieldentry>true</fieldentry></qtimetadatafield></qtimetadata></itemmetadata>";
      } else {
        // Use the standard true/false question type
        xml +=
          "<itemmetadata><qtimetadata><qtimetadatafield><fieldlabel>question_type</fieldlabel><fieldentry>true_false_question</fieldentry></qtimetadatafield></qtimetadata></itemmetadata>";
      }

      xml +=
        '<presentation><material><mattext texttype="text/html">' +
        escapeXML(question.text) +
        "</mattext></material>";
      xml +=
        '<response_lid ident="response1" rcardinality="Single"><render_choice>';

      // Add True and False options
      xml +=
        '<response_label ident="' +
        question.id +
        '_true"><material><mattext texttype="text/html">True</mattext></material></response_label>';
      xml +=
        '<response_label ident="' +
        question.id +
        '_false"><material><mattext texttype="text/html">False</mattext></material></response_label>';

      xml += "</render_choice></response_lid></presentation>";
      xml +=
        '<resprocessing><outcomes><decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/></outcomes>';

      // Determine which option is correct
      const correctOption = question.options.find((opt) => opt.isCorrect);
      const correctValue = correctOption ? correctOption.text : "True"; // Default to True if not found

      xml += "<respcondition>";
      xml += "<conditionvar>";
      xml +=
        '<varequal respident="response1">' +
        question.id +
        "_" +
        correctValue.toLowerCase() +
        "</varequal>";
      xml += "</conditionvar>";
      xml += '<setvar action="Set" varname="SCORE">100</setvar>';
      xml += "</respcondition>";

      xml += "</resprocessing></item>";
    } else if (question.type === "Essay") {
      xml +=
        '<item ident="' +
        question.id +
        '" title="' +
        escapeXML(question.text) +
        '">';
      xml +=
        "<itemmetadata><qtimetadata><qtimetadatafield><fieldlabel>question_type</fieldlabel><fieldentry>essay_question</fieldentry></qtimetadatafield></qtimetadata></itemmetadata>";
      xml +=
        '<presentation><material><mattext texttype="text/html">' +
        escapeXML(question.text) +
        "</mattext></material>";
      xml +=
        '<response_str ident="response1" rcardinality="Single"><render_fib>';
      xml +=
        '<response_label ident="answer1"><material><mattext texttype="text/html">Essay response</mattext></material></response_label>';
      xml += "</render_fib></response_str></presentation>";
      xml += "</item>";
    }

    return xml;
  }

  // Function to show success message
  function showSuccessMessage(message) {
    successText.textContent = message;
    successMessage.classList.add("show");
    setTimeout(() => {
      successMessage.classList.remove("show");
    }, 3000);
  }

  // Helper function to escape XML special characters
  function escapeXML(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  // Helper function to generate UUID
  function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  // Get the HTML template for a specific question type
  function getQuestionTemplate(type, radioGroupId) {
    const templates = {
      "multiple-choice": `
                <textarea placeholder="Enter your question here..."></textarea>
                <div class="options-container">
                    <div class="option-entry">
                        <input type="radio" name="${radioGroupId}" id="option1-${generateUUID()}">
                        <label></label>
                        <input type="text" placeholder="Option 1">
                        <button type="button" class="remove-option-btn"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="option-entry">
                        <input type="radio" name="${radioGroupId}" id="option2-${generateUUID()}">
                        <label></label>
                        <input type="text" placeholder="Option 2">
                        <button type="button" class="remove-option-btn"><i class="fas fa-times"></i></button>
                    </div>
                    <button type="button" class="add-option-btn">+ Add Answer Option</button>
                </div>
            `,
      "multiple-answer": `
                <textarea placeholder="Enter your question here..."></textarea>
                <div class="options-container">
                    <div class="answer-entry">
                        <input type="checkbox" id="answer1-${generateUUID()}">
                        <label></label>
                        <input type="text" placeholder="Answer 1">
                    </div>
                    <button type="button" class="add-answer-btn">+ Add Answer Option</button>
                </div>
            `,
      "true-or-false": `
                <textarea placeholder="Enter your question here..."></textarea>
                <div class="options-container">
                    <div class="option-entry">
                        <input type="radio" name="${radioGroupId}" id="true-${generateUUID()}" value="true">
                        <label></label>
                        <span>True</span>
                    </div>
                    <div class="option-entry">
                        <input type="radio" name="${radioGroupId}" id="false-${generateUUID()}" value="false">
                        <label></label>
                        <span>False</span>
                    </div>
<div class="fill-blank-option">
    ${(function () {
      // Return an empty string instead of the checkbox and label
      return "";
    })()}
</div>
                </div>
            `,
      "fill-in-the-blank": `
                <textarea placeholder="Enter your question here (underscores ___ are optional)..."></textarea>
                <div class="options-container">
                    <div class="answer-entry">
                        <input type="text" placeholder="Correct Answer">
                    </div>
                    <div class="alternate-answers">
                        <p class="alt-answers-label">Alternative Answers (Optional):</p>
                        <div class="alternate-answers-container">
                        </div>
                    </div>
                    <button type="button" class="add-alternate-answer-btn">+ Add Alternate Answer</button>
                </div>
            `,
      essay: `
                <textarea placeholder="Enter your question here..."></textarea>
                <div class="essay-input">
                </div>
            `,
    };

    return templates[type] || "";
  }

  // Format question type for display
  function formatQuestionType(type) {
    const typeMap = {
      "multiple-choice": "Multiple Choice",
      "multiple-answer": "Multiple Answer",
      "true-or-false": "True Or False",
      "fill-in-the-blank": "Fill In The Blank",
      essay: "Essay",
    };

    return (
      typeMap[type] ||
      type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, " ")
    );
  }
});
