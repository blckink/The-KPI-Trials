/* =========================================================
 * Track Velocity – Trackmania-inspired neon sprint
 * Time-limited hover racer with tubular track, gates, and combo scoring
 * ========================================================= */
import { loadThree } from './utils/three-loader.js';

export function startGame({ container, onComplete, theme }) {
  // Overlay surfaces vital race stats and access instructions.
  const overlay = document.createElement('div');
  overlay.className = 'three-game-overlay';
  overlay.innerHTML = `
    <div class="three-game-overlay__title">Track Velocity</div>
    <div class="three-game-overlay__meta">
      <span data-role="lap">Lap 1</span>
      <span data-role="timer">60.0s</span>
      <span data-role="combo">Combo x1</span>
      <span data-role="speed">Speed 0%</span>
      <span data-role="score">Score 0</span>
    </div>
    <p class="three-game-overlay__hint">Drag to steer across the lane, hold W/Up to boost, S/Down to brake. Cross gates centered for combo bonuses.</p>
  `;
  container.appendChild(overlay);

  const lapLabel = overlay.querySelector('[data-role="lap"]');
  const timerLabel = overlay.querySelector('[data-role="timer"]');
  const scoreLabel = overlay.querySelector('[data-role="score"]');
  const comboLabel = overlay.querySelector('[data-role="combo"]');
  const speedLabel = overlay.querySelector('[data-role="speed"]');
  // Hint label surfaces evolving race commentary so the track feels alive.
  const hintLabel = overlay.querySelector('.three-game-overlay__hint');
  comboLabel.textContent = 'Combo x1';
  speedLabel.textContent = 'Speed 0%';

  // Optional control widget to provide boost/brake buttons on touch devices.
  const controlPad = document.createElement('div');
  controlPad.className = 'track-velocity-controls';
  controlPad.innerHTML = `
    <button type="button" data-control="boost" aria-label="Boost">Boost</button>
    <button type="button" data-control="brake" aria-label="Brake">Brake</button>
  `;
  container.appendChild(controlPad);

  let renderer = null;
  let animationFrame = null;
  let resizeObserver = null;
  let handleResize = null;
  let isActive = true;

  const controls = {
    left: false,
    right: false,
    accelerate: false,
    brake: false,
  };
  const keyboardControls = {
    left: false,
    right: false,
    accelerate: false,
    brake: false,
  };
  const pointerControls = {
    accelerate: false,
    brake: false,
  };
  const pointerState = { active: false, x: 0 };

  const syncControls = () => {
    controls.left = keyboardControls.left;
    controls.right = keyboardControls.right;
    controls.accelerate = keyboardControls.accelerate || pointerControls.accelerate;
    controls.brake = keyboardControls.brake || pointerControls.brake;
  };

  const disposeListeners = () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    container.removeEventListener('pointerdown', handlePointerDown);
    container.removeEventListener('pointerup', handlePointerUp);
    container.removeEventListener('pointerleave', handlePointerUp);
    container.removeEventListener('pointermove', handlePointerMove);
    if (handleResize) {
      window.removeEventListener('resize', handleResize);
    }
    controlPad.querySelectorAll('button').forEach((button) => {
      button.removeEventListener('pointerdown', handleControlPress);
      button.removeEventListener('pointerup', handleControlRelease);
      button.removeEventListener('pointerleave', handleControlRelease);
    });
  };

  const finishRace = (finalScore, message = 'Sprint complete! Tap “Start Example” to replay the track.') => {
    if (!isActive) return;
    isActive = false;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    if (renderer && renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
    disposeListeners();
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    overlay.classList.add('three-game-overlay--complete');
    hintLabel.textContent = message;
    scoreLabel.textContent = `Score ${Math.max(0, Math.round(finalScore))}`;
    onComplete(Math.max(0, Math.round(finalScore)));
  };

  const handleKeyDown = (event) => {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') keyboardControls.left = true;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') keyboardControls.right = true;
    if (event.code === 'ArrowUp' || event.code === 'KeyW' || event.code === 'Space') keyboardControls.accelerate = true;
    if (event.code === 'ArrowDown' || event.code === 'KeyS') keyboardControls.brake = true;
    syncControls();
  };

  const handleKeyUp = (event) => {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') keyboardControls.left = false;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') keyboardControls.right = false;
    if (event.code === 'ArrowUp' || event.code === 'KeyW' || event.code === 'Space') keyboardControls.accelerate = false;
    if (event.code === 'ArrowDown' || event.code === 'KeyS') keyboardControls.brake = false;
    syncControls();
  };

  const handlePointerDown = (event) => {
    pointerState.active = true;
    pointerState.x = event.clientX;
    const rect = container.getBoundingClientRect();
    const relativeY = (event.clientY - rect.top) / rect.height;
    pointerControls.accelerate = relativeY < 0.35;
    pointerControls.brake = relativeY > 0.78;
    syncControls();
  };

  const handlePointerMove = (event) => {
    if (!pointerState.active) return;
    pointerState.x = event.clientX;
    const rect = container.getBoundingClientRect();
    const relativeY = (event.clientY - rect.top) / rect.height;
    pointerControls.accelerate = relativeY < 0.35;
    pointerControls.brake = relativeY > 0.78;
    syncControls();
  };

  const handlePointerUp = () => {
    pointerState.active = false;
    pointerControls.accelerate = false;
    pointerControls.brake = false;
    syncControls();
  };

  const handleControlPress = (event) => {
    event.preventDefault();
    const control = event.currentTarget.dataset.control;
    if (control === 'boost') pointerControls.accelerate = true;
    if (control === 'brake') pointerControls.brake = true;
    syncControls();
  };

  const handleControlRelease = (event) => {
    event.preventDefault();
    const control = event.currentTarget.dataset.control;
    if (control === 'boost') pointerControls.accelerate = false;
    if (control === 'brake') pointerControls.brake = false;
    syncControls();
  };

  const setup = async () => {
    try {
      const THREE = await loadThree();
      if (!isActive) return;

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      container.addEventListener('pointerdown', handlePointerDown);
      container.addEventListener('pointerup', handlePointerUp);
      container.addEventListener('pointerleave', handlePointerUp);
      container.addEventListener('pointermove', handlePointerMove);
      controlPad.querySelectorAll('button').forEach((button) => {
        button.addEventListener('pointerdown', handleControlPress);
        button.addEventListener('pointerup', handleControlRelease);
        button.addEventListener('pointerleave', handleControlRelease);
      });

      // Scene scaffolding replicates a neon canyon for the hover track.
      const scene = new THREE.Scene();
      const backgroundColor = theme?.bg || '#05070f';
      scene.background = new THREE.Color(backgroundColor);
      scene.fog = new THREE.Fog(backgroundColor, 60, 240);

      const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 500);
      camera.position.set(0, 6, 18);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.domElement.className = 'three-game-canvas';
      container.appendChild(renderer.domElement);

      // Ambient and accent lighting to frame the glowing track.
      const ambient = new THREE.AmbientLight(theme?.text || '#ffffff', 0.4);
      const keyLight = new THREE.PointLight(theme?.accent || '#00ffc6', 1.6, 300, 1.8);
      keyLight.position.set(30, 40, 10);
      const rimLight = new THREE.PointLight(theme?.secondary || '#ff3366', 1.2, 240, 1.4);
      rimLight.position.set(-40, 25, -20);
      scene.add(ambient, keyLight, rimLight);

      // Track path built from a closed Catmull-Rom curve.
      const controlPoints = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(30, 6, -40),
        new THREE.Vector3(70, 12, 0),
        new THREE.Vector3(90, 4, 40),
        new THREE.Vector3(60, 20, 90),
        new THREE.Vector3(10, 10, 120),
        new THREE.Vector3(-40, 6, 80),
        new THREE.Vector3(-70, 14, 20),
        new THREE.Vector3(-40, 8, -30),
        new THREE.Vector3(0, 0, -40),
      ];
      const trackCurve = new THREE.CatmullRomCurve3(controlPoints, true, 'catmullrom', 0.4);
      const segments = 600;
      const tubeGeometry = new THREE.TubeGeometry(trackCurve, segments, 2.6, 16, true);
      const tubeMaterial = new THREE.MeshStandardMaterial({
        color: theme?.primary || '#1b1b2f',
        emissive: new THREE.Color(theme?.accent || '#00ffc6').multiplyScalar(0.22),
        metalness: 0.1,
        roughness: 0.4,
        side: THREE.DoubleSide,
      });
      const track = new THREE.Mesh(tubeGeometry, tubeMaterial);
      scene.add(track);

      // Pulsing guide lights positioned above the tube for spatial reference.
      const guideGeometry = new THREE.CylinderGeometry(0.2, 0.2, 6, 12);
      const guideMaterial = new THREE.MeshBasicMaterial({ color: theme?.secondary || '#ff3366' });
      for (let i = 0; i < 40; i += 1) {
        const t = i / 40;
        const point = trackCurve.getPointAt(t);
        const guide = new THREE.Mesh(guideGeometry, guideMaterial);
        guide.position.copy(point).add(new THREE.Vector3(0, 4 + Math.sin(t * Math.PI * 2) * 0.6, 0));
        scene.add(guide);
      }

      // Hover craft assembled from layered boxes and emissive thrusters.
      const craft = new THREE.Group();
      const hull = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.8, 4),
        new THREE.MeshStandardMaterial({
          color: theme?.accent || '#00ffc6',
          emissive: new THREE.Color(theme?.accent || '#00ffc6').multiplyScalar(0.4),
          metalness: 0.3,
          roughness: 0.3,
        }),
      );
      hull.position.y = 0.4;
      craft.add(hull);

      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(0.8, 1.1, 12),
        new THREE.MeshStandardMaterial({
          color: theme?.secondary || '#ff3366',
          emissive: new THREE.Color(theme?.secondary || '#ff3366').multiplyScalar(0.2),
          metalness: 0.2,
          roughness: 0.35,
        }),
      );
      canopy.rotation.x = Math.PI;
      canopy.position.set(0, 0.9, -0.4);
      craft.add(canopy);

      const thrusterMaterial = new THREE.MeshBasicMaterial({ color: '#9fffdc' });
      const thrusterGeometry = new THREE.CylinderGeometry(0.4, 0.2, 1.2, 12);
      for (let i = -1; i <= 1; i += 2) {
        const thruster = new THREE.Mesh(thrusterGeometry, thrusterMaterial);
        thruster.rotation.z = Math.PI / 2;
        thruster.position.set(i * 0.9, 0.3, 1.6);
        craft.add(thruster);
      }

      scene.add(craft);

      // Neon gates encourage precision steering and combo play.
      const gateMaterial = new THREE.MeshStandardMaterial({
        color: theme?.secondary || '#ff3366',
        emissive: new THREE.Color(theme?.secondary || '#ff3366').multiplyScalar(0.3),
        emissiveIntensity: 0.7,
        roughness: 0.25,
      });
      const gateGeometry = new THREE.TorusGeometry(4.3, 0.22, 18, 64);
      const gates = [];
      const gateSteps = [0.06, 0.16, 0.26, 0.36, 0.46, 0.56, 0.66, 0.76, 0.86, 0.96];
      gateSteps.forEach((step) => {
        const gate = new THREE.Mesh(gateGeometry, gateMaterial.clone());
        gate.userData = { progress: step, cleared: false };
        gates.push(gate);
        scene.add(gate);
      });

      // Frenet frames help orient the craft and gates along the spline.
      const frames = trackCurve.computeFrenetFrames(segments, true);
      const getFrameAt = (u) => {
        const t = (u % 1 + 1) % 1;
        const scaled = t * segments;
        const index = Math.floor(scaled);
        const nextIndex = (index + 1) % (segments + 1);
        const lerpAlpha = scaled - index;
        const normal = frames.normals[index].clone().lerp(frames.normals[nextIndex], lerpAlpha).normalize();
        const binormal = frames.binormals[index].clone().lerp(frames.binormals[nextIndex], lerpAlpha).normalize();
        const tangent = frames.tangents[index].clone().lerp(frames.tangents[nextIndex], lerpAlpha).normalize();
        return { normal, binormal, tangent };
      };

      const alignGate = (gate, progress) => {
        const point = trackCurve.getPointAt(progress);
        const { normal, binormal, tangent } = getFrameAt(progress);
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeBasis(normal, binormal, tangent);
        gate.position.copy(point).add(binormal.clone().multiplyScalar(0.2));
        gate.quaternion.setFromRotationMatrix(rotationMatrix);
      };

      gates.forEach((gate) => alignGate(gate, gate.userData.progress));

      // Procedural star particles bring additional depth to the vista.
      const starGeometry = new THREE.BufferGeometry();
      const starCount = 1200;
      const starPositions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i += 1) {
        starPositions[i * 3] = (Math.random() - 0.5) * 500;
        starPositions[i * 3 + 1] = Math.random() * 180 - 40;
        starPositions[i * 3 + 2] = (Math.random() - 0.5) * 500;
      }
      starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      const starMaterial = new THREE.PointsMaterial({
        color: theme?.text || '#ffffff',
        size: 0.9,
        transparent: true,
        opacity: 0.45,
      });
      const stars = new THREE.Points(starGeometry, starMaterial);
      scene.add(stars);

      // Runtime state for race progression and scoring.
      let progress = 0;
      let previousProgress = 0;
      let laneOffset = 0;
      let laneTarget = 0;
      let speed = 0.085;
      let lap = 1;
      let combo = 1;
      let comboTimer = 0;
      let score = 0;
      const duration = 60000;
      let previousTime = performance.now();
      let elapsedTotal = 0;
      let gatePerfects = 0;
      // Narrative phase tracks which commentary beat should surface next.
      let narrativePhase = 0;

      const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

      const updateControls = (delta) => {
        let steerAxis = 0;
        if (pointerState.active) {
          const rect = container.getBoundingClientRect();
          const relativeX = (pointerState.x - rect.left) / rect.width;
          steerAxis = clamp(relativeX * 2 - 1, -1, 1);
        } else {
          if (controls.left) steerAxis -= 1;
          if (controls.right) steerAxis += 1;
        }
        laneTarget += steerAxis * delta * 3.6;
        laneTarget = clamp(laneTarget, -1.8, 1.8);
        laneOffset += (laneTarget - laneOffset) * Math.min(1, delta * 6);

        if (controls.accelerate) {
          speed += delta * 0.06;
        } else {
          speed += delta * 0.015;
        }
        if (controls.brake) {
          speed -= delta * 0.08;
        }
        speed = clamp(speed, 0.055, 0.22);
      };

      const updateCraft = (delta) => {
        previousProgress = progress;
        progress = (progress + speed * delta) % 1;
        const point = trackCurve.getPointAt(progress);
        const { normal, binormal, tangent } = getFrameAt(progress);
        const offsetPosition = point
          .clone()
          .add(normal.clone().multiplyScalar(laneOffset * 2.2))
          .add(binormal.clone().multiplyScalar(0.6 + Math.sin(progress * Math.PI * 2) * 0.15));

        craft.position.copy(offsetPosition);

        const lookTarget = point.clone().add(tangent.clone().multiplyScalar(8)).add(normal.clone().multiplyScalar(laneOffset * 1.6));
        craft.lookAt(lookTarget);
        craft.rotateZ(-laneOffset * 0.18);

        const cameraTarget = offsetPosition
          .clone()
          .add(binormal.clone().multiplyScalar(4.8))
          .add(tangent.clone().multiplyScalar(-14));
        camera.position.lerp(cameraTarget, clamp(delta * 4, 0, 1));
        camera.lookAt(offsetPosition.clone().add(tangent.clone().multiplyScalar(4)));

        stars.rotation.y += delta * 0.02;
      };

      const evaluateGates = (delta) => {
        comboTimer -= delta;
        if (comboTimer <= 0) {
          combo = Math.max(1, combo - 1);
          comboTimer = 0;
          comboLabel.textContent = `Combo x${combo}`;
        }

        const wrapped = previousProgress > progress;

        gates.forEach((gate) => {
          if (gate.userData.cleared) return;
          const threshold = gate.userData.progress;
          const crossed = (!wrapped && previousProgress < threshold && progress >= threshold)
            || (wrapped && (previousProgress < threshold || progress >= threshold));
          if (crossed) {
            const alignment = 1 - Math.min(1, Math.abs(laneOffset) / 1.8);
            const gateScore = 200 * alignment * combo;
            score += gateScore;
            gate.userData.cleared = true;
            combo = alignment > 0.55 ? combo + 1 : 1;
            comboTimer = 4;
            gate.material.emissiveIntensity = 1.4;
            if (alignment > 0.85) {
              gatePerfects += 1;
              hintLabel.textContent = `Gate synced! Reactor charge ${gatePerfects * 10}% – ride the flow.`;
              score += 80;
            } else if (alignment <= 0.55) {
              hintLabel.textContent = 'Lane drift detected. Center the craft to rebuild your combo.';
            }
            if (combo >= 4 && narrativePhase === 0) {
              hintLabel.textContent = 'Combo core online – neon turbines are purring. Hold the line!';
              narrativePhase = 1;
            } else if (combo >= 7 && narrativePhase === 1) {
              hintLabel.textContent = 'Spectators roaring! Boost trails are visible from orbit.';
              narrativePhase = 2;
            }
          }
        });

        comboLabel.textContent = `Combo x${combo}`;

        if (wrapped) {
          const pending = gates.filter((gate) => gate.userData.cleared);
          if (pending.length === gates.length) {
            lap += 1;
            lapLabel.textContent = `Lap ${lap}`;
            gates.forEach((gate) => {
              gate.userData.cleared = false;
              gate.material.emissiveIntensity = 0.7;
            });
            hintLabel.textContent = `Lap ${lap} engaged – lane memory reset. Amplify the next streak.`;
          }
        }
      };

      handleResize = () => {
        if (!renderer) return;
        const { clientWidth, clientHeight } = container;
        camera.aspect = clientWidth / clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(clientWidth, clientHeight);
      };

      handleResize();
      window.addEventListener('resize', handleResize);
      resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(handleResize) : null;
      if (resizeObserver) resizeObserver.observe(container);

      const loop = (timestamp) => {
        if (!isActive) return;
        const deltaMs = timestamp - previousTime;
        const delta = Math.min(0.05, deltaMs / 1000 || 0);
        previousTime = timestamp;
        elapsedTotal += deltaMs;

        const remaining = Math.max(0, duration - elapsedTotal);
        timerLabel.textContent = `${(remaining / 1000).toFixed(1)}s`;

        updateControls(delta);
        updateCraft(delta);
        evaluateGates(delta);
        // Surface a readable boost gauge so players sense acceleration progress.
        const normalizedSpeed = Math.min(1, Math.max(0, (speed - 0.055) / (0.22 - 0.055)));
        speedLabel.textContent = `Speed ${Math.round(normalizedSpeed * 100)}%`;

        score += delta * (speed * 1200 + combo * 45);
        scoreLabel.textContent = `Score ${Math.round(score)}`;

        renderer.render(scene, camera);

        if (elapsedTotal >= duration) {
          finishRace(score + combo * 150, 'Race concluded – upload your fastest line next run.');
          return;
        }

        animationFrame = requestAnimationFrame(loop);
      };

      animationFrame = requestAnimationFrame(loop);
    } catch (error) {
      console.error('Track Velocity failed to load', error);
      timerLabel.textContent = 'Error';
      finishRace(0, 'Unable to initialise 3D engine. Check your connection and retry.');
    }
  };

  setup();

  return () => {
    if (isActive) {
      finishRace(0, 'Session aborted. Relaunch when you are ready.');
    }
    disposeListeners();
    if (resizeObserver) resizeObserver.disconnect();
    if (overlay.parentElement === container) container.removeChild(overlay);
    if (controlPad.parentElement === container) container.removeChild(controlPad);
  };
}
