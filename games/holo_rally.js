/* =========================================================
 * Holo Rally – Futuristic ring run with hovercraft controls in 3D
 * Players glide through energy gates to accumulate combo-driven points
 * ========================================================= */
import { loadThree } from './utils/three-loader.js';

export function startGame({ container, onComplete, theme }) {
  // Guard rails to avoid duplicate completion events.
  let isRunning = true;
  let animationFrame = null;
  let renderer = null;
  let resizeObserver = null;
  const cleanupTasks = [];

  // Overlay HUD keeps the experience readable regardless of canvas resolution.
  const overlay = document.createElement('div');
  overlay.className = 'three-game-overlay';
  overlay.innerHTML = `
    <div class="three-game-overlay__title">Holo Rally</div>
    <div class="three-game-overlay__meta">
      <span data-role="timer">60.0s</span>
      <span data-role="score">Score 0</span>
    </div>
    <p class="three-game-overlay__hint">Drift left and right to center the hovercraft within each glowing gate.</p>
  `;
  container.appendChild(overlay);

  const timerLabel = overlay.querySelector('[data-role="timer"]');
  const scoreLabel = overlay.querySelector('[data-role="score"]');

  const teardown = (finalScore, message = 'Race finished. Re-launch to chase a better combo.') => {
    if (!isRunning) return;
    isRunning = false;
    cancelAnimationFrame(animationFrame);
    cleanupTasks.forEach((task) => {
      try {
        task();
      } catch (error) {
        console.error('Holo Rally cleanup issue', error);
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

  const init = async () => {
    try {
      const THREE = await loadThree();
      if (!isRunning) return;

      // Core WebGL scaffolding.
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(theme?.bg || '#060816');
      scene.fog = new THREE.Fog(theme?.bg || '#060816', 8, 40);

      const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 80);
      camera.position.set(0, 2.6, 6);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.domElement.className = 'three-game-canvas';
      container.appendChild(renderer.domElement);

      // Glow strip lights emphasize the speed of the rally track.
      const ambient = new THREE.AmbientLight(theme?.text || '#ffffff', 0.5);
      const backlight = new THREE.PointLight(theme?.accent || '#00ffc6', 1.2, 60);
      backlight.position.set(0, 10, -15);
      const sidelight = new THREE.PointLight(theme?.secondary || '#ff3366', 0.8, 60);
      sidelight.position.set(-6, 4, 10);
      scene.add(ambient, backlight, sidelight);

      // Hovercraft body combines multiple primitives for a premium silhouette.
      const craftGroup = new THREE.Group();
      const hullGeometry = new THREE.CylinderGeometry(0.4, 0.8, 1.2, 24, 1, true);
      const hullMaterial = new THREE.MeshStandardMaterial({
        color: theme?.accent || '#00ffc6',
        emissive: new THREE.Color(theme?.accent || '#00ffc6').multiplyScalar(0.25),
        metalness: 0.7,
        roughness: 0.2,
      });
      const hull = new THREE.Mesh(hullGeometry, hullMaterial);
      hull.rotation.x = Math.PI / 2;
      craftGroup.add(hull);

      const canopyGeometry = new THREE.SphereGeometry(0.45, 24, 16, 0, Math.PI);
      const canopyMaterial = new THREE.MeshStandardMaterial({
        color: theme?.text || '#ffffff',
        emissive: new THREE.Color(theme?.text || '#ffffff').multiplyScalar(0.15),
        transparent: true,
        opacity: 0.8,
      });
      const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
      canopy.position.set(0, 0.25, 0.05);
      craftGroup.add(canopy);

      craftGroup.position.set(0, 0, 2);
      scene.add(craftGroup);

      // Track surface uses grid helpers to provide forward motion cues.
      const track = new THREE.GridHelper(20, 20, theme?.accent || '#00ffc6', theme?.accent || '#00ffc6');
      track.rotation.x = Math.PI / 2;
      track.position.y = -1.2;
      scene.add(track);

      // Energy rings arranged ahead of the player to create a flow of targets.
      const ringMaterial = new THREE.MeshStandardMaterial({
        color: theme?.secondary || '#ff3366',
        emissive: new THREE.Color(theme?.secondary || '#ff3366').multiplyScalar(0.5),
        metalness: 0.4,
        roughness: 0.3,
      });
      const rings = [];
      const ringCount = 9;
      for (let i = 0; i < ringCount; i += 1) {
        const ringGeometry = new THREE.TorusGeometry(1.6, 0.1, 12, 48);
        const ring = new THREE.Mesh(ringGeometry, ringMaterial.clone());
        ring.position.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 2, -i * 6 - 8);
        ring.userData = { passed: false };
        scene.add(ring);
        rings.push(ring);
      }

      // Input response with smooth lerping for premium feel.
      const pointerTarget = new THREE.Vector3(0, 0, craftGroup.position.z);
      const handlePointerMove = (event) => {
        const rect = container.getBoundingClientRect();
        const normalizedX = (event.clientX - rect.left) / rect.width;
        pointerTarget.x = (normalizedX - 0.5) * 6.5;
      };

      container.addEventListener('pointermove', handlePointerMove);
      container.addEventListener('touchstart', handlePointerMove);
      container.addEventListener('pointerdown', handlePointerMove);
      cleanupTasks.push(() => {
        container.removeEventListener('pointermove', handlePointerMove);
        container.removeEventListener('touchstart', handlePointerMove);
        container.removeEventListener('pointerdown', handlePointerMove);
      });

      const handleResize = () => {
        const { clientWidth, clientHeight } = container;
        camera.aspect = clientWidth / clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(clientWidth, clientHeight);
      };

      handleResize();
      window.addEventListener('resize', handleResize);
      cleanupTasks.push(() => window.removeEventListener('resize', handleResize));

      if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);
        cleanupTasks.push(() => {
          if (resizeObserver) resizeObserver.disconnect();
        });
      }

      // Game state variables controlling pacing and scoring.
      const duration = 60000;
      let startTimestamp = 0;
      let distance = 0;
      let score = 0;
      let combo = 1;

      const animate = (timestamp) => {
        if (!isRunning) return;
        if (!startTimestamp) {
          startTimestamp = timestamp;
        }

        const elapsed = timestamp - startTimestamp;
        const remaining = Math.max(0, duration - elapsed);
        timerLabel.textContent = `${(remaining / 1000).toFixed(1)}s`;

        // Movement scaling increases over time for escalating difficulty.
        const speed = 0.025 + elapsed / 240000;
        distance += speed * 5;
        track.position.z = (elapsed * speed * -2) % 6;

        craftGroup.position.x += (pointerTarget.x - craftGroup.position.x) * 0.1;
        craftGroup.rotation.z = craftGroup.position.x * -0.08;

        rings.forEach((ring) => {
          ring.position.z += speed * 12;
          ring.rotation.x += 0.01;
          ring.rotation.y += 0.02;

          if (ring.position.z > camera.position.z + 2) {
            ring.position.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 2, -50 - Math.random() * 12);
            ring.userData.passed = false;
          }

          if (!ring.userData.passed && ring.position.z > craftGroup.position.z - 0.5 && ring.position.z < craftGroup.position.z + 0.5) {
            const proximity = Math.abs(ring.position.x - craftGroup.position.x);
            const precision = Math.max(0, 1.8 - proximity);
            if (precision > 0.6) {
              combo = Math.min(5, combo + 0.2);
              score += 40 * combo * precision;
              ring.userData.passed = true;
            } else {
              combo = 1;
              ring.userData.passed = true;
            }
          }
        });

        const liveScore = score + distance * 4;
        scoreLabel.textContent = `Score ${Math.round(liveScore)}`;

        renderer.render(scene, camera);

        if (remaining <= 0) {
          teardown(liveScore + distance * 2);
          return;
        }

        animationFrame = requestAnimationFrame(animate);
      };

      animationFrame = requestAnimationFrame(animate);
    } catch (error) {
      console.error('Holo Rally failed to initialize', error);
      timerLabel.textContent = 'Error';
      teardown(0, 'Unable to start the rally. Check your connection and retry.');
    }
  };

  init();

  return () => {
    if (!isRunning) return;
    teardown(0, 'Session aborted. Reload when you are ready to race.');
    if (overlay.parentElement === container) {
      container.removeChild(overlay);
    }
  };
}
