<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
            // Salon Information
            ['key' => 'salon_name', 'value' => "Kaye's Hair Salon and Spa", 'group' => 'general', 'type' => 'string'],
            ['key' => 'salon_address', 'value' => 'Poblacion, Quezon, Bukidnon', 'group' => 'general', 'type' => 'string'],
            ['key' => 'salon_contact', 'value' => '09123456789', 'group' => 'general', 'type' => 'string'],
            ['key' => 'salon_email', 'value' => 'kayesalon@example.com', 'group' => 'general', 'type' => 'string'],

            // Working Hours
            ['key' => 'open_time', 'value' => '08:00', 'group' => 'appointment', 'type' => 'string'],
            ['key' => 'close_time', 'value' => '18:00', 'group' => 'appointment', 'type' => 'string'],
            ['key' => 'working_days', 'value' => json_encode(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']), 'group' => 'appointment', 'type' => 'json'],

            // Time Slot Configuration
            ['key' => 'slot_interval', 'value' => '30', 'group' => 'appointment', 'type' => 'integer'], // in minutes
            ['key' => 'slot_capacity', 'value' => '2', 'group' => 'appointment', 'type' => 'integer'], // max appointments per slot

            // Holiday / Closed Dates
            ['key' => 'closed_dates', 'value' => json_encode([]), 'group' => 'appointment', 'type' => 'json'],

            // Payment Settings
            ['key' => 'payment_methods', 'value' => json_encode(['cash', 'gcash', 'paymaya']), 'group' => 'payment', 'type' => 'json'],
            ['key' => 'require_downpayment', 'value' => 'true', 'group' => 'payment', 'type' => 'boolean'],
            ['key' => 'downpayment_type', 'value' => 'percentage', 'group' => 'payment', 'type' => 'string'], // percentage or fixed
            ['key' => 'downpayment_value', 'value' => '10', 'group' => 'payment', 'type' => 'integer'],

            // Notification Settings
            ['key' => 'email_notifications_enabled', 'value' => 'true', 'group' => 'notification', 'type' => 'boolean'],
            ['key' => 'admin_notification_email', 'value' => 'admin@kayesalon.com', 'group' => 'notification', 'type' => 'string'],
        ];

        foreach ($settings as $setting) {
            Setting::updateOrCreate(['key' => $setting['key']], $setting);
        }
    }
}
