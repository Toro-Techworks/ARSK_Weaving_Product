<?php

use App\Events\UserActionPerformed;
use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\Admin\AdminGenericCodeController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\FabricController;
use App\Http\Controllers\Api\GenericCodeController;
use App\Http\Controllers\Api\LoomController;
use App\Http\Controllers\Api\LoomEntryController;
use App\Http\Controllers\Api\LoomProductionController;
use App\Http\Controllers\Api\MenuController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WeaverController;
use App\Http\Controllers\Api\WeavingUnitController;
use App\Http\Controllers\Api\YarnOrderController;
use App\Http\Controllers\Api\YarnReceiptController;
use App\Http\Controllers\Api\YarnRequirementController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::get('/menus/user', [MenuController::class, 'userMenus']);

    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::apiResource('companies', CompanyController::class);
    Route::get('/companies-list', [CompanyController::class, 'list']);
    Route::apiResource('weaving-units', WeavingUnitController::class);
    Route::apiResource('weavers', WeaverController::class);

    Route::apiResource('looms', LoomController::class);
    Route::get('/looms-list', [LoomController::class, 'list']);

    Route::get('/fabrics/yarn-order/{yarnOrderId}', [FabricController::class, 'indexByYarnOrder']);
    Route::post('/fabrics/bulk', [FabricController::class, 'bulkStore']);
    Route::apiResource('fabrics', FabricController::class);

    Route::apiResource('loom-entries', LoomEntryController::class);
    Route::post('/loom-production/bulk-update', [LoomProductionController::class, 'bulkUpdate']);
    Route::post('/loom-production/batch-update', [LoomProductionController::class, 'batchUpdate']);
    Route::apiResource('payments', PaymentController::class);
    Route::apiResource('expenses', ExpenseController::class);

    Route::get('/yarn-orders/{yarnOrder}/entry', [YarnOrderController::class, 'entry']);
    Route::apiResource('yarn-orders', YarnOrderController::class);
    Route::apiResource('yarn-receipts', YarnReceiptController::class);
    Route::post('/yarn-receipts/bulk', [YarnReceiptController::class, 'bulkStore']);

    Route::get('/yarn-requirements/yarn-order/{yarnOrderId}', [YarnRequirementController::class, 'indexByYarnOrder']);
    Route::post('/yarn-requirements/bulk', [YarnRequirementController::class, 'bulkStore']);
    Route::apiResource('yarn-requirements', YarnRequirementController::class);

    Route::get('/generic-code/{codeType}', [GenericCodeController::class, 'byType']);

    Route::get('/reports/order-summary', [ReportController::class, 'orderSummary']);
    Route::get('/reports/order-summary/excel', [ReportController::class, 'orderSummaryExportExcel']);
    Route::get('/reports/order-summary/pdf', [ReportController::class, 'orderSummaryExportPdf']);
    Route::get('/reports/loom-efficiency', [ReportController::class, 'loomEfficiency']);
    Route::get('/reports/loom-efficiency/excel', [ReportController::class, 'loomEfficiencyExportExcel']);
    Route::get('/reports/loom-efficiency/pdf', [ReportController::class, 'loomEfficiencyExportPdf']);
    Route::get('/reports/production', [ReportController::class, 'production']);
    Route::get('/reports/production/excel', [ReportController::class, 'productionExportExcel']);
    Route::get('/reports/production/pdf', [ReportController::class, 'productionExportPdf']);
    Route::get('/reports/production/export/excel', [ReportController::class, 'productionExportExcel']);
    Route::get('/reports/production/export/pdf', [ReportController::class, 'productionExportPdf']);

    Route::get('/reports/yarn-consumption/options', [ReportController::class, 'yarnConsumptionOptions']);
    Route::get('/reports/yarn-consumption', [ReportController::class, 'yarnConsumption']);
    Route::get('/reports/yarn-consumption/excel', [ReportController::class, 'yarnConsumptionExportExcel']);
    Route::get('/reports/yarn-consumption/pdf', [ReportController::class, 'yarnConsumptionExportPdf']);
    Route::get('/reports/yarn-consumption/export/excel', [ReportController::class, 'yarnConsumptionExportExcel']);
    Route::get('/reports/yarn-consumption/export/pdf', [ReportController::class, 'yarnConsumptionExportPdf']);

    Route::middleware('role:super_admin,admin')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword']);
    });

    Route::get('/roles', [RoleController::class, 'index'])->middleware('role:super_admin,admin');

    Route::prefix('admin')->middleware('role:super_admin,admin')->group(function () {
        Route::get('generic-codes/code-types', [AdminGenericCodeController::class, 'codeTypes']);
        Route::apiResource('generic-codes', AdminGenericCodeController::class)->except(['show']);
        Route::get('/menus', [\App\Http\Controllers\Api\Admin\AdminMenuController::class, 'index']);
        Route::get('/menus/flat', [\App\Http\Controllers\Api\Admin\AdminMenuController::class, 'listFlat']);
        Route::post('/menus', [\App\Http\Controllers\Api\Admin\AdminMenuController::class, 'store']);
        Route::put('/menus/{menu}', [\App\Http\Controllers\Api\Admin\AdminMenuController::class, 'update']);
    });

    Route::prefix('permissions')->middleware('role:super_admin')->group(function () {
        Route::get('/users', [PermissionController::class, 'users']);
        Route::get('/menus', [PermissionController::class, 'menus']);
        Route::get('/user-menu', [PermissionController::class, 'userMenu']);
        Route::post('/save', [PermissionController::class, 'save']);
    });

    /**
     * Debug: broadcast UserActionPerformed on public channel "notifications".
     * GET /api/test-pusher (Authorization: Bearer …) as super_admin — browser console should log EVENT RECEIVED.
     */
    Route::middleware('role:super_admin')->get('/test-pusher', function (Request $request) {
        $driver = config('broadcasting.default');
        Log::info('test_pusher: invoked', ['broadcast_connection' => $driver]);

        if (! in_array($driver, ['pusher', 'reverb'], true)) {
            return response()->json([
                'ok' => false,
                'error' => 'broadcasting_driver_not_pusher',
                'current' => $driver,
                'hint' => 'Set BROADCAST_CONNECTION=pusher in .env (only once — no duplicate keys), then: php artisan config:clear',
            ], 422);
        }

        try {
            $msg = 'Pusher test · '.now()->toDateTimeString();
            broadcast(new UserActionPerformed(
                message: $msg,
                module: 'system',
                action: 'test',
                record_id: null,
                actor_user_id: $request->user()?->id,
            ));
            Log::info('test_pusher: broadcast dispatched', ['message' => $msg]);

            return response()->json([
                'ok' => true,
                'broadcast_connection' => $driver,
                'message' => $msg,
                'channel' => 'notifications',
                'event' => 'UserActionPerformed',
                'listen' => 'Echo.channel("notifications").listen(".UserActionPerformed", …)',
                'checklist' => [
                    'Frontend .env: VITE_PUSHER_APP_KEY and VITE_PUSHER_APP_CLUSTER must match Laravel (e.g. ap2).',
                    'Logged-in as super_admin so Echo subscribes (useActivityBroadcast).',
                    'Restart Vite after changing VITE_*; hard-refresh browser.',
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('test_pusher: failed', ['error' => $e->getMessage()]);

            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    });

    Route::middleware('role:super_admin')->group(function () {
        Route::get('/notifications', [ActivityLogController::class, 'index']);
        Route::get('/notifications/preview', [ActivityLogController::class, 'preview']);
        Route::get('/notifications/unread-count', [ActivityLogController::class, 'unreadCount']);
        Route::post('/notifications/mark-read', [ActivityLogController::class, 'markRead']);
    });
});
