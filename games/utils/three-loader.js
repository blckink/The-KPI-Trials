/* =========================================================
 * Centralized Three.js loader to reuse the remote module across games
 * Lazily loads the module once and shares the resolved promise
 * ========================================================= */
let threeModulePromise = null;

export const loadThree = async () => {
  if (!threeModulePromise) {
    threeModulePromise = import('https://unpkg.com/three@0.160.0/build/three.module.js')
      .catch((error) => {
        // Reset the promise so future attempts can retry if the network issue is transient.
        threeModulePromise = null;
        throw error;
      });
  }

  return threeModulePromise;
};
