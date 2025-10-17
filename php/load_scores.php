<?php
/**
 * Load leaderboard data for the Company Arcade.
 * Returns a JSON response with score entries ordered by score.
 */
header('Content-Type: application/json');

$scoresPath = __DIR__ . '/../data/scores.json';

if (!file_exists($scoresPath)) {
    echo json_encode(['scores' => []]);
    exit;
}

$content = file_get_contents($scoresPath);
$scores = json_decode($content, true) ?: [];

echo json_encode(['scores' => $scores]);
