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
use Illuminate\Validation\ValidationException;

class LoomProductionController extends Controller
{
    public function __construct(
        private readonly DailyEntryLoomConfigurationService $loomConfigurationService,
    ) {}
    /**
     * Batch-apply daily entry cell changes grouped by (loom_id, date, shift).
     * Single transaction; avoids N sequential HTTP round-trips.
     */
    public function bulkUpdate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'changes' => 'required|array|max:2000',
            'changes.*.loom_id' => 'required|integer|exists:looms,id',
            'changes.*.date' => 'required|date_format:Y-m-d',
            'changes.*.shift' => GenericCode::validationRule('shift', true),
            'changes.*.row' => 'required|string|in:order,sl,meters,weaver1,weaver2',
            'changes.*.field' => 'required|string|in:yarn_order_id,fabric_id,meters,weaver1_id,weaver2_id',
            'changes.*.value' => 'nullable',
        ]);

        foreach ($validated['changes'] as $i => $ch) {
            $pair = [$ch['row'], $ch['field']];
            $ok = match ($pair) {
                ['order', 'yarn_order_id'],
                ['sl', 'fabric_id'],
                ['meters', 'meters'],
                ['weaver1', 'weaver1_id'],
                ['weaver2', 'weaver2_id'] => true,
                default => false,
            };
            if (! $ok) {
                throw ValidationException::withMessages([
                    "changes.$i" => ['row and field combination is invalid.'],
                ]);
            }
        }

        $grouped = [];
        foreach ($validated['changes'] as $ch) {
            $gkey = $ch['loom_id'].'|'.$ch['date'].'|'.$ch['shift'];
            $grouped[$gkey] ??= [
                'loom_id' => (int) $ch['loom_id'],
                'date' => $ch['date'],
                'shift' => $ch['shift'],
                'patches' => [],
            ];
            $grouped[$gkey]['patches'][] = $ch;
        }

        $deleted = [];
        $entries = [];

        DB::transaction(function () use ($grouped, &$deleted, &$entries) {
            foreach ($grouped as $g) {
                $loomId = $g['loom_id'];
                $date = $g['date'];
                $shift = $g['shift'];

                $existing = LoomEntry::query()
                    ->where('loom_id', $loomId)
                    ->whereDate('date', $date)
                    ->where('shift', $shift)
                    ->first();

                $row = $existing ? [
                    'yarn_order_id' => $existing->yarn_order_id,
                    'fabric_id' => $existing->fabric_id,
                    'design' => $existing->design,
                    'weave_technique' => $existing->weave_technique,
                    'colour' => $existing->colour,
                    'customer' => $existing->customer,
                    'snapshot_order_label' => $existing->snapshot_order_label,
                    'meters_produced' => (float) $existing->meters_produced,
                    'weaver1_id' => $existing->weaver1_id,
                    'weaver2_id' => $existing->weaver2_id,
                ] : [
                    'yarn_order_id' => null,
                    'fabric_id' => null,
                    'design' => null,
                    'weave_technique' => null,
                    'colour' => null,
                    'customer' => null,
                    'snapshot_order_label' => null,
                    'meters_produced' => 0.0,
                    'weaver1_id' => null,
                    'weaver2_id' => null,
                ];

                foreach ($g['patches'] as $patch) {
                    $this->applyPatch($row, $patch);
                }

                $willPersist = ((float) $row['meters_produced']) > 0
                    || ! empty($row['weaver1_id'])
                    || ! empty($row['weaver2_id'])
                    || ! empty($row['yarn_order_id'])
                    || ! empty($row['fabric_id']);

                $this->loomConfigurationService->applyAssignmentSnapshotToRow(
                    $row,
                    $loomId,
                    $date,
                    $willPersist,
                );

                if ($existing) {
                    $row['yarn_order_id'] = $existing->yarn_order_id ?? $row['yarn_order_id'];
                    $row['snapshot_order_label'] = $existing->snapshot_order_label ?? $row['snapshot_order_label'];
                    $row['customer'] = $existing->customer ?? $row['customer'];
                }

                $shouldPersist = ((float) $row['meters_produced']) > 0
                    || ! empty($row['weaver1_id'])
                    || ! empty($row['weaver2_id'])
                    || ! empty($row['yarn_order_id'])
                    || ! empty($row['fabric_id'])
                    || ! empty($row['design'])
                    || ! empty($row['weave_technique'])
                    || ! empty($row['colour']);

                if (! $shouldPersist) {
                    if ($existing) {
                        $existing->delete();
                        $deleted[] = [
                            'loom_id' => $loomId,
                            'date' => $date,
                            'shift' => $shift,
                        ];
                    }

                    continue;
                }

                $weaverIds = array_values(array_filter([$row['weaver1_id'], $row['weaver2_id'] ?? null]));
                $op = null;
                if ($weaverIds !== []) {
                    $names = Weaver::query()->whereIn('id', $weaverIds)->pluck('weaver_name', 'id');
                    if (! empty($row['weaver1_id'])) {
                        $op = $names[(int) $row['weaver1_id']] ?? null;
                    }
                    if ($op === null && ! empty($row['weaver2_id'])) {
                        $op = $names[(int) $row['weaver2_id']] ?? null;
                    }
                }

                $payload = [
                    'loom_id' => $loomId,
                    'date' => $date,
                    'shift' => $shift,
                    'yarn_order_id' => $row['yarn_order_id'],
                    'fabric_id' => $row['fabric_id'],
                    'design' => $row['design'],
                    'weave_technique' => $row['weave_technique'],
                    'colour' => $row['colour'],
                    'customer' => $row['customer'],
                    'snapshot_order_label' => $row['snapshot_order_label'],
                    'meters_produced' => round((float) $row['meters_produced'], 2),
                    'weaver1_id' => $row['weaver1_id'],
                    'weaver2_id' => $row['weaver2_id'],
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
                'deleted' => $deleted,
            ],
        ]);
    }

    /**
     * Compatibility batch endpoint:
     * Accepts a JSON array of:
     * [
     *   { loomId, date, shift, field, value }
     * ]
     *
     * It applies updates grouped by (loom_id, date, shift) in one transaction.
     */
    public function batchUpdate(Request $request): JsonResponse
    {
        $incoming = $request->json()->all();
        $changes = [];

        if (is_array($incoming) && array_is_list($incoming)) {
            $changes = $incoming;
        } elseif (is_array($incoming) && isset($incoming['changes']) && is_array($incoming['changes'])) {
            $changes = $incoming['changes'];
        }

        $loomSpecsIn = $incoming['loom_specs'] ?? [];
        $dateFromIn = $incoming['date_from'] ?? null;
        $dateToIn = $incoming['date_to'] ?? null;

        $hasSpecs = is_array($loomSpecsIn) && count($loomSpecsIn) > 0;
        $hasChanges = is_array($changes) && count($changes) > 0;

        if (! $hasChanges && ! $hasSpecs) {
            throw ValidationException::withMessages([
                'changes' => ['No changes to apply.'],
            ]);
        }

        $specBag = [
            'loom_specs' => [],
            'date_from' => null,
            'date_to' => null,
        ];
        if ($hasSpecs) {
            $specBag = validator([
                'loom_specs' => $loomSpecsIn,
                'date_from' => $dateFromIn,
                'date_to' => $dateToIn,
            ], [
                'loom_specs' => 'required|array|max:500',
                'loom_specs.*.loom_id' => 'required|integer|exists:looms,id',
                'loom_specs.*.design' => GenericCode::validationRule('design', false, GenericCode::DROPDOWN_TYPE_MASTER, 255),
                'loom_specs.*.weave_technique' => GenericCode::validationRule('weave_technique', false, GenericCode::DROPDOWN_TYPE_MASTER, 255),
                'loom_specs.*.colour' => GenericCode::validationRule('colour', false, GenericCode::DROPDOWN_TYPE_MASTER, 512),
                'date_from' => 'required|date_format:Y-m-d',
                'date_to' => 'required|date_format:Y-m-d',
            ])->validate();
        }

        $normalized = [];
        if ($hasChanges) {
            $normalized = array_values(array_map(function ($ch) {
                return [
                    'loom_id' => $ch['loomId'] ?? $ch['loom_id'] ?? null,
                    'date' => $ch['date'] ?? null,
                    'shift' => $ch['shift'] ?? null,
                    'field' => $ch['field'] ?? null,
                    'value' => $ch['value'] ?? null,
                ];
            }, $changes));
        }

        $validated = ['changes' => []];
        if ($hasChanges) {
            $validated = validator(['changes' => $normalized], [
                'changes' => 'required|array|max:2000',
                'changes.*.loom_id' => 'required|integer|exists:looms,id',
                'changes.*.date' => 'required|date_format:Y-m-d',
                'changes.*.shift' => GenericCode::validationRule('shift', true),
                'changes.*.field' => 'required|string|in:yarn_order_id,fabric_id,meters,weaver1_id,weaver2_id',
                'changes.*.value' => 'nullable',
            ])->validate();
        }

        $grouped = [];
        foreach ($validated['changes'] as $ch) {
            $gkey = $ch['loom_id'].'|'.$ch['date'].'|'.$ch['shift'];
            $grouped[$gkey] ??= [
                'loom_id' => (int) $ch['loom_id'],
                'date' => $ch['date'],
                'shift' => $ch['shift'],
                'patches' => [],
            ];
            $grouped[$gkey]['patches'][] = [
                'field' => $ch['field'],
                'value' => $ch['value'],
            ];
        }

        $dateFrom = $specBag['date_from'] ?? null;
        $dateTo = $specBag['date_to'] ?? null;

        $specByLoom = [];
        if ($hasSpecs) {
            foreach ($specBag['loom_specs'] as $s) {
                $specByLoom[(int) $s['loom_id']] = $s;
            }
        }

        $deleted = [];
        $entries = [];

        DB::transaction(function () use ($grouped, &$deleted, &$entries, $hasSpecs, $specBag, $dateFrom, $dateTo, $specByLoom) {
            foreach ($grouped as $g) {
                $loomId = $g['loom_id'];
                $date = $g['date'];
                $shift = $g['shift'];

                $existing = LoomEntry::query()
                    ->where('loom_id', $loomId)
                    ->whereDate('date', $date)
                    ->where('shift', $shift)
                    ->first();

                $row = $existing ? [
                    'yarn_order_id' => $existing->yarn_order_id,
                    'fabric_id' => $existing->fabric_id,
                    'design' => $existing->design,
                    'weave_technique' => $existing->weave_technique,
                    'colour' => $existing->colour,
                    'customer' => $existing->customer,
                    'snapshot_order_label' => $existing->snapshot_order_label,
                    'meters_produced' => (float) $existing->meters_produced,
                    'weaver1_id' => $existing->weaver1_id,
                    'weaver2_id' => $existing->weaver2_id,
                ] : [
                    'yarn_order_id' => null,
                    'fabric_id' => null,
                    'design' => null,
                    'weave_technique' => null,
                    'colour' => null,
                    'customer' => null,
                    'snapshot_order_label' => null,
                    'meters_produced' => 0.0,
                    'weaver1_id' => null,
                    'weaver2_id' => null,
                ];

                foreach ($g['patches'] as $patch) {
                    $this->applyPatch($row, $patch);
                }

                if ($spec = $specByLoom[$loomId] ?? null) {
                    if (! $this->loomConfigurationService->rowHasConfigSnapshot($row)) {
                        $row['design'] = $spec['design'] ?? null;
                        $row['weave_technique'] = $spec['weave_technique'] ?? null;
                        $row['colour'] = $spec['colour'] ?? null;
                    }
                }

                $willPersist = ((float) $row['meters_produced']) > 0
                    || ! empty($row['weaver1_id'])
                    || ! empty($row['weaver2_id'])
                    || ! empty($row['yarn_order_id'])
                    || ! empty($row['fabric_id'])
                    || ! empty($row['design'])
                    || ! empty($row['weave_technique'])
                    || ! empty($row['colour']);

                $this->loomConfigurationService->applyAssignmentSnapshotToRow(
                    $row,
                    $loomId,
                    $date,
                    $willPersist,
                );

                if ($existing) {
                    $row['yarn_order_id'] = $existing->yarn_order_id ?? $row['yarn_order_id'];
                    $row['snapshot_order_label'] = $existing->snapshot_order_label ?? $row['snapshot_order_label'];
                    $row['customer'] = $existing->customer ?? $row['customer'];
                }

                $shouldPersist = ((float) $row['meters_produced']) > 0
                    || ! empty($row['weaver1_id'])
                    || ! empty($row['weaver2_id'])
                    || ! empty($row['yarn_order_id'])
                    || ! empty($row['fabric_id'])
                    || ! empty($row['design'])
                    || ! empty($row['weave_technique'])
                    || ! empty($row['colour']);

                if (! $shouldPersist) {
                    if ($existing) {
                        $existing->delete();
                        $deleted[] = [
                            'loom_id' => $loomId,
                            'date' => $date,
                            'shift' => $shift,
                        ];
                    }

                    continue;
                }

                $weaverIds = array_values(array_filter([$row['weaver1_id'], $row['weaver2_id'] ?? null]));
                $op = null;
                if ($weaverIds !== []) {
                    $names = Weaver::query()->whereIn('id', $weaverIds)->pluck('weaver_name', 'id');
                    if (! empty($row['weaver1_id'])) {
                        $op = $names[(int) $row['weaver1_id']] ?? null;
                    }
                    if ($op === null && ! empty($row['weaver2_id'])) {
                        $op = $names[(int) $row['weaver2_id']] ?? null;
                    }
                }

                $payload = [
                    'loom_id' => $loomId,
                    'date' => $date,
                    'shift' => $shift,
                    'yarn_order_id' => $row['yarn_order_id'],
                    'fabric_id' => $row['fabric_id'],
                    'design' => $row['design'],
                    'weave_technique' => $row['weave_technique'],
                    'colour' => $row['colour'],
                    'customer' => $row['customer'],
                    'snapshot_order_label' => $row['snapshot_order_label'],
                    'meters_produced' => round((float) $row['meters_produced'], 2),
                    'weaver1_id' => $row['weaver1_id'],
                    'weaver2_id' => $row['weaver2_id'],
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

            if ($hasSpecs && $dateFrom && $dateTo) {
                foreach ($specBag['loom_specs'] as $spec) {
                    LoomEntry::query()
                        ->where('loom_id', (int) $spec['loom_id'])
                        ->whereDate('date', '>=', $dateFrom)
                        ->whereDate('date', '<=', $dateTo)
                        ->whereNull('design')
                        ->whereNull('weave_technique')
                        ->whereNull('colour')
                        ->update([
                            'design' => $spec['design'] ?? null,
                            'weave_technique' => $spec['weave_technique'] ?? null,
                            'colour' => $spec['colour'] ?? null,
                        ]);
                }
            }
        });

        return response()->json([
            'data' => [
                'entries' => LoomEntryResource::collection($entries)->resolve(),
                'deleted' => $deleted,
                'loom_specs_updated' => $hasSpecs,
            ],
        ]);
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  array{field: string, value: mixed}  $patch
     */
    private function applyPatch(array &$row, array $patch): void
    {
        $v = $patch['value'];

        switch ($patch['field']) {
            case 'yarn_order_id':
                $row['yarn_order_id'] = ($v === null || $v === '') ? null : (int) $v;

                return;
            case 'fabric_id':
                $row['fabric_id'] = ($v === null || $v === '') ? null : (int) $v;

                return;
            case 'meters':
                if ($v === null || $v === '') {
                    $row['meters_produced'] = 0.0;
                } else {
                    $row['meters_produced'] = round((float) $v, 2);
                }

                return;
            case 'weaver1_id':
                $row['weaver1_id'] = ($v === null || $v === '') ? null : (int) $v;

                return;
            case 'weaver2_id':
                $row['weaver2_id'] = ($v === null || $v === '') ? null : (int) $v;

                return;
        }
    }
}
