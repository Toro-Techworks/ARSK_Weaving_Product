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
    const STATUS_DISABLED = 'disabled';

    const STATUSES = [
        self::STATUS_ACTIVE => 'Active',
        self::STATUS_DISABLED => 'Disabled',
    ];

    protected $fillable = [
        'name',
        'email',
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
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
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
        if (array_key_exists('role', $this->attributes)) {
            return (string) $this->attributes['role'];
        }
        $this->loadMissing('role');
        $rel = $this->getRelation('role');
        return $rel?->role_name;
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

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function hasMenuPermission(string $menuKey, string $action = 'view'): bool
    {
        if (!$this->role_id) {
            return false;
        }
        $col = match ($action) {
            'create' => 'can_create',
            'edit' => 'can_edit',
            'delete' => 'can_delete',
            default => 'can_view',
        };
        return RoleMenuPermission::where('role_id', $this->role_id)
            ->whereHas('menu', fn ($q) => $q->where('menu_key', $menuKey))
            ->where($col, true)
            ->exists();
    }

    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }
}
