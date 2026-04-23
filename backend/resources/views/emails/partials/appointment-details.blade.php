<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;border-collapse:collapse;">
    <tr>
        <td style="padding:16px 18px;background:#faf7ff;border:1px solid #eadff7;border-radius:12px;">
            <h2 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:#2c1338;">Appointment Details</h2>

            @if(!empty($receiptNumber))
                <p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#4b5563;"><strong>Reference:</strong> {{ $receiptNumber }}</p>
            @endif

            @if(!empty($appointmentDateLabel))
                <p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#4b5563;"><strong>Date:</strong> {{ $appointmentDateLabel }}</p>
            @endif

            @if(!empty($appointmentTimeLabel))
                <p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#4b5563;"><strong>Time:</strong> {{ $appointmentTimeLabel }}</p>
            @endif

            @if(!empty($stylistName))
                <p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#4b5563;"><strong>Stylist:</strong> {{ $stylistName }}</p>
            @endif

            @if(!empty($serviceItems))
                <div style="margin:12px 0 10px;">
                    <p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#4b5563;"><strong>Services:</strong></p>
                    @foreach($serviceItems as $item)
                        <p style="margin:0 0 6px;font-size:15px;line-height:1.5;color:#4b5563;">{{ $item['label'] }} - {{ $item['priceLabel'] }}</p>
                    @endforeach
                </div>
            @endif

            <p style="margin:12px 0 6px;font-size:15px;line-height:1.5;color:#4b5563;"><strong>Total:</strong> {{ $totalAmountLabel }}</p>
            <p style="margin:0 0 6px;font-size:15px;line-height:1.5;color:#4b5563;"><strong>Paid:</strong> {{ $amountPaidLabel }}</p>
            <p style="margin:0;font-size:15px;line-height:1.5;color:#4b5563;"><strong>Remaining Balance:</strong> {{ $remainingBalanceLabel }}</p>
        </td>
    </tr>
</table>
