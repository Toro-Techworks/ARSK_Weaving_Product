<?php

namespace App\Http\Controllers;

use App\Http\Concerns\FormatsPaginatedResponses;

abstract class Controller
{
    use FormatsPaginatedResponses;
}
