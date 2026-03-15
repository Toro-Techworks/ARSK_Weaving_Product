<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GstRecordResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'invoice_number' => $this->invoice_number,
            'company_id' => $this->company_id,
            'company' => $this->whenLoaded('company', fn () => new CompanyResource($this->company)),
            'order_id' => $this->order_id,
            'order' => $this->whenLoaded('order', fn () => new OrderResource($this->order)),
            'date' => $this->date?->format('Y-m-d'),
            'taxable_value' => (float) $this->taxable_value,
            'gst_percentage' => (float) $this->gst_percentage,
            'gst_amount' => (float) $this->gst_amount,
            'total_amount' => (float) $this->total_amount,
            'description' => $this->description,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
