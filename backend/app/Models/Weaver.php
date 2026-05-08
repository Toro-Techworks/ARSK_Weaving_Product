<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Weaver extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'employee_code',
        'weaver_name',
        'phone',
        'address',
        'joining_date',
        'status',
        'account_number',
        'aadhar_number',
        'pan_number',
        'aadhar_document_path',
        'pan_document_path',
    ];

    /**
     * Next sequential code in the form EMP001, EMP002, … based on active (non-deleted) weavers.
     */
    public static function nextSuggestedEmployeeCode(): string
    {
        $max = 0;
        self::query()
            ->whereNull('deleted_at')
            ->where('employee_code', 'like', 'EMP%')
            ->pluck('employee_code')
            ->each(function ($code) use (&$max) {
                if (preg_match('/^EMP(\d+)$/i', (string) $code, $m)) {
                    $n = (int) $m[1];
                    if ($n > $max) {
                        $max = $n;
                    }
                }
            });

        $next = $max + 1;
        $width = max(3, strlen((string) $next));

        return 'EMP'.str_pad((string) $next, $width, '0', STR_PAD_LEFT);
    }
}
