<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Fabric extends Model
{
    use HasFactory;

    protected $fillable = [
        'yarn_order_id',
        'description',
        'design',
        'weave_technique',
        'warp_count',
        'warp_content',
        'weft_count',
        'weft_content',
        'con_final_reed',
        'con_final_pick',
        'con_on_loom_reed',
        'con_on_loom_pick',
        'gsm_required',
        'required_width',
        'po_quantity',
        'price_per_metre',
        'total_meters_produced',
    ];

    protected $casts = [
        'con_final_reed' => 'decimal:3',
        'con_final_pick' => 'decimal:3',
        'con_on_loom_reed' => 'decimal:3',
        'con_on_loom_pick' => 'decimal:3',
        'gsm_required' => 'decimal:3',
        'required_width' => 'decimal:3',
        'po_quantity' => 'decimal:3',
        'price_per_metre' => 'decimal:2',
        'total_meters_produced' => 'decimal:3',
    ];

    public function yarnOrder(): BelongsTo
    {
        return $this->belongsTo(YarnOrder::class);
    }
}
