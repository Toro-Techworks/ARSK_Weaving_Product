<?php

namespace App\Models;

use App\Events\UserActionPerformed;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Log;

class ActivityLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'action',
        'module',
        'description',
        'record_id',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Activity is recorded (and notified) for admin and user roles only — not super_admin.
     */
    public static function shouldSkipForActor(?int $userId): bool
    {
        if ($userId === null) {
            return false;
        }

        if (auth()->check() && (int) auth()->id() === $userId && auth()->user()->isSuperAdmin()) {
            return true;
        }

        return User::query()
            ->whereKey($userId)
            ->whereHas('role', fn ($q) => $q->where('role_name', 'super_admin'))
            ->exists();
    }

    /**
     * @param  int|string|null  $recordId  Stored as integer when numeric; otherwise null (use description).
     */
    public static function record(?int $userId, string $action, string $module, string $description, int|string|null $recordId = null): void
    {
        if (static::shouldSkipForActor($userId)) {
            return;
        }

        $action = strtolower($action);
        if (! in_array($action, ['create', 'update', 'delete'], true)) {
            $action = 'update';
        }

        $recordIdStored = is_numeric($recordId) ? (int) $recordId : null;

        Log::info('Activity Log', [
            'module' => $module,
            'record_id' => $recordIdStored,
            'action' => $action,
            'actor_user_id' => $userId,
        ]);

        try {
            static::query()->create([
                'user_id' => $userId,
                'action' => $action,
                'module' => $module,
                'description' => $description,
                'record_id' => $recordIdStored,
                'created_at' => now(),
            ]);

            $broadcastDriver = config('broadcasting.default');
            if (in_array($broadcastDriver, ['pusher', 'reverb'], true)) {
                try {
                    if (config('app.debug')) {
                        Log::debug('activity_log.broadcast_dispatch', [
                            'driver' => $broadcastDriver,
                            'module' => $module,
                            'action' => $action,
                            'record_id' => $recordIdStored,
                        ]);
                    }
                    broadcast(new UserActionPerformed(
                        message: $description,
                        module: $module,
                        action: $action,
                        record_id: $recordIdStored,
                        actor_user_id: $userId,
                    ));
                } catch (\Throwable $e) {
                    Log::error('activity_notification_broadcast_failed', [
                        'message' => $e->getMessage(),
                        'exception' => $e::class,
                    ]);
                }
            } elseif (config('app.debug')) {
                Log::debug('activity_log.broadcast_skipped', ['driver' => $broadcastDriver]);
            }
        } catch (\Throwable $e) {
            Log::warning('activity_log: '.$e->getMessage());
        }
    }
}
