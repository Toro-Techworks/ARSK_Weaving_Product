<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class YarnRequirement extends Model
{
    use HasFactory;

    protected $fillable = [
        'yarn_order_id',
        'yarn_requirement',
        'colour',
        'count',
        'content',
        'required_weight',
    ];

    protected $casts = [
        'required_weight' => 'decimal:3',
    ];

    public function yarnOrder(): BelongsTo
    {
        return $this->belongsTo(YarnOrder::class);
    }
}
