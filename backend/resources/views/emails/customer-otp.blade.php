<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>OTP Code</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f5f7fb; margin: 0; padding: 24px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <tr>
            <td style="background: #1e3a8a; color: #ffffff; padding: 20px 24px;">
                <h1 style="margin: 0; font-size: 20px;">Kaye's Hair Salon &amp; Spa</h1>
                <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.95;">Manage My Booking verification</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 24px;">
                <p style="margin: 0 0 14px; color: #111827; font-size: 15px;">Use this one-time code to view and manage your bookings:</p>
                <div style="margin: 0 0 16px; text-align: center; font-size: 34px; letter-spacing: 8px; font-weight: 700; color: #1e3a8a;">
                    {{ $otp }}
                </div>
                <p style="margin: 0 0 12px; color: #374151; font-size: 14px;">
                    This OTP expires in <strong>{{ $expiresInMinutes }} minutes</strong> and can only be used once.
                </p>
                <p style="margin: 0; color: #6b7280; font-size: 13px;">
                    If you did not request this code, you can ignore this email.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>

