/* =========================================================
 * Orbital Sprint – Three.js powered asteroid dodging challenge
 * Spaceship maneuvers through a dense asteroid field for 45 seconds
 * ========================================================= */
import { loadThree } from './utils/three-loader.js';

export function startGame({ container, onComplete, theme }) {
  // Runtime guards ensuring the module only resolves once.
  let isActive = true;
  let animationFrame = null;
  let renderer = null;
  let resizeObserver = null;
  const teardownCallbacks = [];

  // Overlay UI communicates timer and score without relying on canvas text rendering.
  const overlay = document.createElement('div');
  overlay.className = 'three-game-overlay';
  overlay.innerHTML = `
    <div class="three-game-overlay__title">Orbital Sprint</div>
    <div class="three-game-overlay__meta">
      <span data-role="timer">45.0s</span>
      <span data-role="score">Score 0</span>
    </div>
    <p class="three-game-overlay__hint">Move your cursor or finger to steer the ship – survive without crashing.</p>
  `;
  container.appendChild(overlay);

  const timerLabel = overlay.querySelector('[data-role="timer"]');
  const scoreLabel = overlay.querySelector('[data-role="score"]');

  const finishGame = (finalScore, message = 'Mission complete. Tap “Start Example” to play again.') => {
    if (!isActive) return;
    isActive = false;
    cancelAnimationFrame(animationFrame);
    teardownCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error('Orbital Sprint cleanup failed', error);
      }
    });
    if (renderer && renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
    overlay.classList.add('three-game-overlay--complete');
    if (message) {
      overlay.querySelector('.three-game-overlay__hint').textContent = message;
    }
    scoreLabel.textContent = `Score ${Math.max(0, Math.round(finalScore))}`;
    onComplete(Math.max(0, Math.round(finalScore)));
  };

  const setup = async () => {
    try {
      const THREE = await loadThree();
      if (!isActive) return;

      // Core Three.js scene bootstrap.
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(theme?.bg || '#05070f');
      scene.fog = new THREE.Fog(theme?.bg || '#05070f', 6, 30);

      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 50);
      camera.position.set(0, 1.5, 8);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.domElement.className = 'three-game-canvas';
      container.appendChild(renderer.domElement);

      // Lighting setup for a neon sci-fi aesthetic.
      const ambient = new THREE.AmbientLight(theme?.text || '#ffffff', 0.6);
      const keyLight = new THREE.PointLight(theme?.accent || '#00ffc6', 1.2, 40);
      keyLight.position.set(5, 5, 10);
      const fillLight = new THREE.PointLight(theme?.secondary || '#ff3366', 0.6, 35);
      fillLight.position.set(-6, -2, 8);
      scene.add(ambient, keyLight, fillLight);

      // Spacecraft geometry with emissive accent to stand out.
      const shipGeometry = new THREE.ConeGeometry(0.6, 2.2, 16);
      const shipMaterial = new THREE.MeshStandardMaterial({
        color: theme?.accent || '#00ffc6',
        emissive: new THREE.Color(theme?.accent || '#00ffc6').multiplyScalar(0.3),
        metalness: 0.4,
        roughness: 0.3,
      });
      const ship = new THREE.Mesh(shipGeometry, shipMaterial);
      ship.rotation.x = Math.PI / 2;
      ship.position.set(0, 0, 4);
      scene.add(ship);

      // Star field background provides depth cues while flying forward.
      const starGeometry = new THREE.BufferGeometry();
      const starCount = 700;
      const starPositions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i += 1) {
        starPositions[i * 3] = (Math.random() - 0.5) * 40;
        starPositions[i * 3 + 1] = (Math.random() - 0.5) * 30;
        starPositions[i * 3 + 2] = -Math.random() * 40;
      }
      starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      const starMaterial = new THREE.PointsMaterial({
        color: theme?.text || '#ffffff',
        size: 0.05,
        transparent: true,
        opacity: 0.9,
      });
      const stars = new THREE.Points(starGeometry, starMaterial);
      scene.add(stars);

      // Container for asteroids – re-used meshes keep GC pressure minimal.
      const asteroids = [];
      const asteroidGeometry = new THREE.IcosahedronGeometry(0.7, 1);
      const asteroidMaterial = new THREE.MeshStandardMaterial({
        color: theme?.secondary || '#ff3366',
        metalness: 0.2,
        roughness: 0.6,
      });

      const spawnAsteroid = () => {
        const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial.clone());
        asteroid.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6, -30 - Math.random() * 20);
        asteroid.userData = {
          speed: 0.18 + Math.random() * 0.12,
          rotation: new THREE.Vector3(Math.random() * 0.02, Math.random() * 0.02, Math.random() * 0.02),
        };
        scene.add(asteroid);
        asteroids.push(asteroid);
      };

      for (let i = 0; i < 12; i += 1) {
        spawnAsteroid();
      }

      // Pointer input keeps the controls intuitive on both desktop and touch.
      const pointerTarget = new THREE.Vector3(0, 0, ship.position.z);
      const handlePointerMove = (event) => {
        const rect = container.getBoundingClientRect();
        const normalizedX = (event.clientX - rect.left) / rect.width;
        const normalizedY = (event.clientY - rect.top) / rect.height;
        pointerTarget.x = (normalizedX - 0.5) * 8;
        pointerTarget.y = (0.5 - normalizedY) * 4;
      };

      container.addEventListener('pointermove', handlePointerMove);
      container.addEventListener('touchstart', handlePointerMove);
      container.addEventListener('pointerdown', handlePointerMove);
      teardownCallbacks.push(() => {
        container.removeEventListener('pointermove', handlePointerMove);
        container.removeEventListener('touchstart', handlePointerMove);
        container.removeEventListener('pointerdown', handlePointerMove);
      });

      const handleResize = () => {
        const { clientWidth, clientHeight } = container;
        const aspect = clientWidth / clientHeight;
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
        renderer.setSize(clientWidth, clientHeight);
      };

      handleResize();
      window.addEventListener('resize', handleResize);
      teardownCallbacks.push(() => window.removeEventListener('resize', handleResize));

      if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);
        teardownCallbacks.push(() => {
          if (resizeObserver) resizeObserver.disconnect();
        });
      }

      // Game state trackers.
      let elapsed = 0;
      const duration = 45000; // 45 seconds challenge
      let dodged = 0;
      let lastSpawn = 0;

      const loop = (timestamp) => {
        if (!isActive) return;
        if (!elapsed) {
          elapsed = timestamp;
          lastSpawn = timestamp;
        }

        const elapsedSeconds = (timestamp - elapsed) / 1000;
        const remaining = Math.max(0, duration - (timestamp - elapsed));
        timerLabel.textContent = `${(remaining / 1000).toFixed(1)}s`;

        // Gentle parallax for the star field.
        stars.rotation.z += 0.0008;

        ship.position.lerp(pointerTarget, 0.12);
        ship.rotation.z = ship.position.x * -0.08;
        ship.rotation.y = ship.position.x * 0.03;

        for (let i = asteroids.length - 1; i >= 0; i -= 1) {
          const asteroid = asteroids[i];
          asteroid.position.z += asteroid.userData.speed * (1 + elapsedSeconds * 0.05);
          asteroid.rotation.x += asteroid.userData.rotation.x;
          asteroid.rotation.y += asteroid.userData.rotation.y;
          asteroid.rotation.z += asteroid.userData.rotation.z;

          if (asteroid.position.z > camera.position.z + 2) {
            dodged += 1;
            asteroid.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6, -30 - Math.random() * 20);
          }

          const distance = asteroid.position.distanceTo(ship.position);
          if (distance < 1.1) {
            finishGame(dodged * 25 + elapsedSeconds * 10, 'Hull breach detected. Dodge faster to survive the sprint.');
            return;
          }
        }

        const liveScore = dodged * 25 + elapsedSeconds * 10;
        scoreLabel.textContent = `Score ${Math.round(liveScore)}`;

        if (timestamp - lastSpawn > 1200 && asteroids.length < 24) {
          lastSpawn = timestamp;
          spawnAsteroid();
        }

        renderer.render(scene, camera);

        if (timestamp - elapsed >= duration) {
          finishGame(liveScore + dodged * 10 + duration / 25);
          return;
        }

        animationFrame = requestAnimationFrame(loop);
      };

      animationFrame = requestAnimationFrame(loop);
    } catch (error) {
      console.error('Orbital Sprint failed to initialize', error);
      timerLabel.textContent = 'Error';
      finishGame(0, 'Unable to load 3D engine. Please check your connection.');
    }
  };

  setup();

  return () => {
    if (!isActive) return;
    finishGame(0, 'Session aborted. Relaunch when you are ready.');
    if (overlay.parentElement === container) {
      container.removeChild(overlay);
    }
  };
}
