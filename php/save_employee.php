<?php
/**
 * Persist employee roster changes for the admin dashboard.
 */
require_once __DIR__ . '/auth.php';
arcade_require_admin();

header('Content-Type: application/json');

$payload = json_decode(file_get_contents('php://input'), true);
$employees = $payload['employees'] ?? null;

if (!is_array($employees)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid employee payload']);
    exit;
}

$normalized = array_map(static function ($employee, $index) {
    return [
        'id' => (int) ($employee['id'] ?? ($index + 1)),
        'name' => trim((string) ($employee['name'] ?? 'Unknown')), 
        'avatar' => (string) ($employee['avatar'] ?? ''),
    ];
}, $employees, array_keys($employees));

$path = __DIR__ . '/../data/employees.json';
$fp = fopen($path, 'c+');
if (!$fp) {
    http_response_code(500);
    echo json_encode(['error' => 'Unable to open employees file']);
    exit;
}

try {
    if (!flock($fp, LOCK_EX)) {
        throw new RuntimeException('Unable to lock employees file');
    }
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode(array_values($normalized), JSON_PRETTY_PRINT));
    fflush($fp);
    flock($fp, LOCK_UN);
    echo json_encode(['status' => 'ok']);
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode(['error' => $exception->getMessage()]);
} finally {
    fclose($fp);
}
