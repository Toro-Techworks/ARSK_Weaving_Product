<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Expense extends Model
{
    use HasFactory;

    const CATEGORY_ELECTRICITY = 'Electricity';

    const CATEGORY_LABOUR = 'Labour';

    const CATEGORY_MAINTENANCE = 'Maintenance';

    const CATEGORY_YARN = 'Yarn';

    /** Overheads absorbed by the textile / mill (not attributed to a single order). */
    public const SCOPE_TEXTILE = 'textile';

    /** Costs tied to a specific client yarn order (P.O.). */
    public const SCOPE_CLIENT_ORDER = 'client_order';

    protected $fillable = [
        'expense_scope',
        'category',
        'amount',
        'date',
        'notes',
        'yarn_order_id',
        'design',
        'size',
        'meter',
        'rate_per_meter',
    ];

    protected $casts = [
        'date' => 'date',
        'amount' => 'decimal:2',
        'meter' => 'decimal:4',
        'rate_per_meter' => 'decimal:4',
    ];

    public function yarnOrder(): BelongsTo
    {
        return $this->belongsTo(YarnOrder::class);
    }
}
