<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    const STATUS_ACTIVE = 'active';

    const STATUS_INACTIVE = 'inactive';

    const STATUS_LEFT = 'left';

    /** @deprecated Legacy DB value; migrated to {@see STATUS_INACTIVE}. */
    const STATUS_DISABLED = 'disabled';

    public const STATUSES = [
        self::STATUS_ACTIVE => 'Active',
        self::STATUS_INACTIVE => 'Inactive',
        self::STATUS_LEFT => 'Left',
        self::STATUS_DISABLED => 'Inactive',
    ];

    protected $fillable = [
        'name',
        'username',
        'designation',
        'password',
        'role_id',
        'status',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'activity_logs_last_read_at' => 'datetime',
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function getRoleNameAttribute(): ?string
    {
        $rel = $this->getRelationValue('role');
        if ($rel && is_object($rel)) {
            return $rel->role_name ?? null;
        }
        $this->loadMissing('role');

        return $this->role?->role_name;
    }

    public function hasRole(string $roleName): bool
    {
        return $this->role_name === $roleName;
    }

    public function hasAnyRole(array $roleNames): bool
    {
        return in_array($this->role_name, $roleNames, true);
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super_admin');
    }

    public function isAdmin(): bool
    {
        return $this->hasRole('admin');
    }

    /** Super admin or admin (elevated back-office access). */
    public function isSuperAdminOrAdmin(): bool
    {
        return $this->hasAnyRole(['super_admin', 'admin']);
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }
}
