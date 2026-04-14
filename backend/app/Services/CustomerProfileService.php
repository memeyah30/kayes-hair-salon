<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Customer;
use Illuminate\Support\Collection;

class CustomerProfileService
{
    public function normalizeEmail(string $email): string
    {
        return strtolower(trim($email));
    }

    public function normalizePhone(?string $phone): ?string
    {
        $normalized = preg_replace('/[\s-]/', '', (string) $phone);
        $normalized = trim((string) $normalized);

        return $normalized !== '' ? $normalized : null;
    }

    public function hasExistingCustomerData(string $email): bool
    {
        $email = $this->normalizeEmail($email);

        if ($email === '') {
            return false;
        }

        return Customer::query()->where('email', $email)->exists()
            || Appointment::query()->whereRaw('LOWER(customer_email) = ?', [$email])->exists();
    }

    public function findOrCreateCustomerByEmail(string $email): ?Customer
    {
        $email = $this->normalizeEmail($email);

        if ($email === '') {
            return null;
        }

        $customer = Customer::query()->where('email', $email)->first();
        $legacyProfile = $this->buildLegacyProfileFromAppointments($email);

        if (!$customer && !$legacyProfile) {
            return null;
        }

        if (!$customer) {
            $customer = Customer::create([
                'name' => $legacyProfile['name'] ?? null,
                'email' => $email,
                'phone' => $legacyProfile['phone'] ?? null,
                'address' => $legacyProfile['address'] ?? null,
            ]);
        } elseif ($legacyProfile) {
            $dirty = false;

            if (empty($customer->name) && !empty($legacyProfile['name'])) {
                $customer->name = $legacyProfile['name'];
                $dirty = true;
            }

            if (empty($customer->phone) && !empty($legacyProfile['phone'])) {
                $customer->phone = $legacyProfile['phone'];
                $dirty = true;
            }

            if (empty($customer->address) && !empty($legacyProfile['address'])) {
                $customer->address = $legacyProfile['address'];
                $dirty = true;
            }

            if ($dirty) {
                $customer->save();
            }
        }

        return $customer->fresh();
    }

    public function upsertCustomerFromBookingData(array $attributes, bool $markVerified = false): Customer
    {
        $email = $this->normalizeEmail((string) ($attributes['email'] ?? $attributes['customer_email'] ?? ''));

        if ($email === '') {
            throw new \InvalidArgumentException('Customer email is required.');
        }

        $customer = Customer::query()->firstOrNew(['email' => $email]);
        $legacyProfile = $this->buildLegacyProfileFromAppointments($email);

        if (!$customer->exists && $legacyProfile) {
            $customer->fill([
                'name' => $legacyProfile['name'] ?? null,
                'phone' => $legacyProfile['phone'] ?? null,
                'address' => $legacyProfile['address'] ?? null,
            ]);
        }

        $name = $this->cleanNullableString($attributes['name'] ?? $attributes['customer_name'] ?? null);
        $phone = $this->normalizePhone($attributes['phone'] ?? $attributes['customer_phone'] ?? null);
        $address = $this->cleanNullableString($attributes['address'] ?? $attributes['customer_address'] ?? null);

        if ($name !== null) {
            $customer->name = $name;
        }

        if ($phone !== null) {
            $customer->phone = $phone;
        }

        if (array_key_exists('address', $attributes) || array_key_exists('customer_address', $attributes)) {
            $customer->address = $address;
        }

        if ($markVerified) {
            $customer->last_verified_at = now();
        }

        $customer->save();

        return $customer->fresh();
    }

    public function updateProfile(Customer $customer, array $attributes): Customer
    {
        if (array_key_exists('name', $attributes)) {
            $customer->name = $this->cleanNullableString($attributes['name']);
        }

        if (array_key_exists('phone', $attributes)) {
            $customer->phone = $this->normalizePhone($attributes['phone']);
        }

        if (array_key_exists('address', $attributes)) {
            $customer->address = $this->cleanNullableString($attributes['address']);
        }

        $customer->last_verified_at = now();
        $customer->save();

        return $customer->fresh();
    }

    public function markVerified(Customer $customer): Customer
    {
        $customer->forceFill([
            'last_verified_at' => now(),
        ])->save();

        return $customer->fresh();
    }

    public function profileData(Customer $customer): array
    {
        return [
            'name' => (string) ($customer->name ?? ''),
            'email' => (string) $customer->email,
            'phone' => (string) ($customer->phone ?? ''),
            'address' => (string) ($customer->address ?? ''),
        ];
    }

    public function missingRequiredFields(Customer $customer): array
    {
        $missing = [];

        if ($this->cleanNullableString($customer->name) === null) {
            $missing[] = 'name';
        }

        if ($this->normalizePhone($customer->phone) === null) {
            $missing[] = 'phone';
        }

        return $missing;
    }

    public function isProfileComplete(Customer $customer): bool
    {
        return count($this->missingRequiredFields($customer)) === 0;
    }

    private function buildLegacyProfileFromAppointments(string $email): ?array
    {
        $appointments = Appointment::query()
            ->whereRaw('LOWER(customer_email) = ?', [$email])
            ->latest('start_datetime')
            ->latest('id')
            ->get([
                'customer_name',
                'customer_phone',
                'customer_address',
            ]);

        if ($appointments->isEmpty()) {
            return null;
        }

        return [
            'name' => $this->firstNonEmptyString($appointments, 'customer_name'),
            'phone' => $this->firstNonEmptyPhone($appointments, 'customer_phone'),
            'address' => $this->firstNonEmptyString($appointments, 'customer_address'),
        ];
    }

    private function firstNonEmptyString(Collection $items, string $field): ?string
    {
        foreach ($items as $item) {
            $value = $this->cleanNullableString($item->{$field} ?? null);

            if ($value !== null) {
                return $value;
            }
        }

        return null;
    }

    private function firstNonEmptyPhone(Collection $items, string $field): ?string
    {
        foreach ($items as $item) {
            $value = $this->normalizePhone($item->{$field} ?? null);

            if ($value !== null) {
                return $value;
            }
        }

        return null;
    }

    private function cleanNullableString(mixed $value): ?string
    {
        $cleaned = trim((string) $value);

        return $cleaned !== '' ? $cleaned : null;
    }
}
