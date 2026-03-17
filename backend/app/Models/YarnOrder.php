<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class YarnOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'loom_id',
        'order_from',
        'weaving_unit',
        'design',
        'po_number',
        'customer',
        'po_date',
        'delivery_date',
    ];

    protected $casts = [
        'po_date' => 'date',
        'delivery_date' => 'date',
    ];

    public function loom(): BelongsTo
    {
        return $this->belongsTo(Loom::class);
    }

    public function yarnReceipts()
    {
        return $this->hasMany(YarnReceipt::class);
    }

    public function fabrics()
    {
        return $this->hasMany(Fabric::class);
    }

    public function yarnRequirements()
    {
        return $this->hasMany(YarnRequirement::class);
    }
}
