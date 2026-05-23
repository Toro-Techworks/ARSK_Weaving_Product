<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LoomResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'loom_number' => $this->loom_number,
            'location' => $this->location,
            'status' => $this->status,
            'inactive_reason' => $this->inactive_reason,
            'current_inactive_period' => $this->when(
                $this->relationLoaded('openInactiveHistory') && $this->openInactiveHistory,
                function () {
                    $row = $this->openInactiveHistory;
                    $start = $row->inactive_start_date;

                    return [
                        'inactive_reason' => $row->inactive_reason,
                        'remarks' => $row->remarks,
                        'inactive_since' => $start?->format('Y-m-d'),
                        'inactive_since_display' => $start?->format('d M Y'),
                    ];
                },
            ),
            'yarn_order_id' => $this->yarn_order_id,
            'fabric_id' => $this->fabric_id,
            'sl_number' => $this->whenLoaded('fabric', fn () => $this->fabric?->sl_number),
            'assigned_fabrics' => $this->whenLoaded('assignedFabrics', function () {
                return $this->assignedFabrics
                    ->map(fn ($f) => [
                        'id' => $f->id,
                        'yarn_order_id' => $f->yarn_order_id,
                        'sl_number' => $f->sl_number,
                        'design' => $f->design,
                        'weave_technique' => $f->weave_technique,
                        'colour' => $f->colour,
                        'loom_id' => $f->loom_id,
                    ])
                    ->values()
                    ->all();
            }),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
