/* =========================================================
 * Bootstrap data hydration and state definition
 * ========================================================= */
const bootstrap = window.__ARCADE_BOOTSTRAP__ || {};
const settings = bootstrap.settings || {};
const theme = bootstrap.theme || {};
const employees = Array.isArray(bootstrap.employees) ? bootstrap.employees : [];
const LOCAL_STORAGE_KEY = 'company-arcade-employee';

/* =========================================================
 * DOM references for reusable UI regions
 * ========================================================= */
const screens = {
  intro: document.getElementById('screen-intro'),
  select: document.getElementById('screen-select'),
  game: document.getElementById('screen-game'),
  leaderboard: document.getElementById('screen-leaderboard'),
};
const employeeGrid = document.getElementById('employee-grid');
const confirmEmployeeBtn = document.getElementById('confirm-employee');
const backBtn = document.getElementById('back-to-intro');
const startSelectBtn = document.getElementById('start-select');
const playAgainBtn = document.getElementById('play-again');
const statusIndicator = document.getElementById('status-indicator');
const gameTitle = document.getElementById('game-title');
const gameProgress = document.getElementById('game-progress');
const currentScoreDisplay = document.getElementById('current-score');
const gameContainer = document.getElementById('game-container');
const finalPlayerLabel = document.getElementById('final-player');
const finalScoreLabel = document.getElementById('final-score');
const leaderboardList = document.getElementById('leaderboard-list');

/* =========================================================
 * Runtime mutable state tracking
 * ========================================================= */
let selectedEmployee = null;
let totalScore = 0;
let currentGameIndex = 0;

/* =========================================================
 * Utility helpers for view transitions and theme binding
 * ========================================================= */
const setScreen = (key) => {
  Object.values(screens).forEach((screen) => screen.classList.remove('is-active'));
  if (screens[key]) {
    screens[key].classList.add('is-active');
  }
};

const applyTheme = () => {
  Object.entries(theme).forEach(([name, value]) => {
    document.documentElement.style.setProperty(`--color-${name}`, value);
  });
};

const formatDate = () => new Date().toISOString().split('T')[0];

const updateStatus = (message, accent = false) => {
  statusIndicator.textContent = message;
  statusIndicator.style.background = accent ? 'rgba(255, 51, 102, 0.15)' : 'rgba(0, 255, 198, 0.1)';
  statusIndicator.style.color = accent ? 'var(--color-secondary)' : 'var(--color-accent)';
};

/* =========================================================
 * Employee selection rendering and persistence
 * ========================================================= */
const renderEmployees = () => {
  employeeGrid.innerHTML = '';
  employees.forEach((employee) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'employee-card';
    card.setAttribute('data-id', employee.id);

    const avatar = document.createElement('div');
    avatar.className = 'employee-avatar';
    if (employee.avatar) {
      const img = document.createElement('img');
      img.src = employee.avatar;
      img.alt = `${employee.name} avatar`;
      avatar.appendChild(img);
    } else {
      avatar.textContent = employee.name.charAt(0).toUpperCase();
    }

    const nameLabel = document.createElement('span');
    nameLabel.textContent = employee.name;

    card.appendChild(avatar);
    card.appendChild(nameLabel);

    card.addEventListener('click', () => {
      document.querySelectorAll('.employee-card').forEach((el) => el.classList.remove('is-selected'));
      card.classList.add('is-selected');
      selectedEmployee = employee;
      confirmEmployeeBtn.disabled = false;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(employee));
    });

    employeeGrid.appendChild(card);
  });
};

const hydrateEmployeeFromStorage = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
    if (stored && stored.id) {
      const existing = employees.find((emp) => emp.id === stored.id);
      if (existing) {
        selectedEmployee = existing;
      }
    }
  } catch (error) {
    console.error('Failed to parse stored employee', error);
  }
};

/* =========================================================
 * Leaderboard rendering helpers
 * ========================================================= */
const renderLeaderboard = (scores) => {
  leaderboardList.innerHTML = '';
  scores
    .slice()
    .sort((a, b) => b.score - a.score)
    .forEach((entry, index) => {
      const item = document.createElement('li');
      item.className = 'leaderboard-entry';
      item.innerHTML = `
        <span class="text-accent">#${index + 1}</span>
        <span>${entry.playerName}</span>
        <span>${entry.score}</span>
      `;
      leaderboardList.appendChild(item);
    });
};

