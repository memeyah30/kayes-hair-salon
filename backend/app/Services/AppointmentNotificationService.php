<?php

namespace App\Services;

use App\Mail\AppointmentApprovedMail;
use App\Mail\ReminderMail;
use App\Models\Appointment;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Carbon\Carbon;
use Illuminate\Support\Facades\Mail;

class AppointmentNotificationService
{
    public function loadAppointmentForMail(Appointment $appointment): Appointment
    {
        return $appointment->loadMissing([
            'stylist:id,name',
            'service:id,name,price_cents',
            'services:id,name,price_cents',
            'services.variants:id,service_id,name,price_cents',
        ]);
    }

    public function receiptUrl(Appointment $appointment): string
    {
        return url('/appointments/' . $appointment->getKey() . '/receipt');
    }

    public function qrCodeImageUrl(Appointment $appointment): string
    {
        return url('/appointments/' . $appointment->getKey() . '/qr-code');
    }

    public function qrPayload(Appointment $appointment): string
    {
        return $this->receiptUrl($appointment);
    }

    public function qrCodeSvg(Appointment $appointment): string
    {
        $renderer = new ImageRenderer(
            new RendererStyle(320, 12),
            new SvgImageBackEnd()
        );

        return (new Writer($renderer))->writeString($this->qrPayload($appointment));
    }

    public function mailViewData(Appointment $appointment): array
    {
        $appointment = $this->loadAppointmentForMail($appointment);
        $serviceItems = $this->serviceItems($appointment);
        $start = $this->appointmentStartManila($appointment);
        $end = $this->appointmentEndManila($appointment);

        return [
            'customerName' => $appointment->customer_name ?: 'Valued Customer',
            'customerEmail' => $appointment->customer_email,
            'stylistName' => $appointment->stylist?->name ?: 'Salon Team',
            'serviceItems' => $serviceItems,
            'serviceSummary' => collect($serviceItems)->pluck('label')->implode(', '),
            'appointmentDateLabel' => $start?->format('F j, Y'),
            'appointmentTimeLabel' => $start && $end
                ? $start->format('g:i A') . ' - ' . $end->format('g:i A') . ' PHT'
                : null,
            'appointmentDateTimeLabel' => $start
                ? $start->format('F j, Y g:i A') . ' PHT'
                : null,
            'paymentMethodLabel' => $this->paymentMethodLabel($appointment->payment_method),
            'paymentStatusLabel' => $this->paymentStatusLabel($appointment->payment_status),
            'statusLabel' => ucfirst((string) $appointment->status),
            'receiptNumber' => 'APT-' . str_pad((string) $appointment->getKey(), 6, '0', STR_PAD_LEFT),
            'receiptUrl' => $this->receiptUrl($appointment),
            'qrCodeImageUrl' => $this->qrCodeImageUrl($appointment),
            'qrCodePayload' => $this->qrPayload($appointment),
            'totalAmountLabel' => $this->moneyLabel($this->resolvedTotalAmountCents($appointment, $serviceItems)),
            'amountPaidLabel' => $this->moneyLabel((int) $appointment->amount_paid_cents),
            'remainingBalanceLabel' => $this->moneyLabel((int) $appointment->remaining_balance_cents),
            'customerPhone' => $appointment->customer_phone,
            'customerAddress' => $appointment->customer_address,
        ];
    }

    public function sendApprovalEmail(Appointment $appointment): void
    {
        $appointment = $this->loadAppointmentForMail($appointment);
        $email = $this->normalizedEmail($appointment->customer_email);

        if ($email === '') {
            return;
        }

        Mail::to($email)->send(new AppointmentApprovedMail($appointment));

        $appointment->forceFill([
            'approval_email_sent_at' => now(),
        ])->save();
    }

    public function sendReminderEmail(Appointment $appointment): void
    {
        $appointment = $this->loadAppointmentForMail($appointment);
        $email = $this->normalizedEmail($appointment->customer_email);

        if ($email === '') {
            return;
        }

        Mail::to($email)->send(new ReminderMail($appointment));

        $appointment->forceFill([
            'reminder_sent_at' => now(),
        ])->save();
    }

    public function tomorrowApprovedAppointmentsQuery(?Carbon $targetDate = null)
    {
        $targetDate = ($targetDate ?: now('Asia/Manila')->addDay())->copy()->timezone('Asia/Manila');
        $windowStartUtc = $targetDate->copy()->startOfDay()->timezone('UTC');
        $windowEndUtc = $targetDate->copy()->endOfDay()->timezone('UTC');

        return Appointment::query()
            ->with([
                'stylist:id,name',
                'service:id,name,price_cents',
                'services:id,name,price_cents',
                'services.variants:id,service_id,name,price_cents',
            ])
            ->where('status', 'confirmed')
            ->whereBetween('start_datetime', [$windowStartUtc, $windowEndUtc])
            ->whereNotNull('customer_email')
            ->whereRaw("TRIM(customer_email) <> ''")
            ->whereNull('reminder_sent_at')
            ->orderBy('start_datetime');
    }

    private function appointmentStartManila(Appointment $appointment): ?Carbon
    {
        $rawStart = $appointment->getRawOriginal('start_datetime');

        return $rawStart
            ? Carbon::parse($rawStart, 'UTC')->setTimezone('Asia/Manila')
            : null;
    }

    private function appointmentEndManila(Appointment $appointment): ?Carbon
    {
        $rawEnd = $appointment->getRawOriginal('end_datetime');

        return $rawEnd
            ? Carbon::parse($rawEnd, 'UTC')->setTimezone('Asia/Manila')
            : null;
    }

    private function serviceItems(Appointment $appointment): array
    {
        $services = $appointment->services;

        if ($services->isEmpty() && $appointment->service) {
            $services = collect([$appointment->service]);
        }

        return $services->map(function ($service) {
            $variantId = $service->pivot?->service_variant_id;
            $variant = null;

            if ($variantId && $service->relationLoaded('variants')) {
                $variant = $service->variants->firstWhere('id', $variantId);
            }

            return [
                'label' => $variant
                    ? ($service->name . ' - ' . $variant->name)
                    : $service->name,
                'priceCents' => (int) ($variant->price_cents ?? $service->price_cents ?? 0),
                'priceLabel' => $this->moneyLabel((int) ($variant->price_cents ?? $service->price_cents ?? 0)),
            ];
        })->values()->all();
    }

    private function resolvedTotalAmountCents(Appointment $appointment, array $serviceItems): int
    {
        $stored = (int) ($appointment->total_amount_cents ?? 0);
        if ($stored > 0) {
            return $stored;
        }

        $fallback = 0;
        foreach ($serviceItems as $item) {
            $fallback += (int) ($item['priceCents'] ?? 0);
        }

        return $fallback;
    }

    private function moneyLabel(int $amountCents): string
    {
        return 'PHP ' . number_format(max(0, $amountCents) / 100, 2);
    }

    private function paymentMethodLabel(?string $paymentMethod): string
    {
        return match (strtolower(trim((string) $paymentMethod))) {
            'online', 'gcash' => 'GCash / Online',
            'on_hand', 'cash' => 'Cash / Pay at Salon',
            default => 'Not specified',
        };
    }

    private function paymentStatusLabel(?string $paymentStatus): string
    {
        $status = strtolower(trim((string) $paymentStatus));
        if ($status === '') {
            return 'Not specified';
        }

        return ucfirst(str_replace('_', ' ', $status));
    }

    private function normalizedEmail(?string $email): string
    {
        return strtolower(trim((string) $email));
    }
}
