<?php

namespace App\Http\Controllers;

use App\Models\ServiceVariant;
use App\Models\Service;
use Illuminate\Http\Request;

class ServiceVariantController extends Controller
{
    public function index(Service $service)
    {
        return $service->variants()->orderBy('order')->get();
    }

    public function store(Request $request, Service $service)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'price_cents' => 'required|integer|min:0',
            'order' => 'nullable|integer|min:0',
        ]);

        // If order not provided, set to next order
        if (!isset($data['order'])) {
            $maxOrder = $service->variants()->max('order') ?? -1;
            $data['order'] = $maxOrder + 1;
        }

        $variant = $service->variants()->create($data);
        return response()->json($variant, 201);
    }

    public function update(Request $request, ServiceVariant $serviceVariant)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'price_cents' => 'sometimes|integer|min:0',
            'order' => 'nullable|integer|min:0',
        ]);

        $serviceVariant->update($data);
        return response()->json($serviceVariant);
    }

    public function destroy(ServiceVariant $serviceVariant)
    {
        $serviceVariant->delete();
        return response()->json(['message' => 'Service variant deleted successfully']);
    }
}
