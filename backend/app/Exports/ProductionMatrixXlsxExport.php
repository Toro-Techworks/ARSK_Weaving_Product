<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class ProductionMatrixXlsxExport implements FromArray, WithEvents, WithTitle
{
    /** @var array<string, array{rgb: string}> */
    private const FILL = [
        'header' => ['rgb' => 'E2E8F0'],
        'label_col' => ['rgb' => 'F8FAFC'],
        'weaver_data' => ['rgb' => 'F5F3FF'],
        'footer' => ['rgb' => 'FFFBEB'],
    ];

    private const BORDER_COLOR = 'CBD5E1';

    /**
     * @param  array<int, array<int, string|int|float>>  $rows
     * @param  string[]  $merges  A1-style ranges (e.g. A1:A2, C1:D1)
     */
    public function __construct(
        private array $rows,
        private array $merges,
    ) {}

    public function array(): array
    {
        return $this->rows;
    }

    public function title(): string
    {
        return 'Production matrix';
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                foreach ($this->merges as $range) {
                    try {
                        $sheet->mergeCells($range);
                    } catch (\Throwable) {
                    }
                }

                $rowCount = count($this->rows);
                $colCount = $rowCount > 0 ? count($this->rows[0]) : 0;
                if ($colCount < 1 || $rowCount < 1) {
                    return;
                }

                $lastCol = Coordinate::stringFromColumnIndex($colCount);
                $tableRange = "A1:{$lastCol}{$rowCount}";

                $thinBorder = [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => self::BORDER_COLOR],
                ];

                $sheet->getStyle($tableRange)->applyFromArray([
                    'borders' => [
                        'allBorders' => $thinBorder,
                    ],
                    'alignment' => [
                        'vertical' => Alignment::VERTICAL_CENTER,
                        'wrapText' => true,
                    ],
                ]);

                $sheet->getStyle("A1:{$lastCol}2")->applyFromArray([
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => self::FILL['header'],
                    ],
                    'font' => [
                        'bold' => true,
                        'color' => ['rgb' => '334155'],
                    ],
                ]);

                $sheet->getStyle("A1:{$lastCol}2")->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('A1:B2')->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER);

                if ($rowCount > 2) {
                    $sheet->getStyle("A3:B{$rowCount}")->applyFromArray([
                        'fill' => [
                            'fillType' => Fill::FILL_SOLID,
                            'startColor' => self::FILL['label_col'],
                        ],
                        'font' => [
                            'color' => ['rgb' => '475569'],
                        ],
                    ]);
                }

                if ($rowCount >= 4 && $colCount > 2) {
                    $sheet->getStyle("C3:{$lastCol}4")->applyFromArray([
                        'fill' => [
                            'fillType' => Fill::FILL_SOLID,
                            'startColor' => self::FILL['weaver_data'],
                        ],
                        'font' => [
                            'color' => ['rgb' => '4C1D95'],
                        ],
                    ]);
                }

                if ($rowCount >= 3) {
                    $footerStart = $rowCount - 2;
                    $sheet->getStyle("A{$footerStart}:{$lastCol}{$rowCount}")->applyFromArray([
                        'fill' => [
                            'fillType' => Fill::FILL_SOLID,
                            'startColor' => self::FILL['footer'],
                        ],
                        'font' => [
                            'bold' => true,
                            'color' => ['rgb' => '78350F'],
                        ],
                    ]);
                }

                $sheet->getStyle("C3:{$lastCol}{$rowCount}")
                    ->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_RIGHT);

                foreach (range(1, $colCount) as $ci) {
                    $sheet->getColumnDimensionByColumn($ci)->setWidth(min(18, max(10, 12)));
                }
            },
        ];
    }
}
