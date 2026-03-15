<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return ['app' => 'Toro Production API', 'version' => '1.0'];
});
