<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\LoomEntryResource;
use App\Models\GenericCode;
use App\Models\LoomEntry;
use App\Models\Weaver;
use App\Services\DailyEntryLoomConfigurationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DailyEntryController extends Controller
{
    public function __construct(
        private readonly DailyEntryLoomConfigurationService $loomConfigurationService,
    ) {}

    /**
     * GET /daily-entry/loom-configurations?start=YYYY-MM-DD&end=YYYY-MM-DD&loom_ids=1,2
     *
     * Per loom (keyed by loom_number) and date: design, weave_tech, colour from
     * assignment history; persisted loom_entries override for that date.
     */
    public function loomConfigurations(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start' => 'required|date_format:Y-m-d',
            'end' => 'required|date_format:Y-m-d',
            'loom_ids' => 'nullable|string',
        ]);

        $loomIds = null;
        if (! empty($validated['loom_ids'])) {
            $loomIds = array_values(array_filter(array_map(
                fn ($x) => (int) trim($x),
                explode(',', (string) $validated['loom_ids']),
            )));
        }

        $data = $this->loomConfigurationService->resolveForDateRange(
            $validated['start'],
            $validated['end'],
            $loomIds,
        );

        return response()->json($data);
    }

    /**
     * POST /daily-entry
     *
     * Persists shift rows for one loom and date, with master-backed design / weave / colour.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'loom_id' => 'required|exists:looms,id',
            'date' => 'required|date_format:Y-m-d',
            'design' => GenericCode::validationRule('design', false, GenericCode::DROPDOWN_TYPE_MASTER, 255),
            'weave_tech' => GenericCode::validationRule('weave_technique', false, GenericCode::DROPDOWN_TYPE_MASTER, 255),
            'colour' => GenericCode::validationRule('colour', false, GenericCode::DROPDOWN_TYPE_MASTER, 512),
            'shifts' => 'required|array|min:1',
            'shifts.*.shift' => GenericCode::validationRule('shift', true),
            'shifts.*.meters' => 'nullable|numeric|min:0',
            'shifts.*.weaver1_id' => 'nullable|exists:weavers,id',
            'shifts.*.weaver2_id' => 'nullable|exists:weavers,id',
            'shifts.*.yarn_order_id' => 'nullable|exists:yarn_orders,id',
            'shifts.*.fabric_id' => 'nullable|exists:fabrics,id',
        ]);

        $entries = [];

        DB::transaction(function () use ($validated, &$entries) {
            $loomId = (int) $validated['loom_id'];
            $date = $validated['date'];
            foreach ($validated['shifts'] as $row) {
                $design = $validated['design'] ?? null;
                $weave = $validated['weave_tech'] ?? null;
                $colour = $validated['colour'] ?? null;
                $shift = $row['shift'];
                $meters = isset($row['meters']) ? round((float) $row['meters'], 2) : 0.0;
                $yarnOrderId = $row['yarn_order_id'] ?? null;
                $fabricId = $row['fabric_id'] ?? null;
                $w1 = $row['weaver1_id'] ?? null;
                $w2 = $row['weaver2_id'] ?? null;

                $shouldPersist = $meters > 0
                    || ! empty($w1)
                    || ! empty($w2)
                    || ! empty($yarnOrderId)
                    || ! empty($fabricId)
                    || ! empty($design)
                    || ! empty($weave)
                    || ! empty($colour);

                $existing = LoomEntry::query()
                    ->where('loom_id', $loomId)
                    ->whereDate('date', $date)
                    ->where('shift', $shift)
                    ->first();

                if (! $shouldPersist) {
                    if ($existing) {
                        $existing->delete();
                    }

                    continue;
                }

                $entryRow = [
                    'design' => $existing?->design ?? $design,
                    'weave_technique' => $existing?->weave_technique ?? $weave,
                    'colour' => $existing?->colour ?? $colour,
                    'yarn_order_id' => $existing?->yarn_order_id ?? $yarnOrderId,
                    'snapshot_order_label' => $existing?->snapshot_order_label,
                    'customer' => $existing?->customer,
                ];
                $this->loomConfigurationService->applyAssignmentSnapshotToRow(
                    $entryRow,
                    $loomId,
                    $date,
                    true,
                );
                $design = $entryRow['design'];
                $weave = $entryRow['weave_technique'];
                $colour = $entryRow['colour'];
                $yarnOrderId = $existing?->yarn_order_id ?? ($entryRow['yarn_order_id'] ?? $yarnOrderId);
                $snapshotOrderLabel = $existing?->snapshot_order_label ?? ($entryRow['snapshot_order_label'] ?? null);
                $customerSnapshot = $existing?->customer ?? ($entryRow['customer'] ?? null);

                $weaverIds = array_values(array_filter([(int) $w1 ?: null, (int) $w2 ?: null]));
                $op = null;
                if ($weaverIds !== []) {
                    $names = Weaver::query()->whereIn('id', $weaverIds)->pluck('weaver_name', 'id');
                    if (! empty($w1)) {
                        $op = $names[(int) $w1] ?? null;
                    }
                    if ($op === null && ! empty($w2)) {
                        $op = $names[(int) $w2] ?? null;
                    }
                }

                $payload = [
                    'loom_id' => $loomId,
                    'date' => $date,
                    'shift' => $shift,
                    'yarn_order_id' => $yarnOrderId,
                    'fabric_id' => $fabricId,
                    'design' => $design,
                    'weave_technique' => $weave,
                    'colour' => $colour,
                    'customer' => $customerSnapshot,
                    'snapshot_order_label' => $snapshotOrderLabel,
                    'meters_produced' => $meters,
                    'weaver1_id' => $w1 ?: null,
                    'weaver2_id' => $w2 ?: null,
                    'operator_name' => $op,
                    'rejected_meters' => $existing ? (float) $existing->rejected_meters : 0.0,
                ];

                if ($existing) {
                    $existing->update($payload);
                    $entries[] = $existing->fresh(['weaver1', 'weaver2']);
                } else {
                    $entries[] = LoomEntry::create($payload)->load(['weaver1', 'weaver2']);
                }
            }
        });

        return response()->json([
            'data' => [
                'entries' => LoomEntryResource::collection($entries)->resolve(),
            ],
        ], 201);
    }
}
