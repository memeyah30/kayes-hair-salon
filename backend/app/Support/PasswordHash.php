<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;

class PasswordHash
{
    public static function isHashed(?string $value): bool
    {
        if (!is_string($value) || trim($value) === '') {
            return false;
        }

        $info = password_get_info($value);

        return ($info['algoName'] ?? 'unknown') !== 'unknown';
    }

    public static function matches(string $plainText, ?string $storedValue): bool
    {
        if (!is_string($storedValue) || $storedValue === '') {
            return false;
        }

        if (self::isHashed($storedValue)) {
            return password_verify($plainText, $storedValue);
        }

        // Support one-time recovery from legacy plain-text passwords.
        return hash_equals($storedValue, $plainText);
    }

    public static function needsRehash(?string $storedValue): bool
    {
        if (!self::isHashed($storedValue)) {
            return true;
        }

        return Hash::needsRehash($storedValue);
    }

    public static function upgradeIfNeeded(Model $user, string $plainText): void
    {
        $storedValue = $user->getAttribute('password');

        if (!self::matches($plainText, is_string($storedValue) ? $storedValue : null)) {
            return;
        }

        if (!self::needsRehash(is_string($storedValue) ? $storedValue : null)) {
            return;
        }

        $user->password = $plainText;
        $user->save();
    }
}
