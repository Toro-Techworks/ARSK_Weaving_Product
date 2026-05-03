<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'expense_scope' => $this->expense_scope,
            'category' => $this->category,
            'amount' => (float) $this->amount,
            'date' => $this->date?->format('Y-m-d'),
            'notes' => $this->notes,
            'yarn_order_id' => $this->yarn_order_id,
            'design' => $this->design,
            'size' => $this->size,
            'meter' => $this->meter !== null ? (float) $this->meter : null,
            'rate_per_meter' => $this->rate_per_meter !== null ? (float) $this->rate_per_meter : null,
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
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
