/* =========================================================
 * Escape Grid mini-game module
 * Navigate a 6x6 grid to reach the exit before the timer expires
 * ========================================================= */
export function startGame({ container, onComplete, theme }) {
  // Grid configuration and initial player position.
  const gridSize = 6;
  const totalCells = gridSize * gridSize;
  const exitIndex = totalCells - 1;
  let playerIndex = 0;
  let remainingTime = 45;
  let timerId = null;

  // Build the grid layout using simple div elements for performance.
  const wrapper = document.createElement('div');
  wrapper.className = 'escape-wrapper';
  wrapper.innerHTML = `
    <div class="escape-hud">
      <span class="escape-timer">Time: <strong>${remainingTime}</strong>s</span>
      <span class="escape-instruction">Use arrows or swipe</span>
    </div>
    <div class="escape-grid"></div>
  `;

  container.appendChild(wrapper);
  const timerEl = wrapper.querySelector('.escape-timer strong');
  const gridEl = wrapper.querySelector('.escape-grid');

  const cells = [];
  for (let i = 0; i < totalCells; i += 1) {
    const cell = document.createElement('div');
    cell.className = 'escape-cell';
    if (i === exitIndex) {
      cell.classList.add('escape-exit');
      cell.textContent = 'EXIT';
    }
    gridEl.appendChild(cell);
    cells.push(cell);
  }

  // Helper to update cell highlighting for the player avatar.
  const drawPlayer = () => {
    cells.forEach((cell) => cell.classList.remove('escape-player'));
    cells[playerIndex].classList.add('escape-player');
  };

  drawPlayer();

  // Movement handler respects grid boundaries and triggers win condition.
  const movePlayer = (dx, dy) => {
    const row = Math.floor(playerIndex / gridSize);
    const col = playerIndex % gridSize;
    const newRow = row + dy;
    const newCol = col + dx;
    if (newRow < 0 || newCol < 0 || newRow >= gridSize || newCol >= gridSize) {
      return;
    }
    playerIndex = newRow * gridSize + newCol;
    drawPlayer();
    if (playerIndex === exitIndex) {
      finishGame();
    }
  };

  // Keyboard control wiring.
  const keyHandler = (event) => {
    switch (event.code) {
      case 'ArrowUp':
        event.preventDefault();
        movePlayer(0, -1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        movePlayer(0, 1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        movePlayer(-1, 0);
        break;
      case 'ArrowRight':
        event.preventDefault();
        movePlayer(1, 0);
        break;
      default:
        break;
    }
  };

  window.addEventListener('keydown', keyHandler);

  // Touch control by measuring swipe direction.
  let touchStart = null;
  const touchStartHandler = (event) => {
    const touch = event.touches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
  };

  const touchEndHandler = (event) => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (Math.max(absX, absY) < 20) return;
    if (absX > absY) {
      movePlayer(dx > 0 ? 1 : -1, 0);
    } else {
      movePlayer(0, dy > 0 ? 1 : -1);
    }
    touchStart = null;
  };

  gridEl.addEventListener('touchstart', touchStartHandler);
  gridEl.addEventListener('touchend', touchEndHandler);

  // Countdown timer management awarding points for remaining seconds.
  const startTimer = () => {
    timerId = setInterval(() => {
      remainingTime -= 1;
      timerEl.textContent = remainingTime;
      if (remainingTime <= 0) {
        finishGame();
      }
    }, 1000);
  };

  const finishGame = () => {
    clearInterval(timerId);
    window.removeEventListener('keydown', keyHandler);
    gridEl.removeEventListener('touchstart', touchStartHandler);
    gridEl.removeEventListener('touchend', touchEndHandler);
    const finalScore = Math.max(0, remainingTime * 5 + (playerIndex === exitIndex ? 100 : 0));
    onComplete(finalScore);
  };

  startTimer();

  // Cleanup provides a way to cancel timers if the game is aborted.
  return () => {
    clearInterval(timerId);
    window.removeEventListener('keydown', keyHandler);
    gridEl.removeEventListener('touchstart', touchStartHandler);
    gridEl.removeEventListener('touchend', touchEndHandler);
  };
}
