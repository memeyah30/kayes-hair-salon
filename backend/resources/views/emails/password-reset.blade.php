<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Reset Your Password</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4edff;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background: #fff;
            padding: 40px;
            border-radius: 24px;
            box-shadow: 0 10px 30px rgba(95, 62, 180, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #5f3eb4;
        }
        .button {
            display: inline-block;
            padding: 14px 30px;
            background-color: #5f3eb4;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 12px;
            font-weight: bold;
            margin-top: 25px;
        }
        .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #777;
            text-align: center;
        }
        .link-alt {
            word-break: break-all;
            color: #888;
            font-size: 11px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Kaye's Hair Salon and Spa</div>
        </div>
        
        <h2>Hello!</h2>
        <p>You are receiving this email because we received a password reset request for your account.</p>
        
        <div style="text-align: center;">
            <a href="{{ $resetUrl }}" class="button">Reset Password</a>
        </div>
        
        <p>This password reset link will expire in 60 minutes.</p>
        <p>If you did not request a password reset, no further action is required.</p>
        
        <p>Regards,<br>Kaye's Hair Salon Team</p>
        
        <div class="link-alt">
            If you're having trouble clicking the "Reset Password" button, copy and paste the URL below into your web browser:<br>
            {{ $resetUrl }}
        </div>
        
        <div class="footer">
            &copy; {{ date('Y') }} Kaye's Hair Salon and Spa. All rights reserved.
        </div>
    </div>
</body>
</html>
