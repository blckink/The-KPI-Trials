<?php
/**
 * Persist arcade theme and game order configuration from the admin interface.
 */
require_once __DIR__ . '/auth.php';
arcade_require_admin();

header('Content-Type: application/json');

$payload = json_decode(file_get_contents('php://input'), true);
$theme = isset($payload['theme']) && is_array($payload['theme']) ? $payload['theme'] : [];
$gameOrder = isset($payload['gameOrder']) && is_array($payload['gameOrder']) ? array_values($payload['gameOrder']) : [];

$settings = [
    'theme' => $theme,
    'gameOrder' => $gameOrder,
];

$path = __DIR__ . '/../data/settings.json';
$fp = fopen($path, 'c+');
if (!$fp) {
    http_response_code(500);
    echo json_encode(['error' => 'Unable to open settings file']);
    exit;
}

try {
    if (!flock($fp, LOCK_EX)) {
        throw new RuntimeException('Unable to lock settings file');
    }
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($settings, JSON_PRETTY_PRINT));
    fflush($fp);
    flock($fp, LOCK_UN);
    echo json_encode(['status' => 'ok']);
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode(['error' => $exception->getMessage()]);
} finally {
    fclose($fp);
}
