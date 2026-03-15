<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\YarnOrder;
use App\Models\YarnRequirement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class YarnRequirementController extends Controller
{
    public function indexByYarnOrder(string $yarnOrderId): JsonResponse
    {
        if (! YarnOrder::where('id', $yarnOrderId)->exists()) {
            return response()->json(['message' => 'Yarn order not found.'], 404);
        }
        $items = YarnRequirement::where('yarn_order_id', $yarnOrderId)->orderBy('id')->get();
        return response()->json(['data' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'yarn_order_id' => 'required|exists:yarn_orders,id',
            'yarn_requirement' => 'nullable|string|max:255',
            'colour' => 'nullable|string|max:128',
            'count' => 'nullable|string|max:64',
            'content' => 'nullable|string|max:255',
            'required_weight' => 'nullable|numeric',
        ]);
        $item = YarnRequirement::create($validated);
        return response()->json(['data' => $item], 201);
    }

    public function update(Request $request, YarnRequirement $yarnRequirement): JsonResponse
    {
        $validated = $request->validate([
            'yarn_requirement' => 'nullable|string|max:255',
            'colour' => 'nullable|string|max:128',
            'count' => 'nullable|string|max:64',
            'content' => 'nullable|string|max:255',
            'required_weight' => 'nullable|numeric',
        ]);
        $yarnRequirement->update($validated);
        return response()->json(['data' => $yarnRequirement->fresh()]);
    }

    public function destroy(YarnRequirement $yarnRequirement): JsonResponse
    {
        $yarnRequirement->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
