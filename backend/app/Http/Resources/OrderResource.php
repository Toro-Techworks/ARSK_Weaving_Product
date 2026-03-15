<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'dc_number' => $this->dc_number,
            'company_id' => $this->company_id,
            'company' => $this->whenLoaded('company', fn () => new CompanyResource($this->company)),
            'fabric_type' => $this->fabric_type,
            'quantity_meters' => (float) $this->quantity_meters,
            'rate_per_meter' => (float) $this->rate_per_meter,
            'loom_id' => $this->loom_id,
            'loom' => $this->whenLoaded('loom', fn () => new LoomResource($this->loom)),
            'order_from' => $this->order_from,
            'customer' => $this->customer,
            'weaving_unit' => $this->weaving_unit,
            'po_number' => $this->po_number,
            'po_date' => $this->po_date?->format('Y-m-d'),
            'delivery_date' => $this->delivery_date?->format('Y-m-d'),
            'status' => $this->status,
            'total_amount' => (float) $this->total_amount,
            'gst_percentage' => (float) $this->gst_percentage,
            'gst_amount' => (float) $this->gst_amount,
            'grand_total' => (float) $this->grand_total,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
