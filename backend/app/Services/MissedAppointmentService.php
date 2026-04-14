<?php

namespace App\Services;

use App\Models\Appointment;
use Carbon\Carbon;

class MissedAppointmentService
{
    private const ACTIVE_STATUSES = ['booked', 'confirmed', 'pending'];
    private const MISSED_STATUS = 'missed';
    private const TIMEZONE = 'Asia/Manila';

    /**
     * Automatically close overdue active appointments as missed.
     * The comparison uses the scheduled appointment start datetime, not the date alone.
     */
    public function markOverdueAppointmentsAsMissed(): int
    {
        return Appointment::query()
            ->whereIn('status', self::ACTIVE_STATUSES)
            ->where('start_datetime', '<', $this->nowUtc())
            ->update([
                'status' => self::MISSED_STATUS,
                'updated_at' => now(),
            ]);
    }

    public function refreshAppointmentStatus(Appointment $appointment): Appointment
    {
        if ($this->shouldBeMarkedMissed($appointment)) {
            $appointment->update([
                'status' => self::MISSED_STATUS,
            ]);
        }

        return $appointment->fresh() ?? $appointment;
    }

    public function isMissed(Appointment $appointment): bool
    {
        return strtolower(trim((string) $appointment->status)) === self::MISSED_STATUS;
    }

    private function shouldBeMarkedMissed(Appointment $appointment): bool
    {
        $status = strtolower(trim((string) $appointment->status));
        if (!in_array($status, self::ACTIVE_STATUSES, true)) {
            return false;
        }

        $rawStart = $appointment->getRawOriginal('start_datetime');
        if (!$rawStart) {
            return false;
        }

        return Carbon::parse($rawStart, 'UTC')->lt($this->nowUtc());
    }

    private function nowUtc(): Carbon
    {
        return Carbon::now(self::TIMEZONE)->setTimezone('UTC');
    }
}
