<?php
/**
 * Persist a player's total score to the JSON datastore with safe locking.
 */
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['playerId'], $input['playerName'], $input['score'], $input['date'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid payload']);
    exit;
}

$scoresPath = __DIR__ . '/../data/scores.json';
if (!file_exists($scoresPath)) {
    file_put_contents($scoresPath, json_encode([]));
}

$fp = fopen($scoresPath, 'c+');
if (!$fp) {
    http_response_code(500);
    echo json_encode(['error' => 'Unable to open score storage']);
    exit;
}

try {
    if (!flock($fp, LOCK_EX)) {
        throw new RuntimeException('Could not acquire lock');
    }
    $contents = stream_get_contents($fp);
    $scores = $contents ? json_decode($contents, true) : [];
    if (!is_array($scores)) {
        $scores = [];
    }
    $scores[] = [
        'playerId' => (int) $input['playerId'],
        'playerName' => (string) $input['playerName'],
        'score' => (int) $input['score'],
        'date' => (string) $input['date'],
    ];
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($scores, JSON_PRETTY_PRINT));
    fflush($fp);
    flock($fp, LOCK_UN);
    echo json_encode(['status' => 'ok']);
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode(['error' => $exception->getMessage()]);
} finally {
    fclose($fp);
}
