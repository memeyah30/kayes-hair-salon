<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            $notifications = Notification::query()
                ->forRecipient($user)
                ->latest()
                ->limit(20)
                ->get();

            $unreadCount = Notification::query()
                ->forRecipient($user)
                ->where('is_read', false)
                ->count();

            return response()->json([
                'notifications' => $notifications,
                'unread_count' => $unreadCount,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Notification API Error: ' . $e->getMessage(), [
                'user_id' => $user->id ?? 'none',
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Internal Server Error',
                'error' => $e->getMessage(),
                'hint' => 'Check if the notifications table exists and is migrated.'
            ], 500);
        }
    }

    public function markAsRead(Request $request, Notification $notification)
    {
        $user = $request->user();

        if (
            !$user
            || $notification->recipient_type !== get_class($user)
            || (int) $notification->recipient_id !== (int) $user->getKey()
        ) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if (!$notification->is_read) {
            $notification->forceFill(['is_read' => true])->save();
        }

        return response()->json([
            'message' => 'Notification marked as read',
            'notification' => $notification->fresh(),
        ]);
    }
}
