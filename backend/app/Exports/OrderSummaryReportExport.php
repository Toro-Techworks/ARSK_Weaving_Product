<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class OrderSummaryReportExport implements FromArray, WithHeadings
{
    public function __construct(private array $items) {}

    public function headings(): array
    {
        return ['Date', 'Order From', 'Total Orders'];
    }

    public function array(): array
    {
        return array_map(fn ($it) => [
            $it['date'] ?? '',
            $it['order_from'] ?? '',
            $it['total_orders'] ?? 0,
        ], $this->items);
    }
}

