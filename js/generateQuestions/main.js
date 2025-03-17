document.addEventListener('DOMContentLoaded', function() {
    const questionTypeSelect = document.getElementById('question-type');
    const choicesContainer = document.getElementById('choices-container');
    const answersContainer = document.getElementById('answers-container');
    const generateQtiButton = document.getElementById('generate-qti');

    questionTypeSelect.addEventListener('change', function() {
        const selectedType = questionTypeSelect.value;
        if (selectedType === 'essay') {
            choicesContainer.style.display = 'none';
            answersContainer.style.display = 'none';
        } else {
            choicesContainer.style.display = 'block';
            answersContainer.style.display = 'block';
        }
    });

    generateQtiButton.addEventListener('click', function() {
        const selectedType = questionTypeSelect.value;
        const questionText = document.getElementById('question').value.trim();
        const choices = Array.from(document.querySelectorAll('#choices-container input[type="text"]')).map(input => input.value.trim());
        const selectedAnswers = Array.from(document.querySelectorAll('#answers-container input[type="checkbox"]:checked'));

        if (selectedType === 'multiple-choice' || selectedType === 'multiple-answer') {
            if (choices.length !== 4 || choices.some(choice => choice === '')) {
                alert('Please provide exactly 4 choices.');
                return;
            }

            if (selectedType === 'multiple-answer' && selectedAnswers.length === 0) {
                alert('Please select at least one correct answer.');
                return;
            }
        }

        if (questionText === '') {
            alert('Please enter a question.');
            return;
        }

        // Logic to generate QTI goes here
        alert('QTI generated successfully!');
    });
});
