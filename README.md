# Company Arcade

A responsive, mobile-ready arcade of five mini-games designed for quick employee competitions. The platform uses PHP 8, vanilla JavaScript, and JSON storage so it can be deployed on standard shared hosting environments.

## Features

- Employee avatar selection with persistent local storage
- Sequenced play across Quiz Clash, Jump Rush, Quick Tap, Speed Driver, and Escape Grid
- Automatic score aggregation with JSON-based leaderboard
- Admin dashboard for managing theme colors, employee roster, and game order
- JSON-based configuration with PHP file-locking to keep data consistent

## Getting Started

1. **Upload files** – Copy the entire project folder to your PHP-enabled web hosting (e.g. Apache + PHP 8). Ensure the directory structure is preserved.
2. **File permissions** – Set the `/data` directory to be writable by the web server. From a terminal you can run:
   ```bash
   chmod 755 data
   ```
3. **Verify PHP version** – The scripts use typed functions from PHP 8.0+, so confirm your hosting plan supports PHP 8 or newer.
4. **Access the arcade** – Browse to `https://yourdomain.com/index.php` to launch the experience.

## Admin Dashboard

- Navigate to `https://yourdomain.com/admin/`.
- Default password: **admin**.
- The password hash is stored in `/data/config.json`. To change the password:
  1. Generate a new hash with `php -r "echo password_hash('newpassword', PASSWORD_DEFAULT);"`.
  2. Replace the `passwordHash` value inside `data/config.json` with the generated string.

### Managing Employees

Employees are stored in `/data/employees.json` using the structure:
```json
[
  { "id": 1, "name": "Kevin", "avatar": "assets/avatars/kevin.png" }
]
```
Use the admin panel to add, edit, or delete employees. Avatar paths are optional; leave them blank to use an auto-generated initial badge.

### Updating Theme Colors

The admin panel exposes color pickers for all theme variables. Saving the theme writes to `/data/settings.json`, which controls global CSS variables. You can also edit the JSON file manually and refresh the browser to apply the changes.

### Configuring Game Order

`/data/settings.json` defines the sequence of mini-games with the `gameOrder` array. Reorder the games in the admin panel or manually update the array. Every game file in `/games/` must expose a `startGame` function to be recognized.

## Adding New Games

1. Create a new JavaScript module inside `/games/` (e.g. `games/puzzle.js`).
2. Export a `startGame({ container, onComplete, theme })` function that renders the game, collects a score, and calls `onComplete(score)` when finished.
3. Add the game key (e.g. `"puzzle"`) to the `gameOrder` array in `/data/settings.json` via the admin panel or manual edit.
4. Update CSS styles if the new game needs specific classes.

## JSON Data Files

- `/data/settings.json` – Theme variables and game order.
- `/data/employees.json` – Employee roster.
- `/data/scores.json` – Leaderboard entries appended after each full run.
- `/data/config.json` – Admin password hash.

## Troubleshooting

- If scores are not saving, confirm that the web server user has write permission to the `/data` folder and files.
- When adding avatars, upload the image to `/assets/avatars/` and reference the relative path in the admin panel.
- Clear the browser `localStorage` entry `company-arcade-employee` if a user needs to reset their preselected avatar.

Enjoy the competition!
