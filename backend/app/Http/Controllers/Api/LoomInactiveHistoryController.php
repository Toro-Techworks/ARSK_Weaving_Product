<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoomInactiveHistory;
use App\Services\LoomInactiveHistoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoomInactiveHistoryController extends Controller
{
    public function __construct(
        private readonly LoomInactiveHistoryService $historyService,
    ) {}

    /**
     * GET /loom-inactive-histories — paginated audit log (super_admin, admin).
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = $this->clampPerPage($request, 15, 100);

        $query = LoomInactiveHistory::query()
            ->whereNotNull('inactive_start_date')
            ->with(['loom:id,loom_number', 'changedBy:id,name,username'])
            ->orderByDesc('inactive_start_date')
            ->orderByDesc('id');

        if ($request->filled('loom_id')) {
            $query->where('loom_id', (int) $request->input('loom_id'));
        }

        if ($request->filled('status')) {
            $status = trim((string) $request->input('status'));
            $query->where(function ($q) use ($status) {
                $q->where('previous_status', $status)->orWhere('new_status', $status);
            });
        }

        if ($request->filled('reason')) {
            $reason = trim((string) $request->input('reason'));
            $query->where('inactive_reason', 'like', '%'.$reason.'%');
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        if ($request->filled('search')) {
            $s = '%'.trim((string) $request->input('search')).'%';
            $query->where(function ($q) use ($s) {
                $q->where('inactive_reason', 'like', $s)
                    ->orWhere('remarks', 'like', $s)
                    ->orWhereHas('loom', fn ($lq) => $lq->where('loom_number', 'like', $s));
            });
        }

        $paginator = $query->paginate($perPage);

        $data = collect($paginator->items())->map(function (LoomInactiveHistory $row) {
            $start = $row->inactive_start_date;
            $end = $row->inactive_end_date;
            $downtimeDays = null;
            if ($start) {
                $downtimeDays = round($start->diffInMinutes($end ?? now()) / (60 * 24), 2);
            }

            return [
                'id' => $row->id,
                'loom_id' => $row->loom_id,
                'loom_number' => $row->loom?->loom_number,
                'previous_status' => $row->previous_status,
                'new_status' => $row->new_status,
                'inactive_reason' => $row->inactive_reason,
                'remarks' => $row->remarks,
                'inactive_start_date' => $start?->toIso8601String(),
                'inactive_end_date' => $end?->toIso8601String(),
                'inactive_from_display' => $start?->format('d M Y H:i'),
                'inactive_until_display' => $end?->format('d M Y H:i'),
                'total_downtime' => LoomInactiveHistoryService::downtimeLabel($downtimeDays),
                'downtime_days' => $downtimeDays,
                'changed_by_user_id' => $row->changed_by_user_id,
                'changed_by_name' => $row->changedBy?->name ?? $row->changedBy?->username,
                'created_at' => $row->created_at?->toIso8601String(),
            ];
        })->all();

        return $this->paginatedResponse($paginator, $data);
    }

    /**
     * GET /loom-inactive-histories/current?loom_ids=1,2,3
     */
    public function current(Request $request): JsonResponse
    {
        $raw = (string) $request->query('loom_ids', '');
        $loomIds = array_values(array_filter(array_map(
            fn ($x) => (int) trim($x),
            explode(',', $raw),
        )));

        return response()->json([
            'data' => $this->historyService->currentOpenPeriodsForLooms($loomIds),
        ]);
    }

    /**
     * GET /loom-inactive-histories/reasons
     */
    public function reasons(): JsonResponse
    {
        return response()->json(['data' => config('loom_inactive.reasons', [])]);
    }
}
