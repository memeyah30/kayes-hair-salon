@component('mail::message')
# Your Appointment Is Completed

@if(!empty($customerName))
Hi {{ $customerName }},
@else
Hi,
@endif

Your appointment has been marked as completed.

@if(!empty($serviceName))
**Service:** {{ $serviceName }}
@endif

@if(!empty($appointmentDateTime))
**Date & Time:** {{ $appointmentDateTime }} (PHT)
@endif

@component('mail::button', ['url' => $manageUrl])
Manage your appointment
@endcomponent

This link lets you open your Manage Booking page directly.

Thanks,<br>
{{ config('app.name') }}
@endcomponent
