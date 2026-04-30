<!DOCTYPE html>
<html>
<head>
    <title>Appointment Rejected</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #d9534f;">Appointment Update</h2>
        <p>Dear {{ $appointment->customer_name }},</p>
        
        <p>We regret to inform you that your appointment scheduled for 
            <strong>{{ \Carbon\Carbon::parse($appointment->getRawOriginal('start_datetime'), 'UTC')->timezone('Asia/Manila')->format('F j, Y \a\t g:i A') }}</strong> 
            has been cancelled by the salon.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #d9534f; margin: 20px 0;">
            <p style="margin: 0;"><strong>Reason:</strong></p>
            <p style="margin: 5px 0 0 0;">{{ $reason }}</p>
        </div>
        
        <p>If you believe this is a mistake or if you would like to book a new appointment, please visit our website or contact us directly.</p>
        
        <br>
        <p>Thank you,</p>
        <p><strong>{{ config('app.name') }}</strong></p>
    </div>
</body>
</html>
