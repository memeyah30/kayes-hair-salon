<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithPagination;
use App\Models\AppointmentRating;
use App\Models\CustomerRating;
use App\Models\Appointment;
use Illuminate\Http\Request;

class CustomerRatingController extends Controller
{
    use InteractsWithPagination;

    public function index(Request $request)
    {
        $this->syncAppointmentRatingsToCustomerRatings();

        $request->validate([
            'appointment_id' => ['nullable', 'integer', 'exists:appointments,id'],
            'rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'paginate' => ['nullable'],
        ]);

        $query = CustomerRating::with(['appointment']);

        if ($request->filled('appointment_id')) {
            $query->where('appointment_id', $request->appointment_id);
        }

        if ($request->filled('rating')) {
            $query->where('rating', (int) $request->rating);
        }

        if ($this->shouldPaginate($request)) {
            $summaryQuery = clone $query;

            $distribution = (clone $summaryQuery)
                ->selectRaw('rating, COUNT(*) as total')
                ->groupBy('rating')
                ->pluck('total', 'rating');

            $summary = [
                'average_rating' => round((float) ((clone $summaryQuery)->avg('rating') ?? 0), 1),
                'total_ratings' => (int) ((clone $summaryQuery)->count()),
                'rating_distribution' => [
                    5 => (int) ($distribution[5] ?? 0),
                    4 => (int) ($distribution[4] ?? 0),
                    3 => (int) ($distribution[3] ?? 0),
                    2 => (int) ($distribution[2] ?? 0),
                    1 => (int) ($distribution[1] ?? 0),
                ],
            ];

            $paginator = $query->latest()->paginate($this->resolvePerPage($request));

            return response()->json(array_merge(
                $paginator->toArray(),
                ['summary' => $summary]
            ));
        }

        return $query->latest()->get();
    }

    public function publicIndex()
    {
        // Safe, public endpoint for the landing page (Home.jsx)
        $ratings = CustomerRating::query()
            ->where('rating', '>=', 4)
            ->whereNotNull('comment')
            ->latest()
            ->get(['id', 'customer_name', 'rating', 'comment', 'created_at']);

        return response()->json($ratings);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'appointment_id' => 'required|exists:appointments,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string',
        ]);

        $appointment = Appointment::findOrFail($data['appointment_id']);

        if ($appointment->status !== 'completed') {
            return response()->json([
                'message' => 'Only completed appointments can be rated.',
            ], 422);
        }

        $existingRating = CustomerRating::where('appointment_id', $appointment->id)->exists();
        if ($existingRating) {
            return response()->json([
                'message' => 'This appointment has already been rated.',
            ], 422);
        }

        $rating = CustomerRating::create([
            'appointment_id' => $data['appointment_id'],
            'customer_name' => $appointment->customer_name,
            'customer_email' => $appointment->customer_email,
            'rating' => $data['rating'],
            'comment' => $data['comment'] ?? null,
        ]);

        return response()->json($rating->load(['appointment']), 201);
    }

    public function show(CustomerRating $customerRating)
    {
        return $customerRating->load(['appointment']);
    }

    public function destroy(CustomerRating $customerRating)
    {
        // Also delete the source appointment rating if it exists to prevent re-sync
        if ($customerRating->appointment_id) {
            AppointmentRating::where('appointment_id', $customerRating->appointment_id)->delete();
        }

        $customerRating->delete();
        return response()->json(['message' => 'Rating deleted successfully']);
    }

    private function syncAppointmentRatingsToCustomerRatings(): void
    {
        $existingAppointmentIds = CustomerRating::query()
            ->pluck('appointment_id')
            ->all();

        $appointmentRatings = AppointmentRating::query()
            ->with('appointment')
            ->when(!empty($existingAppointmentIds), function ($query) use ($existingAppointmentIds) {
                $query->whereNotIn('appointment_id', $existingAppointmentIds);
            })
            ->get();

        foreach ($appointmentRatings as $appointmentRating) {
            $appointment = $appointmentRating->appointment;
            if (!$appointment) {
                continue;
            }

            $overallRating = (int) round(
                (((int) $appointmentRating->service_rating) + ((int) $appointmentRating->team_rating)) / 2
            );

            CustomerRating::query()->updateOrCreate(
                ['appointment_id' => $appointment->id],
                    [
                    'customer_name' => $appointment->customer_name,
                    'customer_email' => $appointment->customer_email ?: $appointmentRating->customer_email,
                    'rating' => max(1, min(5, $overallRating)),
                    'comment' => $appointmentRating->comment,
                ]
            );
        }
    }
}

