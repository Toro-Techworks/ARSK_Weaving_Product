<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Company extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_name',
        'gst_number',
        'address',
        'contact_person',
        'phone',
        'payment_terms',
    ];

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function gstRecords(): HasMany
    {
        return $this->hasMany(GstRecord::class, 'company_id');
    }
}
