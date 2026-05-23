<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductOwnerUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $base = (new UserResource($this))->toArray($request);

        return array_merge($base, [
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'force_password_change' => (bool) $this->force_password_change,
            'is_hidden' => (bool) $this->is_hidden,
            'is_product_owner' => (bool) $this->is_product_owner,
        ]);
    }
}
