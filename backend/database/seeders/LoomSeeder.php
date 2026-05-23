<?php

namespace Database\Seeders;

use App\Models\Loom;
use Illuminate\Database\Seeder;

class LoomSeeder extends Seeder
{
    /**
     * Seed 10 looms (ARSK001–ARSK010). Safe to re-run: uses updateOrCreate on loom_number.
     */
    public function run(): void
    {
        for ($i = 1; $i <= 10; $i++) {
            $loomNumber = 'ARSK'.str_pad((string) $i, 3, '0', STR_PAD_LEFT);

            Loom::updateOrCreate(
                ['loom_number' => $loomNumber],
                [
                    'location' => 'Main shed',
                    'status' => 'Active',
                    'inactive_reason' => null,
                    'yarn_order_id' => null,
                    'fabric_id' => null,
                ]
            );
        }
    }
}
