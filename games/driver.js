/* =========================================================
 * Speed Driver mini-game module
 * Top-down avoidance game with smooth keyboard and touch support
 * ========================================================= */
export function startGame({ container, onComplete, theme }) {
  // Canvas setup for the neon highway aesthetic.
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 320;
  canvas.className = 'driver-canvas';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // Player and obstacle definitions.
  const player = { x: canvas.width / 2 - 20, y: canvas.height - 80, width: 40, height: 60, speed: 6 };
  const obstacles = [];
  let frame = 0;
  let score = 0;
  let running = true;
  let animationId = null;
  const keys = { left: false, right: false };

  // Input binding for keyboard interactions.
  const keyDown = (event) => {
    if (event.code === 'ArrowLeft') keys.left = true;
    if (event.code === 'ArrowRight') keys.right = true;
  };
  const keyUp = (event) => {
    if (event.code === 'ArrowLeft') keys.left = false;
    if (event.code === 'ArrowRight') keys.right = false;
  };

  // Pointer handler allows dragging left/right on touch devices.
  const pointerMove = (event) => {
    const rect = canvas.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    player.x = relativeX - player.width / 2;
  };

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('pointermove', pointerMove);

  // Helper to spawn rectangular traffic blocks.
  const spawnObstacle = () => {
    const laneWidth = canvas.width / 4;
    const lane = Math.floor(Math.random() * 4);
    obstacles.push({ x: lane * laneWidth + laneWidth / 2 - 25, y: -70, width: 50, height: 70, speed: 4 + Math.random() * 2 });
  };

  // Collision detection helper.
  const collides = (a, b) =>
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

  // Primary render loop drawing the animated road.
  const loop = () => {
    animationId = requestAnimationFrame(loop);
    if (!running) return;

    ctx.fillStyle = theme?.bg || '#0d0d17';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw center lane markers for motion impression.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 16]);
    ctx.lineDashOffset = -frame * 8;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    // Update player position based on input state.
    if (keys.left) player.x -= player.speed;
    if (keys.right) player.x += player.speed;
    player.x = Math.max(10, Math.min(canvas.width - player.width - 10, player.x));

    ctx.fillStyle = theme?.accent || '#00ffc6';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    frame += 1;
    if (frame % 50 === 0) {
      spawnObstacle();
    }

    for (let i = obstacles.length - 1; i >= 0; i -= 1) {
      const obstacle = obstacles[i];
      obstacle.y += obstacle.speed + frame / 600;
      ctx.fillStyle = theme?.secondary || '#ff3366';
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

      if (collides(player, obstacle)) {
        running = false;
        cleanup();
        onComplete(Math.round(score));
        return;
      }

      if (obstacle.y > canvas.height + 80) {
        obstacles.splice(i, 1);
        score += 12;
      }
    }

    ctx.fillStyle = theme?.text || '#ffffff';
    ctx.font = '16px Rubik';
    ctx.fillText(`Score ${Math.round(score)}`, 16, 24);

    score += 0.6;
  };

  // Cleanup routine unregisters listeners and animation when finished.
  const cleanup = () => {
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
    canvas.removeEventListener('pointermove', pointerMove);
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  };

  loop();
  return cleanup;
}
