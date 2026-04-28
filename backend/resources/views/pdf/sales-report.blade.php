<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Sales Report - {{ $salon_name }}</title>
    <style>
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 12px;
            color: #333;
            line-height: 1.4;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #7B5CF5;
            padding-bottom: 10px;
        }
        .header h1 {
            margin: 0;
            color: #7B5CF5;
            font-size: 24px;
        }
        .header p {
            margin: 5px 0 0;
            color: #666;
            font-size: 14px;
        }
        .report-info {
            margin-bottom: 20px;
        }
        .report-info table {
            width: 100%;
        }
        .report-info td {
            vertical-align: top;
        }
        .stats-container {
            margin-bottom: 25px;
            width: 100%;
        }
        .stats-box {
            background-color: #F6F2FF;
            border: 1px solid #DDD6FE;
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 10px;
        }
        .stats-title {
            font-size: 10px;
            text-transform: uppercase;
            color: #6B6B6B;
            margin-bottom: 5px;
        }
        .stats-value {
            font-size: 18px;
            font-weight: bold;
            color: #7B5CF5;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .table th {
            background-color: #F2EDFF;
            color: #6B6B6B;
            text-align: left;
            padding: 8px;
            font-size: 10px;
            text-transform: uppercase;
            border-bottom: 1px solid #DDD6FE;
        }
        .table td {
            padding: 8px;
            border-bottom: 1px solid #EEE;
            font-size: 11px;
        }
        .text-right {
            text-align: right;
        }
        .font-bold {
            font-weight: bold;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #999;
            border-top: 1px solid #EEE;
            padding-top: 10px;
        }
        .summary-table {
            width: 300px;
            margin-left: auto;
        }
        .summary-table td {
            padding: 5px;
            border-bottom: 1px solid #EEE;
        }
        .status-badge {
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 9px;
            text-transform: uppercase;
        }
        .badge-service { background-color: #DBEAFE; color: #1D4ED8; }
        .badge-product { background-color: #DCFCE7; color: #15803D; }
        .badge-cash { background-color: #FEF3C7; color: #B45309; }
        .badge-gcash { background-color: #DBEAFE; color: #1D4ED8; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $salon_name }}</h1>
        <p>Sales Report</p>
    </div>

    <div class="report-info">
        <table>
            <tr>
                <td>
                    <strong>Generated On:</strong> {{ $generated_at }}<br>
                    <strong>Period:</strong> {{ $start_date }} to {{ $end_date }}
                </td>
                <td class="text-right">
                    @if($transaction_type)
                        <strong>Type:</strong> {{ ucfirst($transaction_type) }}<br>
                    @endif
                    @if($stylist_name)
                        <strong>Stylist:</strong> {{ $stylist_name }}<br>
                    @endif
                </td>
            </tr>
        </table>
    </div>

    <div class="stats-container">
        <table style="width: 100%; border-spacing: 10px 0;">
            <tr>
                <td width="50%" style="padding: 0;">
                    <div class="stats-box">
                        <div class="stats-title">Total Sales Revenue</div>
                        <div class="stats-value">PHP {{ number_format($total_sales_cents / 100, 2) }}</div>
                    </div>
                </td>
                <td width="50%" style="padding: 0;">
                    <div class="stats-box">
                        <div class="stats-title">Total Transactions</div>
                        <div class="stats-value">{{ count($sales) }}</div>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <table class="table">
        <thead>
            <tr>
                <th>Date</th>
                <th>Item / Service</th>
                <th>Type</th>
                <th>Qty</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Total</th>
                <th>Payment</th>
                <th>Customer</th>
            </tr>
        </thead>
        <tbody>
            @foreach($sales as $sale)
                <tr>
                    <td>{{ \Carbon\Carbon::parse($sale->created_at)->setTimezone('Asia/Manila')->format('M d, Y h:i A') }}</td>
                    <td>{{ $sale->item_name }}</td>
                    <td>
                        <span class="status-badge {{ $sale->transaction_type === 'service' ? 'badge-service' : 'badge-product' }}">
                            {{ $sale->transaction_type }}
                        </span>
                    </td>
                    <td>{{ $sale->quantity }}</td>
                    <td class="text-right">{{ number_format($sale->unit_price_cents / 100, 2) }}</td>
                    <td class="text-right font-bold">{{ number_format($sale->total_amount_cents / 100, 2) }}</td>
                    <td>
                        <span class="status-badge badge-{{ $sale->payment_method }}">
                            {{ $sale->payment_method }}
                        </span>
                    </td>
                    <td>{{ $sale->customer_name ?? '-' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div style="margin-top: 30px;">
        <table class="summary-table">
            <tr>
                <td><strong>Subtotal (Services)</strong></td>
                <td class="text-right">PHP {{ number_format(($sales_by_type['service'] ?? 0) / 100, 2) }}</td>
            </tr>
            <tr>
                <td><strong>Subtotal (Products)</strong></td>
                <td class="text-right">PHP {{ number_format(($sales_by_type['product'] ?? 0) / 100, 2) }}</td>
            </tr>
            <tr style="background-color: #F2EDFF;">
                <td><strong style="color: #7B5CF5;">TOTAL REVENUE</strong></td>
                <td class="text-right"><strong style="color: #7B5CF5;">PHP {{ number_format($total_sales_cents / 100, 2) }}</strong></td>
            </tr>
        </table>
    </div>

    @if($appointments_summary)
    <div style="margin-top: 30px;">
        <h3 style="color: #2D2D2D; font-size: 14px; border-bottom: 1px solid #DDD6FE; padding-bottom: 5px;">Appointment Payment Summary</h3>
        <table class="summary-table" style="width: 100%; margin-left: 0;">
            <tr>
                <td width="70%">Total Downpayments Received</td>
                <td class="text-right">PHP {{ number_format($appointments_summary['total_downpayment_cents'] / 100, 2) }}</td>
            </tr>
            <tr>
                <td>Total Full Payments Received</td>
                <td class="text-right">PHP {{ number_format($appointments_summary['total_full_payment_cents'] / 100, 2) }}</td>
            </tr>
            <tr>
                <td><strong>Total Collected from Appointments</strong></td>
                <td class="text-right"><strong>PHP {{ number_format($appointments_summary['total_collected_cents'] / 100, 2) }}</strong></td>
            </tr>
            <tr>
                <td style="color: #666;">Total Remaining Balance (Pending)</td>
                <td class="text-right" style="color: #666;">PHP {{ number_format($appointments_summary['total_remaining_balance_cents'] / 100, 2) }}</td>
            </tr>
        </table>
    </div>
    @endif

    <div class="footer">
        <p>This is a computer-generated document. {{ $salon_name }} &copy; {{ date('Y') }}</p>
    </div>
</body>
</html>
