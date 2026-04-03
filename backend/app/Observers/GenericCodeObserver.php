<?php

namespace App\Observers;

use App\Models\GenericCode;

class GenericCodeObserver
{
    public function saved(GenericCode $genericCode): void
    {
        GenericCode::forgetCacheForType($genericCode->code_type);
    }

    public function deleted(GenericCode $genericCode): void
    {
        GenericCode::forgetCacheForType($genericCode->code_type);
    }
}
