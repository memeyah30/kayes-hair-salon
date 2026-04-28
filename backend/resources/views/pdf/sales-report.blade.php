<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Sales Report - Kaye's Hair Salon and Spa</title>
    <style>
        body {
            font-family: 'Helvetica', sans-serif;
            color: #333;
            margin: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .salon-name {
            font-size: 24px;
            font-weight: bold;
            color: #7B5CF5;
            margin-bottom: 5px;
        }
        .report-title {
            font-size: 18px;
            color: #555;
            margin-bottom: 15px;
        }
        .meta-info {
            font-size: 12px;
            margin-bottom: 20px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }
        .summary-grid {
            width: 100%;
            margin-bottom: 20px;
            border-collapse: collapse;
        }
        .summary-card {
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            padding: 10px;
            text-align: center;
        }
        .summary-label {
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
        }
        .summary-value {
            font-size: 16px;
            font-weight: bold;
            color: #7B5CF5;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 11px;
        }
        th {
            background-color: #F2EDFF;
            color: #444;
            padding: 10px 5px;
            text-align: left;
            border-bottom: 2px solid #DDD6FE;
        }
        td {
            padding: 8px 5px;
            border-bottom: 1px solid #eee;
        }
        .text-right {
            text-align: right;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #888;
        }
        .badge {
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            text-transform: uppercase;
        }
        .bg-service { background-color: #DBEAFE; color: #1D4ED8; }
        .bg-product { background-color: #DCFCE7; color: #15803D; }
        .bg-both { background-color: #EDE9FE; color: #6D4DE6; }
    </style>
</head>
<body>
    <div class="header">
        <div class="salon-name">Kaye's Hair Salon and Spa</div>
        <div class="report-title">Sales Report</div>
    </div>

    <div class="meta-info">
        <div><strong>Generated on:</strong> {{ $generated_at }}</div>
        @if($filters['start_date'] || $filters['end_date'])
            <div><strong>Period:</strong> {{ $filters['start_date'] ?? 'Beginning' }} to {{ $filters['end_date'] ?? 'Today' }}</div>
        @endif
        @if($filters['transaction_type'])
            <div><strong>Type:</strong> {{ ucfirst($filters['transaction_type']) }}</div>
        @endif
        @if($filters['stylist_name'])
            <div><strong>Stylist:</strong> {{ $filters['stylist_name'] }}</div>
        @endif
    </div>

    <table class="summary-grid">
        <tr>
            <td class="summary-card">
                <div class="summary-label">Total Sales</div>
                <div class="summary-value">PHP {{ number_format($stats['total_sales_cents'] / 100, 2) }}</div>
            </td>
            <td class="summary-card">
                <div class="summary-label">Service Sales</div>
                <div class="summary-value">PHP {{ number_format(($stats['sales_by_type']['service'] ?? 0) / 100, 2) }}</div>
            </td>
            <td class="summary-card">
                <div class="summary-label">Product Sales</div>
                <div class="summary-value">PHP {{ number_format(($stats['sales_by_type']['product'] ?? 0) / 100, 2) }}</div>
            </td>
            <td class="summary-card">
                <div class="summary-label">Cash Payments</div>
                <div class="summary-value">PHP {{ number_format(($stats['sales_by_payment_method']['cash'] ?? 0) / 100, 2) }}</div>
            </td>
        </tr>
    </table>

    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Item/Service</th>
                <th>Type</th>
                <th class="text-right">Qty</th>
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
                        <span class="badge bg-{{ $sale->transaction_type }}">
                            {{ $sale->transaction_type }}
                        </span>
                    </td>
                    <td class="text-right">{{ $sale->quantity }}</td>
                    <td class="text-right">{{ number_format($sale->unit_price_cents / 100, 2) }}</td>
                    <td class="text-right"><strong>{{ number_format($sale->total_amount_cents / 100, 2) }}</strong></td>
                    <td>{{ ucfirst($sale->payment_method) }}</td>
                    <td>{{ $sale->customer_name ?? '-' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="footer">
        © {{ date('Y') }} Kaye's Hair Salon and Spa. All rights reserved.
    </div>
</body>
</html>
