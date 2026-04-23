<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class WeavingUnit extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'company_name',
        'gst_number',
        'address',
        'contact_person',
        'phone',
        'payment_terms',
    ];
}
