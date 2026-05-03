<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Weaver extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'employee_code',
        'weaver_name',
        'phone',
        'address',
        'joining_date',
        'status',
    ];
}
