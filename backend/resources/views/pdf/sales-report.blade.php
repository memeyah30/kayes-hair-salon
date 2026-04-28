<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Sales Report - {{ $salon_name }}</title>
    <style>
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            color: #2D2D2D;
            line-height: 1.5;
            margin: 0;
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #7B5CF5;
            padding-bottom: 20px;
        }
        .salon-name {
            font-size: 24px;
            font-weight: bold;
            color: #7B5CF5;
            margin: 0;
        }
        .report-title {
            font-size: 18px;
            margin: 5px 0;
            color: #6B6B6B;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .meta {
            font-size: 12px;
            color: #6B6B6B;
        }
        .summary-grid {
            width: 100%;
            margin-bottom: 30px;
            border-collapse: collapse;
        }
        .summary-card {
            background: #F2EDFF;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            width: 23%;
        }
        .summary-label {
            font-size: 10px;
            text-transform: uppercase;
            color: #7B5CF5;
            margin-bottom: 5px;
        }
        .summary-value {
            font-size: 16px;
            font-weight: bold;
        }
        .section-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #2D2D2D;
            border-left: 4px solid #7B5CF5;
            padding-left: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 11px;
        }
        th {
            background-color: #F2EDFF;
            color: #6B6B6B;
            text-align: left;
            padding: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        td {
            padding: 10px;
            border-bottom: 1px solid #DDD6FE;
        }
        .text-right {
            text-align: right;
        }
        .badge {
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .badge-service { background: #DBEAFE; color: #1D4ED8; }
        .badge-product { background: #DCFCE7; color: #15803D; }
        .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 10px;
            color: #9CA3AF;
            border-top: 1px solid #E5E7EB;
            padding-top: 10px;
        }
        .total-row {
            background-color: #F9FAFB;
            font-weight: bold;
        }
        .payment-summary {
            margin-top: 20px;
            width: 300px;
            margin-left: auto;
        }
        .payment-summary table td {
            border: none;
            padding: 5px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="salon-name">{{ $salon_name }}</h1>
        <p class="report-title">Sales Report</p>
        <div class="meta">
            Generated on: {{ $generated_at }}<br>
            Period: {{ $start_date }} to {{ $end_date }}
        </div>
    </div>

    <div class="section-title">Performance Summary</div>
    <table class="summary-grid">
        <tr>
            <td class="summary-card">
                <div class="summary-label">Total Sales</div>
                <div class="summary-value">PHP {{ number_format($total_sales_cents / 100, 2) }}</div>
            </td>
            <td style="width: 2%"></td>
            <td class="summary-card">
                <div class="summary-label">Downpayments</div>
                <div class="summary-value">PHP {{ number_format($appointments_summary['total_downpayment_cents'] / 100, 2) }}</div>
            </td>
            <td style="width: 2%"></td>
            <td class="summary-card">
                <div class="summary-label">Full Payments</div>
                <div class="summary-value">PHP {{ number_format($appointments_summary['total_full_payment_cents'] / 100, 2) }}</div>
            </td>
            <td style="width: 2%"></td>
            <td class="summary-card" style="background: #FFF7ED;">
                <div class="summary-label" style="color: #B45309;">Remaining Balance</div>
                <div class="summary-value" style="color: #B45309;">PHP {{ number_format($appointments_summary['total_remaining_balance_cents'] / 100, 2) }}</div>
            </td>
        </tr>
    </table>

    <div class="section-title">Detailed Transactions</div>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Item / Service</th>
                <th>Qty</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Total</th>
                <th>Payment</th>
            </tr>
        </thead>
        <tbody>
            @foreach($sales as $sale)
                <tr>
                    <td>{{ \Carbon\Carbon::parse($sale->created_at)->setTimezone('Asia/Manila')->format('M d, Y h:i A') }}</td>
                    <td>
                        {{ $sale->item_name }}
                    </td>
                    <td>{{ $sale->quantity }}</td>
                    <td class="text-right">PHP {{ number_format($sale->unit_price_cents / 100, 2) }}</td>
                    <td class="text-right" style="font-weight: bold; color: #7B5CF5;">PHP {{ number_format($sale->total_amount_cents / 100, 2) }}</td>
                    <td>{{ strtoupper($sale->payment_method) }}</td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr class="total-row">
                <td colspan="4" class="text-right">TOTAL REVENUE</td>
                <td class="text-right">PHP {{ number_format($total_sales_cents / 100, 2) }}</td>
                <td></td>
            </tr>
        </tfoot>
    </table>

    <div class="payment-summary">
        <div class="section-title">Collection Summary</div>
        <table>
            <tr>
                <td>Total Collected (Paid)</td>
                <td class="text-right">PHP {{ number_format($appointments_summary['total_collected_cents'] / 100, 2) }}</td>
            </tr>
            <tr>
                <td style="color: #B45309;">Total Uncollected (Balance)</td>
                <td class="text-right" style="color: #B45309;">PHP {{ number_format($appointments_summary['total_remaining_balance_cents'] / 100, 2) }}</td>
            </tr>
            <tr style="border-top: 1px solid #DDD6FE; font-weight: bold;">
                <td>GROSS TOTAL</td>
                <td class="text-right">PHP {{ number_format(($appointments_summary['total_collected_cents'] + $appointments_summary['total_remaining_balance_cents']) / 100, 2) }}</td>
            </tr>
        </table>
    </div>

    <div class="footer">
        &copy; {{ date('Y') }} Kaye's Hair Salon and Spa. This is a computer-generated report.
    </div>
</body>
</html>
