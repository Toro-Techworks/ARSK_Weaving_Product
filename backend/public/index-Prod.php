<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

$backendPath = '../toro-backend/';

if (file_exists($maintenance = $backendPath.'storage/framework/maintenance.php')) {
    require $maintenance;
}

require $backendPath.'vendor/autoload.php';

$app = require_once $backendPath.'bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$response = $kernel->handle(
    $request = Request::capture()
)->send();

$kernel->terminate($request, $response);