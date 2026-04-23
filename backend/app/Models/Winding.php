<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Winding extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'winding_unit_id',
        'outward_date',
        'inward_date',
        'price_per_kg',
        'amount',
        'order_from',
        'yarn_order_id',
        'hank_kgs',
        'cone_kgs',
    ];

    protected $casts = [
        'outward_date' => 'date',
        'inward_date' => 'date',
        'price_per_kg' => 'decimal:2',
        'amount' => 'decimal:2',
        'hank_kgs' => 'decimal:3',
        'cone_kgs' => 'decimal:3',
    ];

    public function windingUnit(): BelongsTo
    {
        return $this->belongsTo(WindingUnit::class);
    }

    public function yarnOrder(): BelongsTo
    {
        return $this->belongsTo(YarnOrder::class);
    }
}
