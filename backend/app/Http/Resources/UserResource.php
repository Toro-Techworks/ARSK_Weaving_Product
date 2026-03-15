<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $roleName = $this->role_name;
        $roleLabel = $roleName ? ucfirst(str_replace('_', ' ', $roleName)) : null;
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role_id' => $this->role_id,
            'role' => $roleName,
            'role_label' => $roleLabel,
            'status' => $this->status,
            'status_label' => \App\Models\User::STATUSES[$this->status] ?? $this->status,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
