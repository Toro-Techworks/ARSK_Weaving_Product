<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Loom;
use App\Models\LoomAssignmentHistory;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoomAssignmentHistoryController extends Controller
{
    /**
     * Return the "effective" loom assignment (design / weave_technique / colour /
     * fabric_id / yarn_order_id / sl_number) for each loom on each date in the
     * requested window.
     *
     * For a given (loom, date), the effective assignment is the latest history
     * row with assigned_at <= end-of-day(date). If no row exists, falls back to
     * the loom's current `fabrics.loom_id` row.
     *
     * GET /loom-assignment-history?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&loom_ids=1,2,3
     * Response shape:
     * {
     *   "data": {
     *     "<loom_id>": {
     *       "<YYYY-MM-DD>": {
     *         "fabric_id", "yarn_order_id", "sl_number",
     *         "design", "weave_technique", "colour"
     *       }, ...
     *     }, ...
     *   }
     * }
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date_from' => 'required|date_format:Y-m-d',
            'date_to' => 'required|date_format:Y-m-d',
            'loom_ids' => 'nullable|string',
        ]);

        $from = CarbonImmutable::parse($validated['date_from'])->startOfDay();
        $to = CarbonImmutable::parse($validated['date_to'])->endOfDay();
        if ($to->lessThan($from)) {
            return response()->json(['data' => (object) []]);
        }

        $loomIds = [];
        if (! empty($validated['loom_ids'])) {
            $loomIds = array_values(array_filter(array_map(
                fn ($x) => (int) trim($x),
                explode(',', (string) $validated['loom_ids']),
            )));
        }
        if (empty($loomIds)) {
            $loomIds = Loom::query()->pluck('id')->map(fn ($x) => (int) $x)->all();
        }
        if (empty($loomIds)) {
            return response()->json(['data' => (object) []]);
        }

        // Build list of dates (inclusive).
        $dates = [];
        $cur = $from;
        while ($cur->lessThanOrEqualTo($to)) {
            $dates[] = $cur->format('Y-m-d');
            $cur = $cur->addDay();
        }

        // Pull all history up to end-of-window, ordered so we can reduce efficiently.
        $history = LoomAssignmentHistory::query()
            ->whereIn('loom_id', $loomIds)
            ->where('assigned_at', '<=', $to)
            ->orderBy('loom_id')
            ->orderBy('assigned_at')
            ->orderBy('id')
            ->get([
                'loom_id',
                'fabric_id',
                'yarn_order_id',
                'sl_number',
                'design',
                'weave_technique',
                'colour',
                'assigned_at',
            ]);

        // Group by loom_id, already sorted ascending by assigned_at.
        $byLoom = [];
        foreach ($history as $h) {
            $byLoom[(int) $h->loom_id][] = $h;
        }

        // Fallback for looms with no history row in range: use current fabric.loom_id.
        $loomsWithoutHistory = array_values(array_diff($loomIds, array_keys($byLoom)));
        $currentFallback = [];
        if (! empty($loomsWithoutHistory)) {
            $currentFallback = \App\Models\Fabric::query()
                ->whereIn('loom_id', $loomsWithoutHistory)
                ->get(['id', 'loom_id', 'yarn_order_id', 'sl_number', 'design', 'weave_technique', 'colour'])
                ->keyBy(fn ($f) => (int) $f->loom_id)
                ->all();
        }

        $result = [];
        foreach ($loomIds as $lid) {
            $perDate = [];
            $rows = $byLoom[$lid] ?? [];
            foreach ($dates as $d) {
                $endOfDay = CarbonImmutable::parse($d)->endOfDay();
                // Walk backwards to find latest row with assigned_at <= endOfDay.
                $match = null;
                for ($i = count($rows) - 1; $i >= 0; $i--) {
                    /** @var LoomAssignmentHistory $r */
                    $r = $rows[$i];
                    if ($r->assigned_at && $r->assigned_at->lessThanOrEqualTo($endOfDay)) {
                        $match = $r;
                        break;
                    }
                }
                if ($match) {
                    $perDate[$d] = [
                        'fabric_id' => $match->fabric_id !== null ? (int) $match->fabric_id : null,
                        'yarn_order_id' => $match->yarn_order_id !== null ? (int) $match->yarn_order_id : null,
                        'sl_number' => $match->sl_number,
                        'design' => $match->design,
                        'weave_technique' => $match->weave_technique,
                        'colour' => $match->colour,
                    ];
                } elseif (isset($currentFallback[$lid])) {
                    $f = $currentFallback[$lid];
                    $perDate[$d] = [
                        'fabric_id' => (int) $f->id,
                        'yarn_order_id' => $f->yarn_order_id !== null ? (int) $f->yarn_order_id : null,
                        'sl_number' => $f->sl_number,
                        'design' => $f->design,
                        'weave_technique' => $f->weave_technique,
                        'colour' => $f->colour,
                    ];
                } else {
                    $perDate[$d] = [
                        'fabric_id' => null,
                        'yarn_order_id' => null,
                        'sl_number' => null,
                        'design' => null,
                        'weave_technique' => null,
                        'colour' => null,
                    ];
                }
            }
            $result[(string) $lid] = $perDate;
        }

        return response()->json(['data' => $result]);
    }
}
