<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Weaver extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_code',
        'weaver_name',
        'phone',
        'address',
        'joining_date',
        'status',
    ];
}