const loadLeaderboard = async () => {
  try {
    const response = await fetch('php/load_scores.php');
    if (!response.ok) throw new Error('Unable to load scores');
    const payload = await response.json();
    renderLeaderboard(Array.isArray(payload.scores) ? payload.scores : []);
  } catch (error) {
    updateStatus('Leaderboard unavailable', true);
  }
};

/* =========================================================
 * Game flow management and dynamic module loading
 * ========================================================= */
const loadGameModule = async (gameKey) => {
  const cacheBuster = `v=${settings.version || Date.now()}`;
  const module = await import(`../games/${gameKey}.js?${cacheBuster}`);
  if (!module.startGame) {
    throw new Error(`Game module ${gameKey} missing startGame export`);
  }
  return module.startGame;
};

const runGame = async (gameKey, position, totalGames) => {
  gameTitle.textContent = `Playing: ${gameKey.toUpperCase()}`;
  gameProgress.textContent = `Game ${position}/${totalGames}`;
  updateStatus('Competing...', false);

  gameContainer.innerHTML = '';

  const startGame = await loadGameModule(gameKey);

  return new Promise((resolve) => {
    const cleanup = startGame({
      container: gameContainer,
      theme,
      onComplete: (score) => {
        totalScore += Number.isFinite(score) ? score : 0;
        currentScoreDisplay.textContent = `Score: ${totalScore}`;
        if (typeof cleanup === 'function') {
          cleanup();
        }
        resolve();
      },
    });
  });
};

const runGameSequence = async () => {
  const order = Array.isArray(settings.gameOrder) ? settings.gameOrder : [];
  totalScore = 0;
  currentGameIndex = 0;
  currentScoreDisplay.textContent = 'Score: 0';

  for (const gameKey of order) {
    currentGameIndex += 1;
    // eslint-disable-next-line no-await-in-loop
    await runGame(gameKey, currentGameIndex, order.length);
  }

  await finalizeScore();
};

/* =========================================================
 * Score saving lifecycle and leaderboard refresh
 * ========================================================= */
const finalizeScore = async () => {
  if (!selectedEmployee) return;
  updateStatus('Saving score...', false);
  const payload = {
    playerId: selectedEmployee.id,
    playerName: selectedEmployee.name,
    score: totalScore,
    date: formatDate(),
  };

  try {
    const response = await fetch('php/save_score.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Save failed');
    await response.json();
    updateStatus('Score saved!', false);
  } catch (error) {
    console.error(error);
    updateStatus('Save failed', true);
  }

  finalPlayerLabel.textContent = `Player: ${selectedEmployee.name}`;
  finalScoreLabel.textContent = `Total Score: ${totalScore}`;
  await loadLeaderboard();
  setScreen('leaderboard');
};

/* =========================================================
 * Event wiring for navigation and flow triggers
 * ========================================================= */
startSelectBtn.addEventListener('click', () => {
  renderEmployees();
  setScreen('select');
  updateStatus('Choose your challenger', false);

  if (selectedEmployee) {
    const preselected = employeeGrid.querySelector(`[data-id="${selectedEmployee.id}"]`);
    if (preselected) {
      preselected.classList.add('is-selected');
      confirmEmployeeBtn.disabled = false;
    }
  }
});

backBtn.addEventListener('click', () => {
  setScreen('intro');
  updateStatus('Ready', false);
});

confirmEmployeeBtn.addEventListener('click', () => {
  if (!selectedEmployee) return;
  setScreen('game');
  updateStatus('Get set...', false);
  runGameSequence();
});

playAgainBtn.addEventListener('click', () => {
  setScreen('intro');
  updateStatus('Ready', false);
});

/* =========================================================
 * Initial bootstrap execution flow
 * ========================================================= */
const init = () => {
  applyTheme();
  hydrateEmployeeFromStorage();
  if (selectedEmployee) {
    statusIndicator.textContent = `Ready - ${selectedEmployee.name}`;
  }
  loadLeaderboard();
};

init();
