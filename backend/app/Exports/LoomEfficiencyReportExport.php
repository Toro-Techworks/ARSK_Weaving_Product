<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class LoomEfficiencyReportExport implements FromArray, WithHeadings
{
    public function __construct(private array $items) {}

    public function headings(): array
    {
        return ['Loom ID', 'Loom', 'Net Production (m)', 'Efficiency (%)', 'Days Worked'];
    }

    public function array(): array
    {
        return array_map(fn ($it) => [
            $it['loom_id'] ?? '',
            $it['loom_number'] ?? '',
            $it['net_production'] ?? 0,
            $it['efficiency_percentage'] ?? '',
            $it['days_worked'] ?? 0,
        ], $this->items);
    }
}

