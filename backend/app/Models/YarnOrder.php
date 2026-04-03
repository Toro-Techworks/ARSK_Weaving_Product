<?php

namespace App\Models;

use App\Support\ProductionMatrixReportBuilder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class YarnOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_from',
        'weaving_unit',
        'po_number',
        'customer',
        'po_date',
        'delivery_date',
    ];

    protected $casts = [
        'po_date' => 'date',
        'delivery_date' => 'date',
    ];

    protected static function booted(): void
    {
        static::saved(function (YarnOrder $order) {
            $order->persistDisplayOrderId();
        });
    }

    /**
     * Public order code (e.g. AEWU26000001) — same rules as {@see ProductionMatrixReportBuilder::formatOrderLabel}.
     * The numeric primary key remains {@see $id}; this is stored in {@see $display_order_id}.
     */
    public function computeDisplayOrderId(): string
    {
        $ymd = null;
        if ($this->po_date) {
            $ymd = $this->po_date->format('Y-m-d');
        } elseif ($this->created_at) {
            $ymd = $this->created_at->format('Y-m-d');
        }

        return ProductionMatrixReportBuilder::formatOrderLabel($this->id, $ymd);
    }

    /** Persist {@see $display_order_id} without dispatching Eloquent events (avoids save loops). */
    public function persistDisplayOrderId(): void
    {
        if (! $this->id) {
            return;
        }
        $desired = $this->computeDisplayOrderId();
        if (($this->display_order_id ?? '') !== $desired) {
            $this->forceFill(['display_order_id' => $desired])->saveQuietly();
        }
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
