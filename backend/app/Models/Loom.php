<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Loom extends Model
{
    use HasFactory;

    protected $fillable = [
        'loom_number',
        'location',
        'status',
    ];

    public function loomEntries(): HasMany
    {
        return $this->hasMany(LoomEntry::class);
    }
}
