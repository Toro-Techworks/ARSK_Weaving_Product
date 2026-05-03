<?php

use App\Models\ActivityLog;

if (! function_exists('log_activity')) {
    function log_activity(?int $userId, string $action, string $module, string $description, int|string|null $recordId = null): void
    {
        ActivityLog::record($userId, $action, $module, $description, $recordId);
    }
}

if (! function_exists('logActivity')) {
    /**
     * Legacy signature: (actorUserId, action, module, description, recordId?).
     */
    function logActivity(?int $userId, string $action, string $module, string $description, int|string|null $recordId = null): void
    {
        ActivityLog::record($userId, $action, $module, $description, $recordId);
    }
}

if (! function_exists('log_audit')) {
    /**
     * Preferred convenience: actor = auth()->id(), correct module + record + human description.
     * Action: create | update | delete (or Created/Updated/Deleted — normalized to lowercase).
     */
    function log_audit(string $module, string $action, int|string|null $recordId, string $description, ?int $actorUserId = null): void
    {
        ActivityLog::record($actorUserId ?? auth()->id(), $action, $module, $description, $recordId);
    }
}
