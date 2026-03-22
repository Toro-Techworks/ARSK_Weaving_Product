<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class YarnConsumptionReportExport implements FromArray, WithHeadings
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
            'Yarn Type',
            'Count',
            'Issued Quantity',
            'Consumed Quantity',
            'Balance',
            'Waste',
        ];
    }

    public function array(): array
    {
        return array_map(function ($it) {
            return [
                $it['date'] ?? '',
                $it['yarn_type'] ?? '',
                $it['count'] ?? '',
                $it['issued_qty'] ?? 0,
                $it['consumed_qty'] ?? 0,
                $it['balance'] ?? 0,
                $it['waste'] ?? 0,
            ];
        }, $this->items);
    }
}

