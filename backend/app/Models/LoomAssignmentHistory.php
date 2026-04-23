<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoomAssignmentHistory extends Model
{
    protected $table = 'loom_assignment_history';

    protected $fillable = [
        'loom_id',
        'fabric_id',
        'yarn_order_id',
        'sl_number',
        'design',
        'weave_technique',
        'colour',
        'assigned_at',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
    ];

    public function loom(): BelongsTo
    {
        return $this->belongsTo(Loom::class);
    }

    public function fabric(): BelongsTo
    {
        return $this->belongsTo(Fabric::class);
    }
}
