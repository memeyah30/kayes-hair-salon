<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Appointment Approved</title>
</head>
<body style="margin:0;padding:24px;background:#f4edff;font-family:Arial,sans-serif;color:#2c1338;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #eadff7;border-radius:16px;overflow:hidden;">
        <tr>
            <td style="padding:32px 30px;">
                <p style="margin:0 0 12px;font-size:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8b5cf6;">Appointment Approved</p>
                <h1 style="margin:0 0 18px;font-size:30px;line-height:1.2;color:#2c1338;">Your booking is confirmed</h1>

                <p style="margin:0 0 16px;font-size:17px;line-height:1.6;color:#4b5563;">
                    Hi {{ $customerName }},
                </p>

                <p style="margin:0 0 22px;font-size:17px;line-height:1.6;color:#4b5563;">
                    Your salon appointment has been approved by our team. We included your booking details below, plus a QR code that opens your receipt quickly.
                </p>

                @include('emails.partials.appointment-details')

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;border-collapse:collapse;">
                    <tr>
                        <td style="padding:20px;background:#2c1338;border-radius:14px;text-align:center;">
                            <p style="margin:0 0 14px;font-size:16px;line-height:1.5;color:#f5e9ff;font-weight:600;">Scan this QR code to open your receipt</p>
                            <img
                                src="{{ $qrCodeImageUrl }}"
                                alt="Appointment receipt QR code"
                                width="180"
                                height="180"
                                style="display:block;margin:0 auto 14px;background:#ffffff;padding:12px;border-radius:12px;"
                            >
                            <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#d8c5f1;">If the QR image does not load, use the button below.</p>
                            <a href="{{ $receiptUrl }}" style="display:inline-block;background:#8b5cf6;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;font-size:15px;">
                                View Appointment Receipt
                            </a>
                        </td>
                    </tr>
                </table>

                <p style="margin:0;font-size:17px;line-height:1.6;color:#4b5563;">
                    We look forward to seeing you soon.<br>
                    Kaye's Hair Salon and Spa
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
