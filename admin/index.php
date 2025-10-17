<?php
/**
 * Admin dashboard for managing employees and arcade settings.
 */
require_once __DIR__ . '/../php/auth.php';

$settingsPath = __DIR__ . '/../data/settings.json';
$employeesPath = __DIR__ . '/../data/employees.json';
$settings = json_decode(file_get_contents($settingsPath), true) ?? [];
$employees = json_decode(file_get_contents($employeesPath), true) ?? [];
?>
<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- Meta details for responsive admin interface -->
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Company Arcade Admin</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <div class="admin-shell">
      <header class="admin-header">
        <h1>Company Arcade Admin</h1>
        <?php if (arcade_is_admin()): ?>
        <button id="logout" class="admin-btn">Logout</button>
        <?php endif; ?>
      </header>

      <?php if (!arcade_is_admin()): ?>
      <!-- Login form displayed when the admin session is missing -->
      <section class="admin-card">
        <h2>Login</h2>
        <form id="login-form" class="admin-form">
          <label>
            Password
            <input type="password" id="password" required />
          </label>
          <button type="submit" class="admin-btn">Sign In</button>
          <p id="login-error" class="admin-error" role="alert"></p>
        </form>
      </section>
      <?php else: ?>
      <!-- Settings management interface rendered after authentication -->
      <section class="admin-grid">
        <article class="admin-card">
          <h2>Theme Colors</h2>
          <form id="theme-form" class="admin-form">
            <?php foreach (($settings['theme'] ?? []) as $key => $value): ?>
            <label>
              <?php echo ucfirst($key); ?>
              <input type="color" name="theme[<?php echo htmlspecialchars($key); ?>]" value="<?php echo htmlspecialchars($value); ?>" />
            </label>
            <?php endforeach; ?>
            <button type="submit" class="admin-btn">Save Theme</button>
            <p class="admin-feedback" id="theme-feedback"></p>
          </form>
        </article>

        <article class="admin-card">
          <h2>Game Order</h2>
          <div class="game-order" id="game-order"></div>
          <div class="admin-actions">
            <button id="save-order" class="admin-btn">Save Order</button>
          </div>
          <p class="admin-feedback" id="order-feedback"></p>
        </article>

        <article class="admin-card admin-card--wide">
          <h2>Employees</h2>
          <table class="admin-table" id="employee-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Avatar Path</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
          <div class="admin-actions">
            <button id="add-employee" class="admin-btn">Add Employee</button>
            <button id="save-employees" class="admin-btn">Save Employees</button>
          </div>
          <p class="admin-feedback" id="employee-feedback"></p>
        </article>
      </section>
      <?php endif; ?>
    </div>

    <script>
      window.__ADMIN_BOOTSTRAP__ = <?php echo json_encode([
          'theme' => $settings['theme'] ?? [],
          'gameOrder' => $settings['gameOrder'] ?? [],
          'employees' => $employees,
          'isAdmin' => arcade_is_admin(),
      ]); ?>;
    </script>
    <script type="module" src="script.js"></script>
  </body>
</html>
