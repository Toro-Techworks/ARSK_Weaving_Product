<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'company_id' => $this->company_id,
            'yarn_order_id' => $this->yarn_order_id,
            'company' => $this->whenLoaded('company', fn () => new CompanyResource($this->company)),
            'yarn_order' => $this->when(
                $this->relationLoaded('yarnOrder') && $this->yarnOrder !== null,
                fn () => [
                    'id' => $this->yarnOrder->id,
                    'display_order_id' => $this->yarnOrder->display_order_id,
                    'po_number' => $this->yarnOrder->po_number,
                    'customer' => $this->yarnOrder->customer,
                    'order_from' => $this->yarnOrder->order_from,
                ]
            ),
            'payment_date' => $this->payment_date?->format('Y-m-d'),
            'amount' => (float) $this->amount,
            'mode' => $this->mode,
            'status' => $this->status,
            'reference_number' => $this->reference_number,
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
