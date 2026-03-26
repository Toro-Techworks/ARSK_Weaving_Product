<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class ProductionReportExport implements FromArray, WithHeadings
{
    private array $items;

    public function __construct(array $items)
    {
        $this->items = $items;
    }

    public function headings(): array
    {
        return [
            'Date',
            'Loom ID',
            'Loom',
            'Order ID',
            'Company (order from)',
            'Customer',
            'Fabric Type',
            'Shift',
            'Production (meters)',
            'Efficiency (%)',
        ];
    }

    public function array(): array
    {
        return array_map(function ($it) {
            return [
                $it['date'] ?? '',
                $it['loom_id'] ?? '',
                $it['loom_number'] ?? '',
                $it['order_id'] ?? '',
                $it['order_from'] ?? '',
                $it['customer'] ?? '',
                $it['fabric_type'] ?? '',
                $it['shift'] ?? '',
                $it['production_meters'] ?? 0,
                $it['efficiency_percentage'] ?? '',
            ];
        }, $this->items);
    }
}

