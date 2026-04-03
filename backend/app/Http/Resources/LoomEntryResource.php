<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LoomEntryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'loom_id' => $this->loom_id,
            'yarn_order_id' => $this->yarn_order_id,
            'fabric_id' => $this->fabric_id,
            'loom' => $this->whenLoaded('loom', fn () => new LoomResource($this->loom)),
            'date' => $this->date?->format('Y-m-d'),
            'shift' => $this->shift,
            'meters_produced' => (float) $this->meters_produced,
            'production' => (float) $this->meters_produced,
            'rejected_meters' => (float) $this->rejected_meters,
            'operator_name' => $this->operator_name,
            'weaver1_id' => $this->weaver1_id,
            'weaver2_id' => $this->weaver2_id,
            'weaver1_name' => $this->whenLoaded('weaver1', fn () => $this->weaver1?->weaver_name),
            'weaver2_name' => $this->whenLoaded('weaver2', fn () => $this->weaver2?->weaver_name),
            'remarks' => $this->remarks,
            'net_production' => (float) $this->net_production,
            'efficiency_percentage' => $this->efficiency_percentage ? (float) $this->efficiency_percentage : null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
