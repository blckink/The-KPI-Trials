/* =========================================================
 * Jump Rush mini-game module
 * Endless runner style jumping game with obstacle avoidance
 * ========================================================= */
export function startGame({ container, onComplete, theme }) {
  // Canvas setup for the minimalist runner experience.
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 260;
  canvas.className = 'runner-canvas';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // Core player and obstacle state definitions.
  const player = { x: 60, y: canvas.height - 60, width: 36, height: 48, velocityY: 0, jumping: false };
  const gravity = 0.9;
  const jumpForce = -15;
  const obstacles = [];
  let spawnTimer = 0;
  let score = 0;
  let animationId = null;

  // Utility helper to spawn simple rectangular obstacles.
  const spawnObstacle = () => {
    obstacles.push({ x: canvas.width + Math.random() * 120, width: 30 + Math.random() * 20, height: 40 + Math.random() * 20 });
  };

  // Input handlers for both keyboard and touch interactions.
  const handleJump = () => {
    if (!player.jumping) {
      player.velocityY = jumpForce;
      player.jumping = true;
    }
  };

  const keyHandler = (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
      handleJump();
    }
  };

  const touchHandler = (event) => {
    event.preventDefault();
    handleJump();
  };

  window.addEventListener('keydown', keyHandler);
  canvas.addEventListener('pointerdown', touchHandler);

  // Cleanup routine removes listeners and cancels animation.
  const cleanup = () => {
    window.removeEventListener('keydown', keyHandler);
    canvas.removeEventListener('pointerdown', touchHandler);
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  };

  // Main animation loop controlling physics and drawing.
  const loop = () => {
    animationId = requestAnimationFrame(loop);
    ctx.fillStyle = theme?.bg || '#0d0d17';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    player.y += player.velocityY;
    player.velocityY += gravity;

    if (player.y >= canvas.height - player.height - 12) {
      player.y = canvas.height - player.height - 12;
      player.velocityY = 0;
      player.jumping = false;
    }

    ctx.fillStyle = theme?.accent || '#00ffc6';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    spawnTimer += 1;
    if (spawnTimer > 80) {
      spawnObstacle();
      spawnTimer = 0;
    }

    for (let i = obstacles.length - 1; i >= 0; i -= 1) {
      const obstacle = obstacles[i];
      obstacle.x -= 6;
      ctx.fillStyle = theme?.secondary || '#ff3366';
      ctx.fillRect(obstacle.x, canvas.height - obstacle.height - 12, obstacle.width, obstacle.height);

      if (obstacle.x + obstacle.width < 0) {
        obstacles.splice(i, 1);
        score += 10;
      }

      const playerBottom = player.y + player.height;
      const obstacleTop = canvas.height - obstacle.height - 12;
      if (
        player.x < obstacle.x + obstacle.width &&
        player.x + player.width > obstacle.x &&
        playerBottom > obstacleTop &&
        player.y < canvas.height
      ) {
        cleanup();
        onComplete(score);
        return;
      }
    }

    ctx.fillStyle = theme?.text || '#ffffff';
    ctx.font = '16px Rubik';
    ctx.fillText(`Score ${score}`, 20, 30);
  };

  loop();
  return cleanup;
}
