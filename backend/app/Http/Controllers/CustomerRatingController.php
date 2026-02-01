<?php

namespace App\Http\Controllers;

use App\Models\CustomerRating;
use App\Models\Appointment;
use Illuminate\Http\Request;

class CustomerRatingController extends Controller
{
    public function index(Request $request)
    {
        $query = CustomerRating::with(['appointment', 'stylist']);

        if ($request->has('stylist_id')) {
            $query->where('stylist_id', $request->stylist_id);
        }

        if ($request->has('appointment_id')) {
            $query->where('appointment_id', $request->appointment_id);
        }

        return $query->latest()->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'appointment_id' => 'required|exists:appointments,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string',
        ]);

        $appointment = Appointment::findOrFail($data['appointment_id']);

        $rating = CustomerRating::create([
            'appointment_id' => $data['appointment_id'],
            'stylist_id' => $appointment->stylist_id,
            'customer_name' => $appointment->customer_name,
            'customer_email' => $appointment->customer_email,
            'rating' => $data['rating'],
            'comment' => $data['comment'] ?? null,
        ]);

        return response()->json($rating->load(['appointment', 'stylist']), 201);
    }

    public function show(CustomerRating $customerRating)
    {
        return $customerRating->load(['appointment', 'stylist']);
    }

    public function destroy(CustomerRating $customerRating)
    {
        $customerRating->delete();
        return response()->json(['message' => 'Rating deleted successfully']);
    }
}

