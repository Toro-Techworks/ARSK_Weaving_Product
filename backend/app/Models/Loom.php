<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Loom extends Model
{
    use HasFactory;

    protected $fillable = [
        'loom_number',
        'location',
        'status',
        'inactive_reason',
        'yarn_order_id',
        'fabric_id',
    ];

    public function yarnOrder(): BelongsTo
    {
        return $this->belongsTo(YarnOrder::class);
    }

    public function fabric(): BelongsTo
    {
        return $this->belongsTo(Fabric::class);
    }

    public function assignedFabrics(): HasMany
    {
        return $this->hasMany(Fabric::class, 'loom_id');
    }

    public function loomEntries(): HasMany
    {
        return $this->hasMany(LoomEntry::class);
    }

    public function inactiveHistories(): HasMany
    {
        return $this->hasMany(LoomInactiveHistory::class);
    }

    public function openInactiveHistory(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(LoomInactiveHistory::class)
            ->whereNull('inactive_end_date')
            ->whereNotNull('inactive_start_date')
            ->latestOfMany('inactive_start_date');
    }
}
