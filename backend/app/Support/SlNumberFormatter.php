<?php

namespace App\Support;

use App\Models\Fabric;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fabric / style line (SL) code: {4 company letters}_{7-digit order tail}_{001…}.
 *
 * Company text uses {@see YarnOrder::$order_from}. The middle segment is the **last 7 digits** (digits only)
 * of {@see YarnOrder::$display_order_id} when stored; otherwise the same rule applied to
 * {@see ProductionMatrixReportBuilder::formatOrderLabel} (YY + 5-digit sequence).
 */
final class SlNumberFormatter
{
    /**
     * First four letters from the company name (letters only), uppercase. Pad with X if fewer than four.
     */
    public static function companyLetterPrefix(?string $companyName): string
    {
        $name = (string) $companyName;
        $letters = '';

        if ($name !== '' && preg_match_all('/\p{L}/u', $name, $matches)) {
            $n = 0;
            foreach ($matches[0] as $ch) {
                if ($n >= 4) {
                    break;
                }
                $letters .= function_exists('mb_strtoupper')
                    ? mb_strtoupper($ch, 'UTF-8')
                    : strtoupper($ch);
                $n++;
            }
        }

        if ($letters === '') {
            return 'XXXX';
        }

        return str_pad($letters, 4, 'X', STR_PAD_RIGHT);
    }

    /**
     * Last 7 digits of the order’s public code (digits only): prefers {@see YarnOrder::$display_order_id},
     * else {@see ProductionMatrixReportBuilder::formatOrderLabel}.
     */
    public static function orderLastSevenDigits(mixed $yarnOrderId, ?string $orderDateYmd = null, ?string $displayOrderId = null): string
    {
        $label = null;
        if ($displayOrderId !== null && $displayOrderId !== '') {
            $label = $displayOrderId;
        } elseif ($yarnOrderId !== null && $yarnOrderId !== '') {
            $label = ProductionMatrixReportBuilder::formatOrderLabel($yarnOrderId, $orderDateYmd);
        }
        if ($label === null || $label === '') {
            return '0000000';
        }

        $digits = preg_replace('/\D/', '', $label);
        if ($digits === '') {
            return '0000000';
        }

        if (strlen($digits) >= 7) {
            return substr($digits, -7);
        }

        return str_pad($digits, 7, '0', STR_PAD_LEFT);
    }

    /**
     * Line suffix: 001, 002, … (three digits up to 999; wider if needed).
     */
    public static function sequenceSuffix(int $sequenceOneBased): string
    {
        $n = max(1, $sequenceOneBased);
        if ($n <= 999) {
            return str_pad((string) $n, 3, '0', STR_PAD_LEFT);
        }

        return (string) $n;
    }

    public static function format(?string $companyName, int|string $yarnOrderId, int $sequenceOneBased, ?string $orderDateYmd = null, ?string $displayOrderId = null): string
    {
        $prefix = self::companyLetterPrefix($companyName);
        $mid = self::orderLastSevenDigits($yarnOrderId, $orderDateYmd, $displayOrderId);
        $seq = self::sequenceSuffix($sequenceOneBased);

        return "{$prefix}_{$mid}_{$seq}";
    }

    /**
     * @return array<int, int> fabric id => 1-based sequence (fabrics ordered by id within the yarn order)
     */
    public static function sequenceByFabricIdForYarnOrder(int $yarnOrderId): array
    {
        $ids = DB::table('fabrics')
            ->where('yarn_order_id', $yarnOrderId)
            ->orderBy('id')
            ->pluck('id')
            ->all();

        $map = [];
        $seq = 0;
        foreach ($ids as $fid) {
            $seq++;
            $map[(int) $fid] = $seq;
        }

        return $map;
    }

    public static function fabricsTableHasSlNumberColumn(): bool
    {
        try {
            return Schema::hasColumn('fabrics', 'sl_number');
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * Recompute and save {@see Fabric::$sl_number} for every fabric row on this yarn order (by id order).
     */
    public static function refreshSlNumbersForYarnOrder(int $yarnOrderId): void
    {
        if (! self::fabricsTableHasSlNumberColumn()) {
            return;
        }

        $seqMap = self::sequenceByFabricIdForYarnOrder($yarnOrderId);
        $fabrics = Fabric::query()->where('yarn_order_id', $yarnOrderId)->orderBy('id')->get();
        foreach ($fabrics as $fabric) {
            $sl = self::forFabric($fabric, $seqMap);
            if ($fabric->sl_number !== $sl) {
                $fabric->forceFill(['sl_number' => $sl])->saveQuietly();
            }
        }
    }

    /**
     * @param  array<int, int>|null  $sequenceByFabricId  From {@see sequenceByFabricIdForYarnOrder} when batching.
     */
    public static function forFabric(Fabric $fabric, ?array $sequenceByFabricId = null): string
    {
        $fabric->loadMissing('yarnOrder');
        $yo = $fabric->yarnOrder;
        $oid = (int) $fabric->yarn_order_id;
        $seqMap = $sequenceByFabricId ?? self::sequenceByFabricIdForYarnOrder($oid);
        $seq = $seqMap[(int) $fabric->id] ?? 1;
        $po = $yo?->po_date;
        $orderDateYmd = $po
            ? ($po instanceof \DateTimeInterface ? $po->format('Y-m-d') : substr((string) $po, 0, 10))
            : null;
        $displayOrderId = $yo?->display_order_id;

        return self::format($yo?->order_from, $oid, $seq, $orderDateYmd, $displayOrderId);
    }

    /**
     * @param  array<int, int>|null  $sequenceByFabricId
     * @return array<string, mixed>
     */
    public static function fabricToArrayWithSlNumber(Fabric $fabric, ?array $sequenceByFabricId = null): array
    {
        $stored = $fabric->sl_number;
        $sl = ($stored !== null && $stored !== '')
            ? $stored
            : self::forFabric($fabric, $sequenceByFabricId);

        return array_merge($fabric->toArray(), [
            'sl_number' => $sl,
        ]);
    }
}
