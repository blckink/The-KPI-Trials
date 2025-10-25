/* =========================================================
 * Quick Tap mini-game module
 * Reaction timer challenge with five rounds and averaged score
 * ========================================================= */
export function startGame({ container, onComplete, theme }) {
  // Wrapper layout communicates state changes to the player.
  const wrapper = document.createElement('div');
  wrapper.className = 'reaction-wrapper';
  wrapper.innerHTML = `
    <div class="reaction-status">Tap when it turns green</div>
    <div class="reaction-pad">Wait for it...</div>
    <div class="reaction-progress">Round <span class="reaction-round">1</span>/5</div>
  `;

  container.appendChild(wrapper);
  const statusEl = wrapper.querySelector('.reaction-status');
  const padEl = wrapper.querySelector('.reaction-pad');
  const roundEl = wrapper.querySelector('.reaction-round');

  let awaitingTap = false;
  let startTime = 0;
  let currentRound = 0;
  const scores = [];
  let timeoutId = null;

  // Helper to schedule the next round with a random preparation delay.
  const queueRound = () => {
    padEl.textContent = 'Wait for it...';
    padEl.style.background = 'rgba(255, 255, 255, 0.05)';
    awaitingTap = false;
    timeoutId = setTimeout(() => {
      awaitingTap = true;
      startTime = performance.now();
      padEl.textContent = 'Tap!';
      padEl.style.background = theme?.accent || '#00ffc6';
      statusEl.textContent = 'Go! Go! Go!';
    }, 800 + Math.random() * 1500);
  };

  // Handle tap interactions while guarding against early clicks.
  const handleTap = () => {
    if (!awaitingTap) {
      statusEl.textContent = 'Too soon! Try again.';
      return;
    }
    const reactionTime = performance.now() - startTime;
    const roundScore = Math.max(0, Math.round(100 - reactionTime / 10));
    scores.push(roundScore);
    currentRound += 1;

    statusEl.textContent = `Reaction: ${Math.round(reactionTime)}ms (+${roundScore})`;
    padEl.textContent = 'Nice!';
    padEl.style.background = theme?.secondary || '#ff3366';

    if (currentRound >= 5) {
      padEl.removeEventListener('pointerdown', handleTap);
      const finalScore = Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
      onComplete(finalScore);
    } else {
      roundEl.textContent = String(currentRound + 1);
      clearTimeout(timeoutId);
      setTimeout(queueRound, 600);
    }
  };

  padEl.addEventListener('pointerdown', handleTap);
  queueRound();

  // Cleanup ensures timers and listeners are cleared when the game exits early.
  return () => {
    clearTimeout(timeoutId);
    padEl.removeEventListener('pointerdown', handleTap);
  };
}
