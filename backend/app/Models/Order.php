<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory;

    const STATUS_PENDING = 'Pending';
    const STATUS_RUNNING = 'Running';
    const STATUS_COMPLETED = 'Completed';

    protected $fillable = [
        'dc_number',
        'company_id',
        'fabric_type',
        'quantity_meters',
        'rate_per_meter',
        'loom_id',
        'order_from',
        'customer',
        'weaving_unit',
        'po_number',
        'po_date',
        'delivery_date',
        'status',
        'total_amount',
        'gst_percentage',
        'gst_amount',
        'grand_total',
    ];

    protected $casts = [
        'po_date' => 'date',
        'delivery_date' => 'date',
        'quantity_meters' => 'decimal:2',
        'rate_per_meter' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'gst_percentage' => 'decimal:2',
        'gst_amount' => 'decimal:2',
        'grand_total' => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::creating(function (Order $order) {
            if (empty($order->dc_number)) {
                $order->dc_number = self::generateDcNumber();
            }
            self::calculateTotals($order);
        });
        static::updating(function (Order $order) {
            self::calculateTotals($order);
        });
    }

    public static function generateDcNumber(): string
    {
        $year = date('Y');
        $last = self::whereYear('created_at', $year)->orderBy('id', 'desc')->first();
        $seq = $last ? (int) substr($last->dc_number, -4) + 1 : 1;
        return sprintf('DC-%s-%04d', $year, $seq);
    }

    protected static function calculateTotals(Order $order): void
    {
        $order->total_amount = round($order->quantity_meters * $order->rate_per_meter, 2);
        $order->gst_amount = round($order->total_amount * ($order->gst_percentage ?? 12) / 100, 2);
        $order->grand_total = round($order->total_amount + $order->gst_amount, 2);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function loom(): BelongsTo
    {
        return $this->belongsTo(Loom::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function gstRecords(): HasMany
    {
        return $this->hasMany(GstRecord::class);
    }

}
