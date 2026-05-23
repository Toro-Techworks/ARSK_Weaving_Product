<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoomInactiveHistory extends Model
{
    protected $fillable = [
        'loom_id',
        'previous_status',
        'new_status',
        'inactive_reason',
        'remarks',
        'inactive_start_date',
        'inactive_end_date',
        'changed_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'inactive_start_date' => 'datetime',
            'inactive_end_date' => 'datetime',
        ];
    }

    public function loom(): BelongsTo
    {
        return $this->belongsTo(Loom::class);
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }
}
