<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\GstRecordController;
use App\Http\Controllers\Api\LoomController;
use App\Http\Controllers\Api\LoomEntryController;
use App\Http\Controllers\Api\FabricController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\YarnOrderController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::get('/menus/user', [\App\Http\Controllers\Api\MenuController::class, 'userMenus']);

    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::apiResource('companies', CompanyController::class);
    Route::get('/companies-list', [CompanyController::class, 'list']);

    Route::apiResource('looms', LoomController::class);
    Route::get('/looms-list', [LoomController::class, 'list']);

    Route::apiResource('orders', OrderController::class);
    Route::get('/fabrics/yarn-order/{yarnOrderId}', [FabricController::class, 'indexByYarnOrder']);
    Route::post('/fabrics', [FabricController::class, 'store']);
    Route::put('/fabrics/{fabric}', [FabricController::class, 'update']);
    Route::delete('/fabrics/{fabric}', [FabricController::class, 'destroy']);

    Route::apiResource('loom-entries', LoomEntryController::class);

    Route::apiResource('payments', PaymentController::class);

    Route::apiResource('expenses', ExpenseController::class);

    Route::apiResource('gst-records', GstRecordController::class);
    Route::post('/orders/{order}/gst-out', [GstRecordController::class, 'fromOrder']);

    Route::get('/yarn-orders/{yarnOrder}/entry', [YarnOrderController::class, 'entry']);
    Route::apiResource('yarn-orders', YarnOrderController::class);
    Route::apiResource('yarn-receipts', \App\Http\Controllers\Api\YarnReceiptController::class);
    Route::get('/yarn-requirements/yarn-order/{yarnOrderId}', [\App\Http\Controllers\Api\YarnRequirementController::class, 'indexByYarnOrder']);
    Route::post('/yarn-requirements', [\App\Http\Controllers\Api\YarnRequirementController::class, 'store']);
    Route::put('/yarn-requirements/{yarnRequirement}', [\App\Http\Controllers\Api\YarnRequirementController::class, 'update']);
    Route::delete('/yarn-requirements/{yarnRequirement}', [\App\Http\Controllers\Api\YarnRequirementController::class, 'destroy']);

    Route::get('/reports/gst-summary', [ReportController::class, 'gstSummary']);
    Route::get('/reports/order-summary', [ReportController::class, 'orderSummary']);
    Route::get('/reports/loom-efficiency', [ReportController::class, 'loomEfficiency']);

    // Admin panel: SuperAdmin + Admin (controller enforces who can create/edit what)
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password');
    });

    Route::get('/roles', [\App\Http\Controllers\Api\RoleController::class, 'index'])->middleware('role:super_admin,admin');

    Route::prefix('admin')->middleware('role:super_admin,admin')->group(function () {
        Route::get('/menus', [\App\Http\Controllers\Api\Admin\AdminMenuController::class, 'index']);
        Route::get('/menus/flat', [\App\Http\Controllers\Api\Admin\AdminMenuController::class, 'listFlat']);
        Route::post('/menus', [\App\Http\Controllers\Api\Admin\AdminMenuController::class, 'store']);
        Route::put('/menus/{menu}', [\App\Http\Controllers\Api\Admin\AdminMenuController::class, 'update']);
        Route::get('/role-menu-permissions', [\App\Http\Controllers\Api\Admin\RoleMenuPermissionController::class, 'index']);
        Route::post('/assign-menu', [\App\Http\Controllers\Api\Admin\RoleMenuPermissionController::class, 'assign']);
        Route::post('/assign-menu-bulk', [\App\Http\Controllers\Api\Admin\RoleMenuPermissionController::class, 'assignBulk']);
    });
});
