<?php

namespace App\Support;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;

final class RegistersActivityLogListeners
{
    public static function register(): void
    {
        $map = config('activity_log.models', []);

        foreach ($map as $modelClass => $module) {
            if (! is_string($modelClass) || ! class_exists($modelClass)) {
                continue;
            }
            if (! is_subclass_of($modelClass, Model::class)) {
                continue;
            }

            $modelClass::saved(function (Model $model) use ($module) {
                if ($model->wasRecentlyCreated) {
                    ActivityLog::record(
                        auth()->id(),
                        'create',
                        $module,
                        self::description($module, $model->getKey(), 'created'),
                        $model->getKey()
                    );

                    return;
                }

                if (! $model->wasChanged()) {
                    return;
                }

                ActivityLog::record(
                    auth()->id(),
                    'update',
                    $module,
                    self::description($module, $model->getKey(), 'updated'),
                    $model->getKey()
                );
            });

            $modelClass::deleted(function (Model $model) use ($module) {
                ActivityLog::record(
                    auth()->id(),
                    'delete',
                    $module,
                    self::description($module, $model->getKey(), 'deleted'),
                    $model->getKey()
                );
            });
        }
    }

    /**
     * Human-readable line: "Order #12 was updated" (actor is stored separately as user_id).
     */
    public static function description(string $moduleKey, mixed $recordKey, string $pastPartic): string
    {
        $entity = self::entityLabel($moduleKey);

        return "{$entity} #{$recordKey} was {$pastPartic}";
    }

    public static function entityLabel(string $moduleKey): string
    {
        $map = config('activity_log.display_names', []);

        return $map[$moduleKey] ?? ucfirst(str_replace('_', ' ', $moduleKey));
    }
}
