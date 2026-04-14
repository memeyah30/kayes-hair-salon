<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Set Up Your Password</title>
</head>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <tr>
            <td style="padding:28px 30px;">
                <h1 style="margin:0 0 20px;font-size:30px;line-height:1.2;color:#111827;">Set Up Your Password</h1>

                <p style="margin:0 0 16px;font-size:18px;line-height:1.5;color:#374151;">
                    Hi {{ $staffName ?: 'there' }},
                </p>

                <p style="margin:0 0 16px;font-size:17px;line-height:1.5;color:#374151;">
                    Your staff request has been approved. Click the button below to create your password and activate your account.
                </p>

                <p style="margin:0 0 24px;text-align:center;">
                    <a href="{{ $setupUrl }}" style="display:inline-block;background:#6d4de6;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:16px;">
                        Create Password
                    </a>
                </p>

                <p style="margin:0 0 12px;font-size:16px;line-height:1.5;color:#374151;">
                    This secure link will expire in {{ $expiresInHours }} hours.
                </p>

                <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#374151;">
                    If the button does not work, copy and paste this link into your browser:
                </p>

                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#6d4de6;word-break:break-all;">
                    {{ $setupUrl }}
                </p>

                <p style="margin:0;font-size:17px;line-height:1.5;color:#374151;">
                    Thanks,<br>
                    Kaye's Hair Salon and Spa
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
