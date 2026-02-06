<?php

namespace App\Http\Controllers;

use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ServiceController extends Controller
{
    public function index()
    {
        return Service::with('variants')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'price_cents' => 'required|integer|min:0',
        ]);

        if ($request->hasFile('image')) {
            $image = $request->file('image');
            $imageName = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
            $image->move(public_path('uploads/services'), $imageName);
            $data['image'] = 'uploads/services/' . $imageName;
        }

        $service = Service::create($data);
        return $service->load('variants');
    }

    public function update(Request $request, Service $service)
    {
        // Debug: Log incoming request data
        Log::info('Service update request', [
            'method' => $request->method(),
            'all' => $request->all(),
            'has_name' => $request->has('name'),
            'name_value' => $request->input('name'),
            'has_duration' => $request->has('duration_minutes'),
            'duration_value' => $request->input('duration_minutes'),
            'has_price' => $request->has('price_cents'),
            'price_value' => $request->input('price_cents'),
            'content_type' => $request->header('Content-Type'),
        ]);
        
        // Validate required fields - handle both form data and JSON
        try {
            $data = $request->validate([
                'name' => 'required|string|max:255',
                'image' => 'sometimes|nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
                'price_cents' => 'required|integer|min:0',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation failed', [
                'errors' => $e->errors(),
                'request_data' => $request->all(),
            ]);
            throw $e;
        }

        // Handle image upload
        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($service->image && file_exists(public_path($service->image))) {
                @unlink(public_path($service->image));
            }
            $image = $request->file('image');
            $imageName = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
            $image->move(public_path('uploads/services'), $imageName);
            $data['image'] = 'uploads/services/' . $imageName;
        }

        // Update all provided fields
        $service->update($data);

        // Return fresh instance with all attributes and variants
        return $service->fresh()->load('variants');
    }

    public function destroy(Service $service)
    {
        // Check if service has any appointments
        $appointmentCount = \App\Models\Appointment::where('service_id', $service->id)->count();
        
        if ($appointmentCount > 0) {
            return response()->json([
                'message' => 'Cannot delete service with existing appointments. This service has ' . $appointmentCount . ' appointment(s).',
                'appointment_count' => $appointmentCount
            ], 422);
        }

        // Delete image if exists
        if ($service->image && file_exists(public_path($service->image))) {
            unlink(public_path($service->image));
        }

        $service->delete();
        return response()->json(['message' => 'Service deleted successfully']);
    }
}



