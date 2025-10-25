/* =========================================================
 * Void Vault – Metroidvania-inspired neon platformer
 * Single-stage adventure with collectibles, checkpoints, and smooth controls
 * ========================================================= */
export function startGame({ container, onComplete, theme }) {
  // Canvas bootstrap with a cinematic aspect ratio for the side-scrolling level.
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 420;
  canvas.className = 'void-vault-canvas';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // HUD overlay keeps the player informed about relics, time, and stability.
  const hud = document.createElement('div');
  hud.className = 'void-vault-hud';
  hud.innerHTML = `
    <div class="void-vault-hud__title">Void Vault</div>
    <div class="void-vault-hud__stats">
      <span data-role="relics">Relics 0/0</span>
      <span data-role="time">Time 0.0s</span>
      <span data-role="stability">Stability 3</span>
    </div>
    <p class="void-vault-hud__hint">Use A/D or the arrow keys to move, tap Space to jump. You have one mid-air jump – collect all relics to open the exit.</p>
  `;
  container.appendChild(hud);

  // Touch-first controls for mobile players – glowing buttons that mirror keyboard input.
  const controlPad = document.createElement('div');
  controlPad.className = 'void-vault-controls';
  controlPad.innerHTML = `
    <button type="button" data-control="left" aria-label="Move Left">◀</button>
    <button type="button" data-control="jump" aria-label="Jump">⤒</button>
    <button type="button" data-control="right" aria-label="Move Right">▶</button>
  `;
  container.appendChild(controlPad);

  const relicLabel = hud.querySelector('[data-role="relics"]');
  const timeLabel = hud.querySelector('[data-role="time"]');
  const stabilityLabel = hud.querySelector('[data-role="stability"]');
  const hintLabel = hud.querySelector('.void-vault-hud__hint');

  // Level composition made of reusable rectangles to simplify collision handling.
  const world = {
    width: 2400,
    height: 720,
    gravity: 1600,
    friction: 0.86,
  };

  // Platform catalogue describing all solid surfaces in the level.
  const platforms = [
    { x: 0, y: 600, width: world.width, height: 120 },
    { x: 120, y: 520, width: 220, height: 20 },
    { x: 420, y: 470, width: 160, height: 22 },
    { x: 640, y: 420, width: 200, height: 22 },
    { x: 940, y: 360, width: 180, height: 20 },
    { x: 1200, y: 310, width: 140, height: 20 },
    { x: 1200, y: 520, width: 260, height: 22 },
    { x: 1560, y: 470, width: 200, height: 22 },
    { x: 1840, y: 410, width: 200, height: 20 },
    { x: 2080, y: 340, width: 160, height: 20 },
    { x: 2080, y: 530, width: 220, height: 24 },
    { x: 1780, y: 560, width: 180, height: 20 },
    { x: 880, y: 540, width: 160, height: 20 },
    { x: 520, y: 320, width: 140, height: 20 },
    { x: 1540, y: 360, width: 140, height: 20 },
    { x: 980, y: 260, width: 120, height: 18 },
  ];

  // Hazardous energy spikes penalise reckless jumping.
  const hazards = [
    { x: 350, y: 600, width: 80, height: 40 },
    { x: 760, y: 600, width: 120, height: 40 },
    { x: 1420, y: 600, width: 160, height: 40 },
    { x: 1880, y: 600, width: 120, height: 40 },
    { x: 2200, y: 600, width: 120, height: 40 },
  ];

  // Collectible relics – glowing shards hidden across the vault.
  const collectibles = [
    { x: 170, y: 460, collected: false },
    { x: 500, y: 270, collected: false },
    { x: 690, y: 370, collected: false },
    { x: 980, y: 200, collected: false },
    { x: 1250, y: 470, collected: false },
    { x: 1600, y: 320, collected: false },
    { x: 1960, y: 360, collected: false },
    { x: 2140, y: 280, collected: false },
  ];

  // Checkpoints convert into respawn anchors once visited.
  const checkpoints = [
    { x: 420, y: 420, radius: 30, activated: false },
    { x: 1320, y: 460, radius: 30, activated: false },
    { x: 2050, y: 300, radius: 30, activated: false },
  ];

  // Exit gate unlocks once every relic has been collected.
  const exitGate = { x: 2260, y: 270, width: 80, height: 140 };

  const totalRelics = collectibles.length;
  relicLabel.textContent = `Relics 0/${totalRelics}`;

  // Player avatar with momentum-based movement for a floaty sci-fi feel.
  const player = {
    width: 38,
    height: 56,
    x: 80,
    y: 520,
    vx: 0,
    vy: 0,
    speed: 420,
    jump: 670,
    onGround: false,
    canDouble: true,
    jumpQueued: false,
  };

  let collectedCount = 0;
  let stability = 3;
  let isRunning = true;
  let animationId = null;
  let lastTime = null;
  let elapsed = 0;
  let cameraX = 0;
  let score = 0;

  let respawnPoint = { x: player.x, y: player.y };

  // Helper primitives shared across collision and rendering routines.
  const intersects = (a, b) =>
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const disposeListeners = () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    container.removeEventListener('pointerdown', onPointerDown);
    container.removeEventListener('pointerup', onPointerUp);
    container.removeEventListener('pointerleave', onPointerUp);
    container.removeEventListener('pointermove', onPointerMove);
    controlPad.querySelectorAll('button').forEach((button) => {
      button.removeEventListener('pointerdown', onControlPress);
      button.removeEventListener('pointerup', onControlRelease);
      button.removeEventListener('pointerleave', onControlRelease);
    });
  };

  const completeRun = ({ aborted = false, outOfStability = false } = {}) => {
    if (!isRunning && !aborted) return;

    if (animationId) cancelAnimationFrame(animationId);
    animationId = null;

    disposeListeners();

    if (aborted) {
      isRunning = false;
      hintLabel.textContent = 'Expedition aborted – return to the console to relaunch.';
      onComplete(0);
      return;
    }

    if (!isRunning) return;
    isRunning = false;

    const finalScore = outOfStability
      ? Math.max(0, Math.round(score * 0.35))
      : Math.max(0, Math.round(score));
    hintLabel.textContent = outOfStability
      ? 'Systems overheated before extraction. Try again for a perfect run.'
      : 'Vault cleared! Tap “Start Example” to replay the expedition.';
    onComplete(finalScore);
  };

  const resetPlayer = () => {
    stability -= 1;
    stabilityLabel.textContent = `Stability ${Math.max(0, stability)}`;
    player.x = respawnPoint.x;
    player.y = respawnPoint.y;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.canDouble = true;
    hintLabel.textContent = stability > 0
      ? 'Watch the spikes! Stability drops when you fall. Collect every relic to open the exit.'
      : 'Critical failure avoided. Finish the vault run to transmit your score.';
    if (stability <= 0) {
      completeRun({ outOfStability: true });
    }
  };

  const activateCheckpoint = (checkpoint) => {
    if (!checkpoint.activated) {
      checkpoint.activated = true;
      respawnPoint = { x: checkpoint.x, y: checkpoint.y - 40 };
      hintLabel.textContent = 'Checkpoint synced – push deeper into the vault.';
    }
  };

  // Keyboard input mapping mirrors classic platformers.
  const inputState = {
    left: false,
    right: false,
  };
  const keyboardState = {
    left: false,
    right: false,
  };

  const pointerState = { active: false, x: 0, direction: null };

  const syncMovementState = () => {
    const pointerLeft = pointerState.direction === 'left';
    const pointerRight = pointerState.direction === 'right';
    inputState.left = keyboardState.left || (pointerLeft && !keyboardState.right);
    inputState.right = keyboardState.right || (pointerRight && !keyboardState.left);
  };

  // Prevent the browser from stealing focus with arrow key scrolling while mapping input to the avatar.
  const onKeyDown = (event) => {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
      event.preventDefault();
      keyboardState.left = true;
      syncMovementState();
    }
    if (event.code === 'ArrowRight' || event.code === 'KeyD') {
      event.preventDefault();
      keyboardState.right = true;
      syncMovementState();
    }
    if (event.code === 'ArrowUp' || event.code === 'KeyW' || event.code === 'Space') {
      event.preventDefault();
      player.jumpQueued = true;
    }
  };

  // Matching keyup guard keeps momentum control responsive after we suppress default behaviour.
  const onKeyUp = (event) => {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
      event.preventDefault();
      keyboardState.left = false;
      syncMovementState();
    }
    if (event.code === 'ArrowRight' || event.code === 'KeyD') {
      event.preventDefault();
      keyboardState.right = false;
      syncMovementState();
    }
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // Pointer-based controls split the canvas into zones for accessibility.
  const onPointerDown = (event) => {
    pointerState.active = true;
    pointerState.x = event.clientX;
    const rect = canvas.getBoundingClientRect();
    const relativeY = (event.clientY - rect.top) / rect.height;
    if (relativeY < 0.45) {
      player.jumpQueued = true;
    }
    updateInputFromPointer();
  };

  const onPointerMove = (event) => {
    if (!pointerState.active) return;
    pointerState.x = event.clientX;
    updateInputFromPointer();
  };

  const onPointerUp = () => {
    pointerState.active = false;
    pointerState.direction = null;
    syncMovementState();
  };

  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointerup', onPointerUp);
  container.addEventListener('pointerleave', onPointerUp);
  container.addEventListener('pointermove', onPointerMove);

  const onControlPress = (event) => {
    event.preventDefault();
    const control = event.currentTarget.dataset.control;
    if (control === 'left') {
      pointerState.active = true;
      pointerState.direction = 'left';
      syncMovementState();
    }
    if (control === 'right') {
      pointerState.active = true;
      pointerState.direction = 'right';
      syncMovementState();
    }
    if (control === 'jump') player.jumpQueued = true;
  };

  const onControlRelease = (event) => {
    event.preventDefault();
    const control = event.currentTarget.dataset.control;
    if (control === 'left' || control === 'right') {
      pointerState.active = false;
      pointerState.direction = null;
      syncMovementState();
    }
  };

  controlPad.querySelectorAll('button').forEach((button) => {
    button.addEventListener('pointerdown', onControlPress);
    button.addEventListener('pointerup', onControlRelease);
    button.addEventListener('pointerleave', onControlRelease);
  });

  // Jump resolver handles ground, double jump, and queued inputs from different devices.
  const resolveJump = () => {
    if (!player.jumpQueued) return;
    if (player.onGround) {
      player.vy = -player.jump;
      player.onGround = false;
      player.canDouble = true;
    } else if (player.canDouble) {
      player.vy = -player.jump * 0.8;
      player.canDouble = false;
    }
    player.jumpQueued = false;
  };

  const updateInputFromPointer = () => {
    if (!pointerState.active) {
      pointerState.direction = null;
      syncMovementState();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const relativeX = (pointerState.x - rect.left) / rect.width;
    if (relativeX < 0.4) {
      pointerState.direction = 'left';
    } else if (relativeX > 0.6) {
      pointerState.direction = 'right';
    } else {
      pointerState.direction = null;
    }
    syncMovementState();
  };

  const applyPhysics = (delta) => {
    resolveJump();
    updateInputFromPointer();

    const acceleration = player.speed * delta;
    if (inputState.left) player.vx -= acceleration;
    if (inputState.right) player.vx += acceleration;

    player.vx *= player.onGround ? world.friction : 0.98;
    player.vx = clamp(player.vx, -420, 420);

    player.vy += world.gravity * delta;
    player.vy = clamp(player.vy, -900, 980);

    const playerRect = { x: player.x, y: player.y, width: player.width, height: player.height };

    // Horizontal movement followed by collision resolution.
    playerRect.x += player.vx * delta;
    player.onGround = false;
    for (const platform of platforms) {
      if (intersects(playerRect, platform)) {
        if (player.vx > 0) {
          playerRect.x = platform.x - playerRect.width - 0.01;
        } else if (player.vx < 0) {
          playerRect.x = platform.x + platform.width + 0.01;
        }
        player.vx = 0;
      }
    }

    // Vertical movement and landing detection.
    playerRect.y += player.vy * delta;
    for (const platform of platforms) {
      if (intersects(playerRect, platform)) {
        if (player.vy > 0) {
          playerRect.y = platform.y - playerRect.height - 0.01;
          player.vy = 0;
          player.onGround = true;
          player.canDouble = true;
        } else if (player.vy < 0) {
          playerRect.y = platform.y + platform.height + 0.01;
          player.vy = 0;
        }
      }
    }

    player.x = playerRect.x;
    player.y = playerRect.y;

    // Clamp the avatar inside the level bounds.
    player.x = clamp(player.x, 0, world.width - player.width);
    if (player.y > world.height) {
      resetPlayer();
    }
  };

  const detectInteractions = () => {
    const playerRect = { x: player.x, y: player.y, width: player.width, height: player.height };

    for (const hazard of hazards) {
      if (intersects(playerRect, hazard)) {
        resetPlayer();
        return;
      }
    }

    for (const relic of collectibles) {
      if (!relic.collected) {
        const relicRect = { x: relic.x - 14, y: relic.y - 14, width: 28, height: 28 };
        if (intersects(playerRect, relicRect)) {
          relic.collected = true;
          collectedCount += 1;
          score += 280;
          relicLabel.textContent = `Relics ${collectedCount}/${totalRelics}`;
          hintLabel.textContent = collectedCount === totalRelics
            ? 'Exit unlocked! Reach the portal to transmit your run.'
            : 'Relic secured – energy signature rising.';
        }
      }
    }

    for (const checkpoint of checkpoints) {
      const dx = player.x + player.width / 2 - checkpoint.x;
      const dy = player.y + player.height / 2 - checkpoint.y;
      if (Math.hypot(dx, dy) < checkpoint.radius + 20) {
        activateCheckpoint(checkpoint);
      }
    }

    if (collectedCount === totalRelics && intersects(playerRect, exitGate)) {
      score += Math.max(0, 1000 - elapsed * 6);
      completeRun();
    }
  };

  const render = (delta) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    cameraX += ((player.x + player.width / 2) - cameraX - canvas.width / 2) * Math.min(1, delta * 6);
    cameraX = clamp(cameraX, 0, world.width - canvas.width);

    const parallax = cameraX * 0.4;

    // Backdrop gradient and animated starfield give depth.
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, theme?.bg || '#05060f');
    gradient.addColorStop(1, '#090b1c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-cameraX, 0);

    ctx.fillStyle = 'rgba(0, 255, 198, 0.12)';
    for (let i = 0; i < 80; i += 1) {
      const x = ((i * 180 + parallax) % world.width);
      const y = 60 + (i % 4) * 40;
      ctx.fillRect(x, y, 6, 6);
    }

    // Render solid geometry with neon edges.
    for (const platform of platforms) {
      ctx.fillStyle = 'rgba(18, 24, 48, 0.95)';
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.strokeStyle = 'rgba(0, 255, 198, 0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    }

    // Spike hazards drawn as shimmering prisms.
    for (const hazard of hazards) {
      ctx.fillStyle = 'rgba(255, 51, 102, 0.8)';
      ctx.beginPath();
      const spikes = 4;
      const spikeWidth = hazard.width / spikes;
      for (let i = 0; i < spikes; i += 1) {
        const baseX = hazard.x + i * spikeWidth;
        ctx.moveTo(baseX, hazard.y + hazard.height);
        ctx.lineTo(baseX + spikeWidth / 2, hazard.y);
        ctx.lineTo(baseX + spikeWidth, hazard.y + hazard.height);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 102, 153, 0.9)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Collectible shards glow with additive blending.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = theme?.accent || '#00ffc6';
    for (const relic of collectibles) {
      if (relic.collected) continue;
      ctx.beginPath();
      ctx.arc(relic.x, relic.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();

    // Checkpoint pylons pulsate once activated.
    for (const checkpoint of checkpoints) {
      ctx.beginPath();
      ctx.arc(checkpoint.x, checkpoint.y, checkpoint.radius, 0, Math.PI * 2);
      ctx.fillStyle = checkpoint.activated ? 'rgba(0, 255, 198, 0.28)' : 'rgba(0, 142, 255, 0.18)';
      ctx.fill();
      ctx.strokeStyle = checkpoint.activated ? theme?.accent || '#00ffc6' : '#008eff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Exit gate shimmer intensifies once unlocked.
    ctx.save();
    const gateUnlocked = collectedCount === totalRelics;
    ctx.fillStyle = gateUnlocked ? 'rgba(0, 255, 198, 0.22)' : 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(exitGate.x, exitGate.y, exitGate.width, exitGate.height);
    ctx.strokeStyle = gateUnlocked ? (theme?.accent || '#00ffc6') : 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 3;
    ctx.strokeRect(exitGate.x, exitGate.y, exitGate.width, exitGate.height);
    ctx.restore();

    // Hero render with thruster glow.
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.fillStyle = theme?.secondary || '#ff3366';
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
    ctx.fillStyle = theme?.accent || '#00ffc6';
    ctx.fillRect(-player.width / 2 + 6, player.height / 2 - 6, player.width - 12, 12);
    ctx.restore();

    ctx.restore();
  };

  const loop = (timestamp) => {
    if (!isRunning) return;
    if (lastTime === null) {
      lastTime = timestamp;
    }
    const delta = Math.min(0.05, (timestamp - lastTime) / 1000);
    lastTime = timestamp;

    elapsed += delta;
    timeLabel.textContent = `Time ${elapsed.toFixed(1)}s`;

    applyPhysics(delta);
    detectInteractions();
    render(delta);

    score += delta * 140 + (player.onGround ? 6 : 12);
    animationId = requestAnimationFrame(loop);
  };

  loop();

  return () => {
    if (isRunning) {
      completeRun({ aborted: true });
    } else {
      disposeListeners();
    }
    if (canvas.parentElement === container) container.removeChild(canvas);
    if (hud.parentElement === container) container.removeChild(hud);
    if (controlPad.parentElement === container) container.removeChild(controlPad);
  };
}
