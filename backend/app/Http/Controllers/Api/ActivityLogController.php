<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    /**
     * GET /notifications — activity log for super admin only (middleware).
     */
    public function index(Request $request): JsonResponse
    {
        $this->ensureSuperAdmin($request);

        $perPage = $this->clampPerPage($request, 20, 100);

        $paginator = ActivityLog::query()
            ->with(['user:id,name,username'])
            ->latest('created_at')
            ->paginate($perPage);

        $data = collect($paginator->items())->map(fn (ActivityLog $log) => $this->formatLogRow($log))->all();

        return $this->paginatedResponse($paginator, $data);
    }

    /**
     * GET /notifications/preview — recent rows + unread count (header bell dropdown).
     */
    public function preview(Request $request): JsonResponse
    {
        $user = $this->ensureSuperAdmin($request);

        $items = ActivityLog::query()
            ->with(['user:id,name,username'])
            ->latest('created_at')
            ->limit(10)
            ->get()
            ->map(fn (ActivityLog $log) => $this->formatLogRow($log))
            ->all();

        return response()->json([
            'unread_count' => $this->countUnreadForUser($user),
            'items' => $items,
        ]);
    }

    /**
     * GET /notifications/unread-count — lightweight poll for badge.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $user = $this->ensureSuperAdmin($request);

        return response()->json([
            'unread_count' => $this->countUnreadForUser($user),
        ]);
    }

    /**
     * POST /notifications/mark-read — clear unread badge for current super admin.
     */
    public function markRead(Request $request): JsonResponse
    {
        $user = $this->ensureSuperAdmin($request);
        $user->forceFill(['activity_logs_last_read_at' => now()])->save();

        return response()->json(['message' => 'Marked as read.', 'unread_count' => 0]);
    }

    private function ensureSuperAdmin(Request $request): User
    {
        $user = $request->user();
        if (! $user || ! $user->isSuperAdmin()) {
            abort(403, 'Only super administrators can view notifications.');
        }

        return $user;
    }

    private function countUnreadForUser(User $user): int
    {
        $lastRead = $user->activity_logs_last_read_at;

        return ActivityLog::query()
            ->when($lastRead, fn ($q) => $q->where('created_at', '>', $lastRead))
            ->count();
    }

    /**
     * @return array<string, mixed>
     */
    private function formatLogRow(ActivityLog $log): array
    {
        $actorName = $log->user?->name ?? 'System';

        return [
            'id' => $log->id,
            'user_id' => $log->user_id,
            'actor_user_id' => $log->user_id,
            'user_name' => $actorName,
            'actor_name' => $actorName,
            'user_username' => $log->user?->username,
            'actor_username' => $log->user?->username,
            'action' => $log->action,
            'module' => $log->module,
            'description' => $log->description,
            'record_id' => $log->record_id,
            'created_at' => $log->created_at?->toIso8601String(),
        ];
    }
}
