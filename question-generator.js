document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('questionForm');
  const resultsDiv = document.getElementById('results');
  const questionsContainer = document.getElementById('questionsContainer');
  const generateBtn = document.getElementById('generateBtn');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const regenerateBtn = document.getElementById('regenerateBtn');
  const resultsTitle = document.getElementById('resultsTitle');

  // API base URL (adjust if deployed)
  const API_BASE = 'http://localhost:5000/api'; // Assume backend on 5000

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!form.checkValidity()) {
      e.stopPropagation();
      form.classList.add('was-validated');
      return;
    }

    const formData = {
      examType: document.getElementById('examType').value,
      difficulty: document.getElementById('difficulty').value,
      numQuestions: parseInt(document.getElementById('numQuestions').value)
    };

    generateBtn.disabled = true;
    loadingSpinner.classList.remove('d-none');
    
    try {
      // Get token from localStorage (assume set on login)
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login first (via dashboard)');
        window.location.href = 'login.html';
        return;
      }

      const response = await fetch(`${API_BASE}/ai/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        displayQuestions(data.questions, data.examType, data.difficulty);
        resultsDiv.style.display = 'block';
        resultsTitle.textContent = `${data.examType.toUpperCase()} - ${data.difficulty.toUpperCase()} (${data.questions.length} questions)`;
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error) {
      alert(`Error: ${error.message}. Ensure backend is running on port 5000 and you are logged in.`);
      console.error(error);
    } finally {
      generateBtn.disabled = false;
      loadingSpinner.classList.add('d-none');
    }
  });

  regenerateBtn.addEventListener('click', () => {
    form.dispatchEvent(new Event('submit'));
  });

  function displayQuestions(questions, examType, difficulty) {
    questionsContainer.innerHTML = '';
    
    questions.forEach((q, index) => {
      const questionDiv = document.createElement('div');
      questionDiv.className = 'question-card mb-4 p-4 border rounded shadow-sm';
      questionDiv.innerHTML = `
        <h6 class="mb-3"><i class="fas fa-question-circle text-primary"></i> Question ${index + 1}</h6>
        <p class="question-text fs-5 mb-3">${q.question}</p>
        <div class="options mb-3">
          ${q.options.map(opt => `<div class="form-check"><input class="form-check-input" type="radio" name="q${index}" id="q${index}_${opt.charAt(0)}" disabled><label class="form-check-label" for="q${index}_${opt.charAt(0)}">${opt}</label></div>`).join('')}
        </div>
        <div class="reveal-section">
          <button class="btn btn-outline-primary me-2 reveal-btn" data-bs-toggle="collapse" data-bs-target="#answer${index}">
            <i class="fas fa-eye"></i> Show Answer
          </button>
          <button class="btn btn-outline-success reveal-btn" data-bs-toggle="collapse" data-bs-target="#explain${index}">
            <i class="fas fa-lightbulb"></i> Explanation
          </button>
        </div>
        <div class="collapse mt-3" id="answer${index}">
          <div class="alert alert-success">
            <strong>Correct Answer:</strong> <span class="fw-bold">${q.correctAnswer}</span>
          </div>
        </div>
        <div class="collapse mt-2" id="explain${index}">
          <div class="alert alert-info">
            <strong>Explanation:</strong> ${q.explanation}
          </div>
        </div>
      `;
      questionsContainer.appendChild(questionDiv);
    });
  }
});
