<?php
/**
 * Main entry point for the Company Arcade platform.
 * Loads initial settings and employees to hydrate the frontend application.
 */
$settingsPath = __DIR__ . '/data/settings.json';
$employeesPath = __DIR__ . '/data/employees.json';

$settings = json_decode(file_get_contents($settingsPath), true) ?? [];
$employees = json_decode(file_get_contents($employeesPath), true) ?? [];
$theme = $settings['theme'] ?? [];
?>
<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- Meta configuration for responsive experience -->
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Company Arcade</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Rubik:wght@300;400;500;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="assets/css/style.css" />
  </head>
  <body>
    <!-- Root container for the animated gradient background -->
    <div class="arcade-bg"></div>

    <!-- Main application shell -->
    <div id="app" class="app-shell">
      <!-- Header banner with title and quick status indicator -->
      <header class="app-header">
        <h1 class="app-title">Company Arcade</h1>
        <div class="status-pill" id="status-indicator">Ready</div>
      </header>

      <!-- Core content area managed by main.js for state transitions -->
      <main class="app-main">
        <!-- Step 1: Introduction screen -->
        <section id="screen-intro" class="app-screen is-active">
          <div class="screen-content">
            <h2>Level Up Your Team Spirit</h2>
            <p>Select your employee avatar to begin the ultimate company challenge.</p>
            <button id="start-select" class="arcade-btn">Select Employee</button>
          </div>
        </section>

        <!-- Step 2: Employee selection grid -->
        <section id="screen-select" class="app-screen">
          <div class="screen-content">
            <h2>Choose Your Challenger</h2>
            <div id="employee-grid" class="employee-grid"></div>
            <div class="selection-actions">
              <button id="confirm-employee" class="arcade-btn" disabled>Confirm &amp; Play</button>
              <button id="back-to-intro" class="arcade-btn arcade-btn--ghost">Back</button>
            </div>
          </div>
        </section>

        <!-- Step 3: Game container dynamically swapped per mini-game -->
        <section id="screen-game" class="app-screen">
          <div class="screen-content">
            <div class="game-header">
              <h2 id="game-title">Get Ready</h2>
              <div class="progress-display">
                <span id="game-progress">Game 1/5</span>
                <span id="current-score">Score: 0</span>
              </div>
            </div>
            <div id="game-container" class="game-container"></div>
          </div>
        </section>

        <!-- Step 4: Leaderboard presentation after all games -->
        <section id="screen-leaderboard" class="app-screen">
          <div class="screen-content">
            <h2>Leaderboard</h2>
            <p class="leaderboard-subtitle">See how you stack up against the rest of the crew.</p>
            <div class="score-summary">
              <span id="final-player">Player: -</span>
              <span id="final-score">Total Score: 0</span>
            </div>
            <ol id="leaderboard-list" class="leaderboard-list"></ol>
            <div class="selection-actions">
              <button id="play-again" class="arcade-btn">Play Again</button>
            </div>
          </div>
        </section>
      </main>

      <!-- Footer with admin access information -->
      <footer class="app-footer">
        <p>Need to manage the arcade? <a href="admin/">Admin Login</a></p>
      </footer>
    </div>

    <!-- Bootstrapping data for the frontend application -->
    <script>
      window.__ARCADE_BOOTSTRAP__ = <?php echo json_encode([
          'theme' => $theme,
          'settings' => $settings,
          'employees' => $employees,
          'baseUrl' => rtrim(dirname($_SERVER['SCRIPT_NAME']), '/') . '/',
      ], JSON_PRETTY_PRINT); ?>;
    </script>
    <script type="module" src="assets/js/main.js"></script>
  </body>
</html>
