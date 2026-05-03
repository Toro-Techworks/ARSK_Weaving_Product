<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Resolve backend base path: empty = default (parent of public), or e.g. "toro-backend"
$backendPath = getenv('BACKEND_PATH');
if ($backendPath === false || $backendPath === '') {
    $envFile = __DIR__ . '/../.env';
    if (file_exists($envFile) && is_readable($envFile)) {
        $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines !== false) {
            foreach ($lines as $line) {
                if (strpos(trim($line), 'BACKEND_PATH=') === 0) {
                    $value = trim(substr($line, strlen('BACKEND_PATH=')), " \t\"'");
                    if ($value !== '') {
                        $backendPath = $value;
                    }
                    break;
                }
            }
        }
    }
}
$backendPath = ($backendPath !== false && $backendPath !== '') ? trim($backendPath, '/\\') . '/' : '';
$basePath = __DIR__ . '/../' . $backendPath;

if (file_exists($maintenance = $basePath . 'storage/framework/maintenance.php')) {
    require $maintenance;
}

require $basePath . 'vendor/autoload.php';

$app = require_once $basePath . 'bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$response = $kernel->handle(
    $request = Request::capture()
)->send();

$kernel->terminate($request, $response);
