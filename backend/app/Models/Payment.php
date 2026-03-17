<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    const MODE_CASH = 'Cash';
    const MODE_BANK = 'Bank';
    const MODE_UPI = 'UPI';

    const STATUS_OPEN = 'open';
    const STATUS_RUNNING = 'running';
    const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'company_id',
        'payment_date',
        'amount',
        'mode',
        'status',
        'reference_number',
        'notes',
    ];

    protected $casts = [
        'payment_date' => 'date',
        'amount' => 'decimal:2',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
