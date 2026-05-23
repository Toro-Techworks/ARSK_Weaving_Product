<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoomOrderAssignment extends Model
{
    protected $fillable = [
        'loom_id',
        'order_id',
        'fabric_id',
        'design',
        'weave_technique',
        'colour',
        'start_date',
        'end_date',
        'created_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function loom(): BelongsTo
    {
        return $this->belongsTo(Loom::class);
    }

    public function yarnOrder(): BelongsTo
    {
        return $this->belongsTo(YarnOrder::class, 'order_id');
    }

    public function fabric(): BelongsTo
    {
        return $this->belongsTo(Fabric::class);
    }
}
