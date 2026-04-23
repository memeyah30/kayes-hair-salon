<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Appointment Reminder</title>
</head>
<body style="margin:0;padding:24px;background:#f7f7fb;font-family:Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <tr>
            <td style="padding:32px 30px;">
                <p style="margin:0 0 12px;font-size:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6366f1;">Tomorrow's Reminder</p>
                <h1 style="margin:0 0 18px;font-size:30px;line-height:1.2;color:#111827;">Your appointment is tomorrow</h1>

                <p style="margin:0 0 16px;font-size:17px;line-height:1.6;color:#4b5563;">
                    Hi {{ $customerName }},
                </p>

                <p style="margin:0 0 22px;font-size:17px;line-height:1.6;color:#4b5563;">
                    This is a friendly reminder for your approved salon booking scheduled for tomorrow. Please review the details below and keep your QR receipt ready when needed.
                </p>

                @include('emails.partials.appointment-details')

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;border-collapse:collapse;">
                    <tr>
                        <td style="padding:20px;background:#eef2ff;border-radius:14px;text-align:center;border:1px solid #dbe4ff;">
                            <p style="margin:0 0 14px;font-size:16px;line-height:1.5;color:#3730a3;font-weight:600;">Quick receipt access</p>
                            <img
                                src="{{ $qrCodeImageUrl }}"
                                alt="Appointment reminder QR code"
                                width="180"
                                height="180"
                                style="display:block;margin:0 auto 14px;background:#ffffff;padding:12px;border-radius:12px;"
                            >
                            <a href="{{ $receiptUrl }}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;font-size:15px;">
                                Open Receipt
                            </a>
                        </td>
                    </tr>
                </table>

                <p style="margin:0;font-size:17px;line-height:1.6;color:#4b5563;">
                    See you soon,<br>
                    Kaye's Hair Salon and Spa
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
