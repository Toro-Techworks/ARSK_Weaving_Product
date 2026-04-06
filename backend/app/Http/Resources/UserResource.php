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
        $status = $this->status;
        $statusLabel = $status !== null && $status !== ''
            ? (\App\Models\User::STATUSES[$status] ?? (string) $status)
            : null;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'username' => $this->username,
            'role_id' => $this->role_id,
            'role' => $roleName,
            'role_label' => $roleLabel,
            'status' => $status,
            'status_label' => $statusLabel,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
