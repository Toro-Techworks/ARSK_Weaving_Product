<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WindingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'winding_unit_id' => $this->winding_unit_id,
            'winding_unit' => $this->whenLoaded('windingUnit', function () {
                return [
                    'id' => $this->windingUnit->id,
                    'company_name' => $this->windingUnit->company_name,
                ];
            }),
            'outward_date' => $this->outward_date?->format('Y-m-d'),
            'inward_date' => $this->inward_date?->format('Y-m-d'),
            'price_per_kg' => $this->price_per_kg !== null ? (float) $this->price_per_kg : null,
            'amount' => $this->amount !== null ? (float) $this->amount : null,
            'order_from' => $this->order_from,
            'yarn_order_id' => $this->yarn_order_id,
            'yarn_order' => $this->whenLoaded('yarnOrder', function () {
                $o = $this->yarnOrder;
                if (! $o) {
                    return null;
                }
                return [
                    'id' => $o->id,
                    'order_from' => $o->order_from,
                    'customer' => $o->customer,
                    'po_number' => $o->po_number,
                    'created_at' => $o->created_at?->toISOString(),
                ];
            }),
            'hank_kgs' => $this->hank_kgs !== null ? (float) $this->hank_kgs : null,
            'cone_kgs' => $this->cone_kgs !== null ? (float) $this->cone_kgs : null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];
    }
}
