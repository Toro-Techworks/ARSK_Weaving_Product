<?php

use App\Events\UserActionPerformed;
use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\Admin\AdminGenericCodeController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\DailyEntryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\FabricController;
use App\Http\Controllers\Api\GenericCodeController;
use App\Http\Controllers\Api\LoomAssignmentHistoryController;
use App\Http\Controllers\Api\LoomController;
use App\Http\Controllers\Api\LoomInactiveHistoryController;
use App\Http\Controllers\Api\LoomEntryController;
use App\Http\Controllers\Api\LoomProductionController;
use App\Http\Controllers\Api\MasterController;
use App\Http\Controllers\Api\MenuController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProductOwner\ProductOwnerController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\ProductionReadinessController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WeaverController;
use App\Http\Controllers\Api\WeavingUnitController;
use App\Http\Controllers\Api\WindingController;
use App\Http\Controllers\Api\WindingUnitController;
use App\Http\Controllers\Api\YarnOrderController;
use App\Http\Controllers\Api\YarnReceiptController;
use App\Http\Controllers\Api\YarnRequirementController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;

// Preflight requests (OPTIONS) should always succeed for CORS.
Route::options('{any}', function () {
    return response()->noContent(200);
})->where('any', '.*');

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::get('/menus/user', [MenuController::class, 'userMenus']);

    Route::prefix('product-owner')->middleware('product.owner')->group(function () {
        Route::get('/dashboard', [ProductOwnerController::class, 'dashboard']);
        Route::get('/roles', [ProductOwnerController::class, 'roles']);
        Route::get('/users', [ProductOwnerController::class, 'usersIndex']);
        Route::post('/users', [ProductOwnerController::class, 'usersStore']);
        Route::put('/users/{user}', [ProductOwnerController::class, 'usersUpdate']);
        Route::post('/users/{user}/reset-password', [ProductOwnerController::class, 'resetPassword']);
        Route::post('/users/{user}/generate-temporary-password', [ProductOwnerController::class, 'generateTemporaryPassword']);
        Route::post('/users/{user}/force-password-change', [ProductOwnerController::class, 'forcePasswordChange']);
        Route::post('/users/{user}/revoke-sessions', [ProductOwnerController::class, 'revokeSessions']);
        Route::get('/security', [ProductOwnerController::class, 'securityOverview']);
        Route::get('/logs', [ProductOwnerController::class, 'auditLogs']);
    });

    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::middleware('role:super_admin')->group(function () {
        Route::get('/companies/trashed', [CompanyController::class, 'deletedIndex']);
        Route::post('/companies/trashed/permanent-delete', [CompanyController::class, 'permanentDeleteTrashed']);
        Route::post('/companies/trashed/{id}/restore', [CompanyController::class, 'restoreTrashed'])->whereNumber('id');
        Route::get('/weaving-units/trashed', [WeavingUnitController::class, 'deletedIndex']);
        Route::post('/weaving-units/trashed/{id}/restore', [WeavingUnitController::class, 'restoreTrashed'])->whereNumber('id');
        Route::get('/winding-units/trashed', [WindingUnitController::class, 'deletedIndex']);
        Route::post('/winding-units/trashed/{id}/restore', [WindingUnitController::class, 'restoreTrashed'])->whereNumber('id');
        Route::get('/weavers/trashed', [WeaverController::class, 'deletedIndex']);
        Route::post('/weavers/trashed/{id}/restore', [WeaverController::class, 'restoreTrashed'])->whereNumber('id');
        Route::get('/yarn-orders/trashed', [YarnOrderController::class, 'deletedIndex']);
        Route::post('/yarn-orders/trashed/{id}/restore', [YarnOrderController::class, 'restoreTrashed'])->whereNumber('id');
    });
    Route::apiResource('companies', CompanyController::class);
    Route::get('/companies-list', [CompanyController::class, 'list']);
    Route::apiResource('weaving-units', WeavingUnitController::class);
    Route::apiResource('winding-units', WindingUnitController::class);
    Route::apiResource('windings', WindingController::class);
    Route::get('/weavers/next-employee-code', [WeaverController::class, 'nextEmployeeCode']);
    Route::apiResource('weavers', WeaverController::class);

    Route::get('/masters/designs', [MasterController::class, 'designs']);
    Route::get('/masters/weave-tech', [MasterController::class, 'weaveTech']);
    Route::get('/masters/colours', [MasterController::class, 'colours']);

    Route::get('/daily-entry/loom-configurations', [DailyEntryController::class, 'loomConfigurations']);
    Route::post('/daily-entry', [DailyEntryController::class, 'store']);

    Route::get('/looms/configurations', [LoomController::class, 'configurations']);
    Route::get('/looms/{loom}/configuration', [LoomController::class, 'configuration']);
    Route::apiResource('looms', LoomController::class);
    Route::get('/looms-list', [LoomController::class, 'list']);
    Route::get('/loom-assignment-history', [LoomAssignmentHistoryController::class, 'index']);

    Route::get('/loom-inactive-histories/current', [LoomInactiveHistoryController::class, 'current']);
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::get('/loom-inactive-histories', [LoomInactiveHistoryController::class, 'index']);
        Route::get('/loom-inactive-histories/reasons', [LoomInactiveHistoryController::class, 'reasons']);
    });

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

    Route::get('/production-status', [ProductionReadinessController::class, 'index'])
        ->middleware('role:super_admin,admin');

    Route::get('/generic-code/{codeType}', [GenericCodeController::class, 'byType']);

    Route::get('/reports/client-expenses', [ReportController::class, 'clientOrderExpenses']);
    Route::get('/reports/production', [ReportController::class, 'production']);
    Route::get('/reports/production/excel', [ReportController::class, 'productionExportExcel']);
    Route::get('/reports/production/pdf', [ReportController::class, 'productionExportPdf']);
    Route::get('/reports/production/export/excel', [ReportController::class, 'productionExportExcel']);
    Route::get('/reports/production/export/pdf', [ReportController::class, 'productionExportPdf']);

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

    Route::prefix('permissions')->middleware('role:super_admin,admin')->group(function () {
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
