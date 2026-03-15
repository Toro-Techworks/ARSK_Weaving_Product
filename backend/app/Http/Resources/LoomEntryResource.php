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
            'order_id' => $this->order_id,
            'loom' => $this->whenLoaded('loom', fn () => new LoomResource($this->loom)),
            'order' => $this->whenLoaded('order', fn () => new \App\Http\Resources\OrderResource($this->order)),
            'date' => $this->date?->format('Y-m-d'),
            'shift' => $this->shift,
            'meters_produced' => (float) $this->meters_produced,
            'rejected_meters' => (float) $this->rejected_meters,
            'operator_name' => $this->operator_name,
            'net_production' => (float) $this->net_production,
            'efficiency_percentage' => $this->efficiency_percentage ? (float) $this->efficiency_percentage : null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
