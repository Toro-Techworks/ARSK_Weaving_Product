<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoomEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'loom_id',
        'order_id',
        'date',
        'shift',
        'meters_produced',
        'rejected_meters',
        'operator_name',
        'net_production',
        'efficiency_percentage',
    ];

    protected $casts = [
        'date' => 'date',
        'meters_produced' => 'decimal:2',
        'rejected_meters' => 'decimal:2',
        'net_production' => 'decimal:2',
        'efficiency_percentage' => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::saving(function (LoomEntry $entry) {
            $entry->net_production = ($entry->meters_produced ?? 0) - ($entry->rejected_meters ?? 0);
            // Optional: efficiency based on expected production if you have a target
            if ($entry->meters_produced > 0 && $entry->rejected_meters !== null) {
                $entry->efficiency_percentage = round((1 - ($entry->rejected_meters / $entry->meters_produced)) * 100, 2);
            }
        });
    }

    public function loom(): BelongsTo
    {
        return $this->belongsTo(Loom::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
