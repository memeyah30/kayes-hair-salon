<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithPagination;
use App\Models\Appointment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminCustomerController extends Controller
{
    use InteractsWithPagination;

    public function index(Request $request)
    {
        $data = $request->validate([
            'q' => ['nullable', 'string'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'paginate' => ['nullable'],
        ]);

        $query = Appointment::query()
            ->whereNotNull('customer_name')
            ->whereRaw("TRIM(customer_name) <> ''");

        if (!empty($data['q'])) {
            $search = strtolower(trim((string) $data['q']));
            $like = '%' . $search . '%';

            $query->where(function ($builder) use ($like) {
                $builder
                    ->whereRaw('LOWER(customer_name) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(COALESCE(customer_email, "")) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(COALESCE(customer_phone, "")) LIKE ?', [$like]);
            });
        }

        // Normalize customer identity in a subquery first so grouped pagination stays
        // compatible with MySQL strict ONLY_FULL_GROUP_BY mode.
        $normalizedCustomerRows = $query
            ->selectRaw("TRIM(customer_name) as customer_name")
            ->selectRaw("COALESCE(NULLIF(TRIM(customer_email), ''), '') as customer_email")
            ->selectRaw("COALESCE(NULLIF(TRIM(customer_phone), ''), '') as customer_phone");

        $customerGroups = DB::query()
            ->fromSub($normalizedCustomerRows, 'customer_rows')
            ->select([
                'customer_name',
                'customer_email',
                'customer_phone',
            ])
            ->selectRaw('COUNT(*) as total_appointments')
            ->groupBy('customer_name', 'customer_email', 'customer_phone')
            ->orderBy('customer_name');

        $perPage = $this->resolvePerPage($request);
        $paginator = $customerGroups->paginate($perPage);

        $customerItems = collect($paginator->items())->map(function ($customer) {
            $name = trim((string) $customer->customer_name);
            $email = trim((string) ($customer->customer_email ?? ''));
            $phone = trim((string) ($customer->customer_phone ?? ''));

            $appointments = Appointment::query()
                ->with(['stylist', 'service.variants', 'services.variants'])
                ->whereRaw('TRIM(customer_name) = ?', [$name])
                ->whereRaw("COALESCE(NULLIF(TRIM(customer_email), ''), '') = ?", [$email])
                ->whereRaw("COALESCE(NULLIF(TRIM(customer_phone), ''), '') = ?", [$phone])
                ->orderByDesc('start_datetime')
                ->get();

            $totalSpentCents = (int) $appointments
                ->where('status', 'completed')
                ->sum(fn (Appointment $appointment) => $this->getAppointmentTotalPriceCents($appointment));

            return [
                'customer_key' => md5(strtolower($name . '|' . $email . '|' . $phone)),
                'name' => $name,
                'email' => $email !== '' ? $email : null,
                'phone' => $phone !== '' ? $phone : null,
                'appointments' => $appointments->values(),
                'total_appointments' => (int) $appointments->count(),
                'completed_appointments' => (int) $appointments->where('status', 'completed')->count(),
                'cancelled_appointments' => (int) $appointments->where('status', 'cancelled')->count(),
                'missed_appointments' => (int) $appointments->where('status', 'missed')->count(),
                'total_spent_cents' => $totalSpentCents,
            ];
        })->values();

        $paginator->setCollection($customerItems);

        return response()->json($paginator);
    }

    private function getAppointmentTotalPriceCents(Appointment $appointment): int
    {
        if (is_numeric($appointment->total_amount_cents)) {
            return (int) $appointment->total_amount_cents;
        }

        if ($appointment->relationLoaded('services') && $appointment->services->isNotEmpty()) {
            return (int) $appointment->services->sum(function ($service) {
                return $this->getServicePriceCents($service);
            });
        }

        return $this->getServicePriceCents($appointment->service);
    }

    private function getServicePriceCents($service): int
    {
        if (!$service) {
            return 0;
        }

        $variantId = $service->pivot?->service_variant_id;
        if ($variantId && $service->relationLoaded('variants') && $service->variants) {
            $variant = $service->variants->firstWhere('id', $variantId);
            if ($variant && isset($variant->price_cents)) {
                return (int) $variant->price_cents;
            }
        }

        return (int) ($service->price_cents ?? 0);
    }
}
