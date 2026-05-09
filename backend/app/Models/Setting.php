<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use HasFactory;

    protected $fillable = ['key', 'value', 'group', 'type'];

    /**
     * Get a setting value by key.
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    public static function getValue(string $key, $default = null)
    {
        $setting = self::where('key', $key)->first();

        if (!$setting) {
            return $default;
        }

        return self::castValue($setting->value, $setting->type);
    }

    /**
     * Set a setting value.
     *
     * @param string $key
     * @param mixed $value
     * @param string|null $group
     * @param string|null $type
     * @return Setting
     */
    public static function setValue(string $key, $value, $group = 'general', $type = 'string')
    {
        $formattedValue = is_array($value) || is_object($value) ? json_encode($value) : (string) $value;

        return self::updateOrCreate(
            ['key' => $key],
            [
                'value' => $formattedValue,
                'group' => $group,
                'type' => $type
            ]
        );
    }

    /**
     * Cast the value based on the defined type.
     *
     * @param string|null $value
     * @param string $type
     * @return mixed
     */
    private static function castValue($value, string $type)
    {
        if ($value === null) {
            return null;
        }

        switch ($type) {
            case 'integer':
            case 'int':
                return (int) $value;
            case 'boolean':
            case 'bool':
                return filter_var($value, FILTER_VALIDATE_BOOLEAN);
            case 'json':
            case 'array':
                return json_decode($value, true);
            case 'float':
            case 'double':
                return (float) $value;
            default:
                return $value;
        }
    }
}
