<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Your Appointment Is Completed</title>
</head>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <tr>
            <td style="padding:28px 30px;">
                <h1 style="margin:0 0 20px;font-size:30px;line-height:1.2;color:#111827;">Your Appointment Is Completed</h1>

                <p style="margin:0 0 16px;font-size:18px;line-height:1.5;color:#374151;">
                    @if(!empty($customerName))
                        Hi {{ $customerName }},
                    @else
                        Hi,
                    @endif
                </p>

                <p style="margin:0 0 16px;font-size:18px;line-height:1.5;color:#374151;">
                    Your appointment has been marked as completed.
                </p>

                @if(!empty($serviceName))
                    <p style="margin:0 0 10px;font-size:17px;line-height:1.5;color:#111827;"><strong>Service:</strong> {{ $serviceName }}</p>
                @endif

                @if(!empty($appointmentDateTime))
                    <p style="margin:0 0 24px;font-size:17px;line-height:1.5;color:#111827;"><strong>Date &amp; Time:</strong> {{ $appointmentDateTime }} (PHT)</p>
                @endif

                <p style="margin:0 0 24px;text-align:center;">
                    <a href="{{ $manageUrl }}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600;font-size:16px;">
                        Manage your appointment
                    </a>
                </p>

                <p style="margin:0 0 20px;font-size:17px;line-height:1.5;color:#374151;">
                    This link lets you open your Manage Booking page directly.
                </p>

                <p style="margin:0;font-size:18px;line-height:1.5;color:#374151;">
                    Thanks,<br>
                    Kaye's Hair Salon and Spa
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
