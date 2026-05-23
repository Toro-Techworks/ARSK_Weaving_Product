<?php

namespace App\Services;

use App\Models\ProductOwnerAuditLog;
use App\Models\User;
use Illuminate\Http\Request;

class ProductOwnerAuditLogger
{
    public static function log(
        User $actor,
        string $action,
        ?User $target = null,
        ?string $description = null,
        ?Request $request = null,
        ?array $metadata = null,
    ): void {
        ProductOwnerAuditLog::create([
            'actor_user_id' => $actor->id,
            'target_user_id' => $target?->id,
            'action' => $action,
            'description' => $description,
            'ip_address' => $request?->ip(),
            'user_agent' => $request ? substr((string) $request->userAgent(), 0, 500) : null,
            'metadata' => $metadata,
            'created_at' => now(),
        ]);
    }
}
