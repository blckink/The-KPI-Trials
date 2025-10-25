<?php
/**
 * Shared authentication helpers for the admin dashboard with endpoint support.
 */
session_start();

/**
 * Load the hashed password configuration from disk.
 */
function arcade_load_config(): array
{
    $configPath = __DIR__ . '/../data/config.json';
    if (!file_exists($configPath)) {
        return [];
    }
    $data = json_decode(file_get_contents($configPath), true);
    return is_array($data) ? $data : [];
}

/**
 * Determine if the current session is authenticated.
 */
function arcade_is_admin(): bool
{
    return !empty($_SESSION['arcade_admin']);
}

/**
 * Enforce admin access for protected endpoints.
 */
function arcade_require_admin(): void
{
    if (!arcade_is_admin()) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
}

/**
 * Process incoming login or logout requests when accessed directly.
 */
function arcade_handle_auth_request(): void
{
    header('Content-Type: application/json');
    $config = arcade_load_config();

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $payload = json_decode(file_get_contents('php://input'), true) ?: [];
        $action = $payload['action'] ?? 'login';

        if ($action === 'logout') {
            unset($_SESSION['arcade_admin']);
            echo json_encode(['status' => 'logged_out']);
            return;
        }

        $password = $payload['password'] ?? '';
        $hash = $config['passwordHash'] ?? '';
        if ($hash && password_verify($password, $hash)) {
            $_SESSION['arcade_admin'] = true;
            echo json_encode(['status' => 'ok']);
        } else {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid credentials']);
        }
        return;
    }

    echo json_encode(['authenticated' => arcade_is_admin()]);
}

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    arcade_handle_auth_request();
}
