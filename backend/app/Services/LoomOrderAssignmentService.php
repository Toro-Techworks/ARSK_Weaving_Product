<?php

namespace App\Services;

use App\Models\Fabric;
use App\Models\LoomOrderAssignment;
use App\Models\YarnOrder;
use App\Support\ProductionMatrixReportBuilder;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Auth;

class LoomOrderAssignmentService
{
    /**
     * Close the open assignment for a loom and start a new date-range row (from today).
     */
    public function assignFabricToLoom(int $loomId, Fabric $fabric): void
    {
        $today = CarbonImmutable::today()->format('Y-m-d');
        $yesterday = CarbonImmutable::today()->subDay()->format('Y-m-d');

        LoomOrderAssignment::query()
            ->where('loom_id', $loomId)
            ->whereNull('end_date')
            ->update(['end_date' => $yesterday]);

        if ($fabric->yarn_order_id === null) {
            return;
        }

        LoomOrderAssignment::create([
            'loom_id' => $loomId,
            'order_id' => (int) $fabric->yarn_order_id,
            'fabric_id' => (int) $fabric->id,
            'design' => $fabric->design,
            'weave_technique' => $fabric->weave_technique,
            'colour' => $fabric->colour,
            'start_date' => $today,
            'end_date' => null,
            'created_by' => Auth::id(),
        ]);
    }

    /**
     * End the current open assignment when a loom is unassigned.
     */
    public function unassignLoom(int $loomId): void
    {
        $today = CarbonImmutable::today()->format('Y-m-d');

        LoomOrderAssignment::query()
            ->where('loom_id', $loomId)
            ->whereNull('end_date')
            ->update(['end_date' => $today]);
    }

    /**
     * @param  list<int>  $loomIds
     * @param  list<string>  $dates
     * @return array<int, array<string, array{design: ?string, weave_technique: ?string, colour: ?string, order_id: ?string, customer: ?string}>>
     */
    public function resolveForLoomsAndDates(array $loomIds, array $dates): array
    {
        if ($loomIds === [] || $dates === []) {
            return [];
        }

        $assignments = LoomOrderAssignment::query()
            ->with(['yarnOrder:id,customer,display_order_id,po_date,created_at'])
            ->whereIn('loom_id', $loomIds)
            ->where('start_date', '<=', $dates[count($dates) - 1])
            ->where(function ($q) use ($dates) {
                $q->whereNull('end_date')
                    ->orWhere('end_date', '>=', $dates[0]);
            })
            ->orderBy('loom_id')
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->get();

        $result = [];
        foreach ($loomIds as $lid) {
            foreach ($dates as $d) {
                $match = $assignments->first(function ($a) use ($lid, $d) {
                    if ((int) $a->loom_id !== $lid) {
                        return false;
                    }
                    $start = $a->start_date instanceof \Carbon\CarbonInterface
                        ? $a->start_date->format('Y-m-d')
                        : (string) $a->start_date;
                    if ($start > $d) {
                        return false;
                    }
                    if ($a->end_date === null) {
                        return true;
                    }
                    $end = $a->end_date instanceof \Carbon\CarbonInterface
                        ? $a->end_date->format('Y-m-d')
                        : (string) $a->end_date;

                    return $end >= $d;
                });

                $order = $match?->yarnOrder;
                $result[$lid][$d] = [
                    'design' => $match?->design,
                    'weave_technique' => $match?->weave_technique,
                    'colour' => $match?->colour,
                    'yarn_order_id' => $match?->order_id ? (int) $match->order_id : null,
                    'order_id' => self::orderDisplayLabel($match?->order_id, $order, $d),
                    'customer' => self::customerLabel($order),
                ];
            }
        }

        return $result;
    }

    public static function orderDisplayLabel(?int $orderId, ?YarnOrder $order, string $dateYmd): ?string
    {
        if ($order) {
            $label = $order->display_order_id ?? ProductionMatrixReportBuilder::formatOrderLabel($order->id, $dateYmd);

            return $label !== '' ? $label : null;
        }
        if ($orderId) {
            $label = ProductionMatrixReportBuilder::formatOrderLabel($orderId, $dateYmd);

            return $label !== '' ? $label : null;
        }

        return null;
    }

    public static function customerLabel(?YarnOrder $order): ?string
    {
        if (! $order || $order->customer === null) {
            return null;
        }
        $c = trim((string) $order->customer);

        return $c !== '' ? $c : null;
    }
}
