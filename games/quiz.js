/* =========================================================
 * Quiz Clash mini-game module
 * Presents five random multiple-choice questions and scores
 * ========================================================= */
export function startGame({ container, onComplete }) {
  // Question bank kept inline for simplicity and easy customization.
  const questions = [
    {
      prompt: 'Which value represents a KPI?',
      answers: [
        { label: 'Customer Satisfaction', correct: true },
        { label: 'Office Plant Height', correct: false },
        { label: 'Coffee Temperature', correct: false },
      ],
    },
    {
      prompt: 'What does ROI stand for?',
      answers: [
        { label: 'Return on Investment', correct: true },
        { label: 'Rate of Innovation', correct: false },
        { label: 'Revenue on Insights', correct: false },
      ],
    },
    {
      prompt: 'Scrum meetings are typically called?',
      answers: [
        { label: 'Stand-ups', correct: true },
        { label: 'Sit-downs', correct: false },
        { label: 'Kick-offs', correct: false },
      ],
    },
    {
      prompt: 'Which file format do we use to store scores?',
      answers: [
        { label: 'JSON', correct: true },
        { label: 'XML', correct: false },
        { label: 'DOCX', correct: false },
      ],
    },
    {
      prompt: 'Which key is used to jump in most games?',
      answers: [
        { label: 'Spacebar', correct: true },
        { label: 'Escape', correct: false },
        { label: 'Caps Lock', correct: false },
      ],
    },
    {
      prompt: 'Which language powers the backend here?',
      answers: [
        { label: 'PHP', correct: true },
        { label: 'Ruby', correct: false },
        { label: 'Perl', correct: false },
      ],
    },
    {
      prompt: 'How many mini games are in the arcade?',
      answers: [
        { label: 'Five', correct: true },
        { label: 'Two', correct: false },
        { label: 'Seven', correct: false },
      ],
    },
  ];

  // Select a shuffled subset of five questions for this round.
  const selected = questions.sort(() => 0.5 - Math.random()).slice(0, 5);
  let currentIndex = 0;
  let score = 0;

  // Build the quiz layout dynamically so it inherits arcade styling.
  const wrapper = document.createElement('div');
  wrapper.className = 'quiz-wrapper';
  wrapper.innerHTML = `
    <div class="quiz-question"></div>
    <div class="quiz-answers"></div>
    <div class="quiz-progress">Question <span class="quiz-step">1</span>/5</div>
  `;

  const questionEl = wrapper.querySelector('.quiz-question');
  const answersEl = wrapper.querySelector('.quiz-answers');
  const stepEl = wrapper.querySelector('.quiz-step');

  container.appendChild(wrapper);

  // Render a single question and wire answer buttons.
  const renderQuestion = () => {
    const question = selected[currentIndex];
    questionEl.textContent = question.prompt;
    answersEl.innerHTML = '';
    question.answers.forEach((answer) => {
      const btn = document.createElement('button');
      btn.className = 'arcade-btn';
      btn.textContent = answer.label;
      btn.addEventListener('click', () => {
        if (answer.correct) {
          score += 10;
        }
        currentIndex += 1;
        if (currentIndex < selected.length) {
          stepEl.textContent = String(currentIndex + 1);
          renderQuestion();
        } else {
          onComplete(score);
        }
      });
      answersEl.appendChild(btn);
    });
  };

  renderQuestion();

  // Cleanup routine detaches listeners by clearing the container.
  return () => {
    container.innerHTML = '';
  };
}
