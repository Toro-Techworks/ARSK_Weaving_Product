<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ProductionReadinessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductionReadinessController extends Controller
{
    public function __construct(
        private ProductionReadinessService $productionReadinessService
    ) {}

    /**
     * GET /production-status?yarn_order_id=
     * Restricted to super_admin and admin (see route middleware).
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'yarn_order_id' => 'required|integer|exists:yarn_orders,id',
        ]);

        $payload = $this->productionReadinessService->compute((int) $validated['yarn_order_id']);

        return response()->json($payload);
    }
}
