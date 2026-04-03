<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class YarnReceipt extends Model
{
    use HasFactory;

    const TYPE_CONE = 'Cone';

    const TYPE_HANK = 'Hank';

    protected $fillable = [
        'yarn_order_id',
        'dc_no',
        'vehicle_details',
        'date',
        'count',
        'content',
        'colour',
        'type',
        'no_of_bags',
        'bundles',
        'knots',
        'net_weight',
        'gross_weight',
    ];

    protected $casts = [
        'date' => 'date',
        'no_of_bags' => 'integer',
        'bundles' => 'integer',
        'knots' => 'integer',
        'net_weight' => 'decimal:3',
        'gross_weight' => 'decimal:3',
    ];

    public function yarnOrder()
    {
        return $this->belongsTo(YarnOrder::class);
    }
}
