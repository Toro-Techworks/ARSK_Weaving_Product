<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserMenuPermission extends Model
{
    protected $fillable = [
        'user_id',
        'menu_id',
        'view_permission',
        'edit_permission',
    ];

    protected $casts = [
        'view_permission' => 'boolean',
        'edit_permission' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function menu(): BelongsTo
    {
        return $this->belongsTo(Menu::class);
    }
}
