<?php

namespace App\Services;

use App\Models\YarnReceipt;
use App\Models\YarnRequirement;
use Illuminate\Support\Collection;

class ProductionReadinessService
{
    private const STATUS_PROCEED = 'PROCEED';

    private const STATUS_NOT_ENOUGH = 'NOT ENOUGH';

    /**
     * One entry per yarn_requirements row. Receipts are summed by (count + content + colour).
     * Within each combo, received yarn is allocated to lines in requirement id order (FIFO). Each row’s
     * received_weight is the amount allocated to that line; line_status reflects whether that line is satisfied.
     * combo_status remains the aggregate (total required vs total received for the combo).
     *
     * @return array{data: list<array<string, mixed>>, overall_status: string, yarn_order_id: int, has_requirements: bool, error_message: ?string}
     */
    public function compute(int $yarnOrderId): array
    {
        $receipts = YarnReceipt::query()
            ->where('yarn_order_id', $yarnOrderId)
            ->get(['count', 'content', 'colour', 'net_weight']);

        $requirements = YarnRequirement::query()
            ->where('yarn_order_id', $yarnOrderId)
            ->orderBy('id')
            ->get(['id', 'yarn_requirement', 'count', 'content', 'colour', 'required_weight']);

        $receivedByCombo = $this->sumWeightsByCombo($receipts, 'net_weight');
        $requiredSumByCombo = $this->sumWeightsByCombo($requirements, 'required_weight');

        $comboKeys = $requiredSumByCombo->keys()->merge($receivedByCombo->keys())->unique()->values();

        $comboStatus = [];
        $comboErrors = [];
        foreach ($comboKeys as $ck) {
            $totReq = round((float) ($requiredSumByCombo->get($ck) ?? 0), 3);
            $totRec = round((float) ($receivedByCombo->get($ck) ?? 0), 3);
            $ok = $totReq <= 0.0 || $totRec + 1e-9 >= $totReq;
            $comboStatus[$ck] = $ok ? self::STATUS_PROCEED : self::STATUS_NOT_ENOUGH;
            if (! $ok && $totReq > 0) {
                [$c, $co, $cl] = $this->decodeComboKey($ck);
                $comboErrors[$ck] = $this->buildComboErrorMessage($c, $co, $cl, $totReq, $totRec);
            }
        }

        /** @var array<string, float> $remainingByCombo */
        $remainingByCombo = [];
        foreach ($receivedByCombo as $ck => $v) {
            $remainingByCombo[$ck] = round((float) $v, 3);
        }

        $data = [];
        foreach ($requirements as $row) {
            $ck = $this->comboKey($row->count ?? null, $row->content ?? null, $row->colour ?? null);
            $totRec = round((float) ($receivedByCombo->get($ck) ?? 0), 3);
            $totReqCombo = round((float) ($requiredSumByCombo->get($ck) ?? 0), 3);
            $st = $comboStatus[$ck] ?? self::STATUS_NOT_ENOUGH;

            $need = round((float) ($row->required_weight ?? 0), 3);
            $avail = (float) ($remainingByCombo[$ck] ?? 0.0);
            $allocated = $need <= 0.0 ? 0.0 : min($need, $avail);
            $lineOk = $need <= 0.0 || $allocated + 1e-9 >= $need;
            if ($need > 0.0) {
                $remainingByCombo[$ck] = max(0.0, round($avail - $allocated, 3));
            }
            $lineStatus = $lineOk ? self::STATUS_PROCEED : self::STATUS_NOT_ENOUGH;
            $lineError = null;
            if (! $lineOk && $need > 0.0) {
                $lineError = $this->buildLineErrorMessage(
                    $this->displayPart($row->count),
                    $this->displayPart($row->content),
                    $this->displayColourLabel($row->colour),
                    $need,
                    $allocated,
                    $totRec
                );
            }

            $data[] = [
                'req_id' => (int) $row->id,
                'yarn_requirement' => $this->displayLabel($row->yarn_requirement),
                'count' => $this->displayPart($row->count),
                'content' => $this->displayPart($row->content),
                'colour' => $this->displayColourLabel($row->colour),
                'required_weight' => $need,
                'received_weight' => round($allocated, 3),
                'total_required_for_combo' => $totReqCombo,
                'total_received_for_combo' => $totRec,
                'combo_status' => $st,
                'combo_error_message' => $comboErrors[$ck] ?? null,
                'line_status' => $lineStatus,
                'line_error_message' => $lineError,
            ];
        }

        $hasRequirements = $requirements->isNotEmpty();
        $overallStatus = $this->resolveOverallStatusFromLines($data, $hasRequirements);
        $errorMessage = $overallStatus === 'NOT READY'
            ? $this->buildOverallErrorMessageFromLines($data, $comboErrors)
            : null;

        return [
            'yarn_order_id' => $yarnOrderId,
            'has_requirements' => $hasRequirements,
            'overall_status' => $overallStatus,
            'error_message' => $errorMessage,
            'data' => $data,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $data
     */
    private function resolveOverallStatusFromLines(array $data, bool $hasRequirements): string
    {
        if (! $hasRequirements) {
            return 'NO_REQUIREMENTS';
        }

        if ($data === []) {
            return 'NOT READY';
        }

        foreach ($data as $row) {
            $need = (float) ($row['required_weight'] ?? 0);
            if ($need > 0.0 && ($row['line_status'] ?? '') !== self::STATUS_PROCEED) {
                return 'NOT READY';
            }
        }

        return 'READY FOR PRODUCTION';
    }

    /**
     * @param  list<array<string, mixed>>  $data
     * @param  array<string, string>  $comboErrors
     */
    private function buildOverallErrorMessageFromLines(array $data, array $comboErrors): string
    {
        $lineMsgs = [];
        foreach ($data as $row) {
            if (! empty($row['line_error_message'])) {
                $lineMsgs[] = (string) $row['line_error_message'];
            }
        }
        $lineMsgs = array_values(array_unique(array_filter($lineMsgs)));
        if ($lineMsgs !== []) {
            return 'Production cannot proceed: '.implode(' ', $lineMsgs);
        }

        $comboMsgs = array_values(array_unique(array_filter($comboErrors)));
        if ($comboMsgs !== []) {
            return 'Production cannot proceed: '.implode(' ', $comboMsgs);
        }

        return 'Yarn receipts do not satisfy production requirements for this order.';
    }

    private function buildComboErrorMessage(string $count, string $content, string $colour, float $totReq, float $totRec): string
    {
        $label = trim($count.' '.$content.' '.$colour);

        return '('.$label.') Required total '.round($totReq, 3).', received '.round($totRec, 3);
    }

    private function buildLineErrorMessage(
        string $count,
        string $content,
        string $colour,
        float $need,
        float $allocated,
        float $totalReceivedForCombo
    ): string {
        $label = trim($count.' '.$content.' '.$colour);

        return '('.$label.') Line required '.round($need, 3).'; allocated '.round($allocated, 3).' (combo receipts total '.round($totalReceivedForCombo, 3).').';
    }

    private function norm(?string $value): string
    {
        return strtolower(trim((string) ($value ?? '')));
    }

    private function comboKey(?string $count, ?string $content, ?string $colour): string
    {
        return json_encode(
            [
                $this->norm($count),
                $this->norm($content),
                $this->norm($colour),
            ],
            JSON_UNESCAPED_UNICODE
        );
    }

    /**
     * @return array{0: string, 1: string, 2: string}
     */
    private function decodeComboKey(string $key): array
    {
        $decoded = json_decode($key, true);
        if (! is_array($decoded) || count($decoded) !== 3) {
            return ['', '', ''];
        }

        return [(string) $decoded[0], (string) $decoded[1], (string) $decoded[2]];
    }

    /**
     * @param  Collection<int, YarnReceipt|YarnRequirement>  $rows
     * @return Collection<string, float>
     */
    private function sumWeightsByCombo(Collection $rows, string $weightColumn): Collection
    {
        $sums = collect();

        foreach ($rows as $row) {
            $ck = $this->comboKey($row->count ?? null, $row->content ?? null, $row->colour ?? null);
            $w = (float) ($row->{$weightColumn} ?? 0);
            $sums[$ck] = ($sums[$ck] ?? 0) + $w;
        }

        return $sums;
    }

    private function displayLabel(?string $value): string
    {
        $t = trim((string) ($value ?? ''));

        return $t === '' ? '—' : $t;
    }

    private function displayPart(?string $value): string
    {
        $n = $this->norm($value);

        return $n === '' ? '—' : $n;
    }

    private function displayColourLabel(?string $value): string
    {
        $n = $this->norm($value);

        return $n === '' ? '—' : $n;
    }
}
