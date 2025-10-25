/* =========================================================
 * Interactive hub for launching standard game examples
 * Provides a documented scenario for every game so QA can test without the full arcade flow
 * ========================================================= */
const exampleList = document.getElementById('example-list');
const stageTitle = document.getElementById('stage-title');
const stageDescription = document.getElementById('stage-description');
const stageInstructions = document.getElementById('stage-instructions');
const stageStatus = document.getElementById('stage-status');
const stageLaunch = document.getElementById('stage-launch');
const stageOutcome = document.getElementById('stage-outcome');
const stageContainer = document.getElementById('stage-container');

/* =========================================================
 * Static definition for each example including description and quick tips
 * ========================================================= */
const GAME_EXAMPLES = [
  {
    key: 'quiz',
    title: 'Quiz Clash – KPI Trivia',
    tag: 'Knowledge',
    description: 'Answer five KPI-inspired questions. Each correct response grants 10 points.',
    instructions: [
      'Use the mouse or tap to select the answer.',
      'You only get one attempt per question – no going back.',
      'A perfect round nets 50 points and finishes in about a minute.',
    ],
  },
  {
    key: 'jump',
    title: 'Jump Rush – Endless Runner',
    tag: 'Reflex',
    description: 'Leap over oncoming blocks. Survive as long as possible to rack up points.',
    instructions: [
      'Press Space or tap/click the canvas to jump.',
      'Landing resets the jump, so time your leaps carefully.',
      'Each cleared obstacle awards 10 points – collisions end the run.',
    ],
  },
  {
    key: 'reaction',
    title: 'Quick Tap – Reaction Tester',
    tag: 'Timing',
    description: 'React when the pad turns neon green. The final score is the average over five rounds.',
    instructions: [
      'Tap/click only when the pad says “Tap!”.',
      'Early taps show a warning but let you continue the round.',
      'Faster reactions yield higher points – aim above 80.',
    ],
  },
  {
    key: 'driver',
    title: 'Speed Driver – Neon Highway',
    tag: 'Agility',
    description: 'Weave between traffic for as long as possible. Distance covered converts into score.',
    instructions: [
      'Use the arrow keys or drag on touch devices to steer left/right.',
      'Avoid incoming cars – one collision ends the demo.',
      'Every avoided car boosts the score, so stay in motion.',
    ],
  },
  {
    key: 'escape',
    title: 'Escape Grid – Labyrinth',
    tag: 'Puzzle',
    description: 'Navigate the 6×6 grid and reach the exit before the timer hits zero.',
    instructions: [
      'Control movement with arrow keys or swipe gestures.',
      'Remaining time is multiplied for bonus points at the end.',
      'Crossing the EXIT tile awards an extra 100 points.',
    ],
  },
];

/* =========================================================
 * Theme bootstrapping with graceful fallback to defaults
 * ========================================================= */
const defaultTheme = {
  primary: '#1b1b2f',
  accent: '#00ffc6',
  secondary: '#ff3366',
  bg: '#0d0d17',
  text: '#ffffff',
};

let activeTheme = { ...defaultTheme };

const hydrateTheme = async () => {
  try {
    const response = await fetch('../../data/settings.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Theme request failed');
    const payload = await response.json();
    if (payload?.theme) {
      activeTheme = { ...defaultTheme, ...payload.theme };
    }
  } catch (error) {
    console.warn('Falling back to default theme for examples', error);
  }

  Object.entries(activeTheme).forEach(([token, value]) => {
    document.documentElement.style.setProperty(`--color-${token}`, value);
  });
};

/* =========================================================
 * Shared helpers for UI feedback and card rendering
 * ========================================================= */
let selectedExample = null;
let selectedCard = null;
let activeCleanup = null;

const setStatus = (message, isAlert = false) => {
  stageStatus.textContent = `Status: ${message}`;
  stageStatus.classList.toggle('is-alert', Boolean(isAlert));
};

const resetStage = () => {
  if (typeof activeCleanup === 'function') {
    activeCleanup();
    activeCleanup = null;
  }
  stageContainer.innerHTML = '';
  stageContainer.classList.remove('is-active');
  stageOutcome.textContent = '';
};

const renderExampleCards = () => {
  GAME_EXAMPLES.forEach((example) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'examples-card';
    card.setAttribute('data-key', example.key);
    card.innerHTML = `
      <span class="examples-tag">${example.tag}</span>
      <h3>${example.title}</h3>
      <p>${example.description}</p>
    `;

    card.addEventListener('click', () => {
      if (selectedCard) {
        selectedCard.classList.remove('is-active');
      }
      selectedCard = card;
      card.classList.add('is-active');
      selectedExample = example;
      stageTitle.textContent = example.title;
      stageDescription.textContent = example.description;
      stageInstructions.innerHTML = '';
      example.instructions.forEach((tip) => {
        const item = document.createElement('li');
        item.textContent = tip;
        stageInstructions.appendChild(item);
      });
      stageLaunch.disabled = false;
      setStatus('Ready to launch');
      stageOutcome.textContent = '';
    });

    exampleList.appendChild(card);
  });
};

/* =========================================================
 * Runtime execution: dynamically load the module and start the demo
 * ========================================================= */
const launchExample = async () => {
  if (!selectedExample) {
    setStatus('Select a game first', true);
    return;
  }

  resetStage();
  setStatus('Loading module…');
  stageLaunch.disabled = true;

  try {
    const module = await import(`../${selectedExample.key}.js?v=${Date.now()}`);
    if (typeof module.startGame !== 'function') {
      throw new Error('Invalid module export');
    }

    stageContainer.classList.add('is-active');
    setStatus('In progress');

    activeCleanup = module.startGame({
      container: stageContainer,
      theme: activeTheme,
      onComplete: (score) => {
        const safeScore = Number.isFinite(score) ? score : 0;
        stageOutcome.textContent = `Finished example with a score of ${safeScore}`;
        setStatus('Completed');
        stageLaunch.disabled = false;
      },
    });
  } catch (error) {
    console.error('Failed to launch example', error);
    setStatus('Failed to start', true);
    stageOutcome.textContent = 'Could not launch the selected game. Check the console for details.';
    stageLaunch.disabled = false;
  }
};

/* =========================================================
 * Wire up interactions and kick off bootstrapping
 * ========================================================= */
stageLaunch.addEventListener('click', launchExample);
window.addEventListener('beforeunload', resetStage);

renderExampleCards();
hydrateTheme();

