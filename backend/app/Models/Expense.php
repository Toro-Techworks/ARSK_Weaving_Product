<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    use HasFactory;

    const CATEGORY_ELECTRICITY = 'Electricity';
    const CATEGORY_LABOUR = 'Labour';
    const CATEGORY_MAINTENANCE = 'Maintenance';
    const CATEGORY_YARN = 'Yarn';

    protected $fillable = [
        'category',
        'amount',
        'date',
        'notes',
    ];

    protected $casts = [
        'date' => 'date',
        'amount' => 'decimal:2',
    ];
}
