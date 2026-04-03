<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class GenericCode extends Model
{
    /** Default for application dropdowns / seeded reference data. */
    public const DROPDOWN_TYPE_CORE = 'CORE';

    /** Managed from Master Settings; excluded from CORE-only consumers unless explicitly included. */
    public const DROPDOWN_TYPE_MASTER = 'MASTER';

    protected $fillable = [
        'code_type',
        'code_description',
        'dropdown_type',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /** Application dropdowns and validation must only use active rows. */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public static function cacheKey(string $codeType): string
    {
        return 'generic_codes:'.$codeType;
    }

    public static function forgetCacheForType(string $codeType): void
    {
        Cache::forget(self::cacheKey($codeType));
    }

    /**
     * Active rows for a type, ordered for UI.
     *
     * @return array<int, array{id:int,code_type:string,code_description:string,dropdown_type:string,sort_order:int}>
     */
    public static function activeListForType(string $codeType): array
    {
        return Cache::remember(self::cacheKey($codeType), 3600, function () use ($codeType) {
            return self::query()
                ->where('code_type', $codeType)
                ->where('dropdown_type', self::DROPDOWN_TYPE_CORE)
                ->active()
                ->orderBy('sort_order')
                ->orderBy('code_description')
                ->get(['id', 'code_type', 'code_description', 'dropdown_type', 'sort_order'])
                ->map(fn ($r) => $r->toArray())
                ->all();
        });
    }

    /**
     * Laravel validation rules: value must match an active code_description for code_type (or null/empty if not required).
     *
     * @return list<\Closure|string>
     */
    public static function validationRule(
        string $codeType,
        bool $required = false,
        string $dropdownType = self::DROPDOWN_TYPE_CORE,
        int $maxLength = 255,
    ): array {
        return [
            $required ? 'required' : 'nullable',
            'string',
            'max:'.$maxLength,
            function (string $attribute, mixed $value, \Closure $fail) use ($codeType, $required, $dropdownType): void {
                if ($value === null || $value === '') {
                    if ($required) {
                        $fail(__('validation.required', ['attribute' => $attribute]));
                    }

                    return;
                }
                $ok = self::query()
                    ->where('code_type', $codeType)
                    ->where('code_description', $value)
                    ->where('dropdown_type', $dropdownType)
                    ->active()
                    ->exists();
                if (! $ok) {
                    $fail(__('The selected :attribute is invalid.', ['attribute' => $attribute]));
                }
            },
        ];
    }

    /**
     * When the field may be omitted; if present (including empty string) optional values skip DB check.
     *
     * @return list<\Closure|string>
     */
    public static function sometimesValidationRule(
        string $codeType,
        string $dropdownType = self::DROPDOWN_TYPE_CORE,
        int $maxLength = 255,
    ): array {
        return array_merge(
            ['sometimes'],
            array_values(array_filter(
                self::validationRule($codeType, false, $dropdownType, $maxLength),
                fn ($r) => $r !== 'nullable'
            ))
        );
    }

    /**
     * Value is "+"-separated code_description values; each segment must exist for code_type (MASTER).
     * Example: "Red+Blue+Green"
     *
     * @return list<\Closure|string>
     */
    public static function validationRulePlusSeparatedMaster(
        string $codeType,
        bool $required = false,
        int $maxLength = 2048,
    ): array {
        return [
            $required ? 'required' : 'nullable',
            'string',
            'max:'.$maxLength,
            function (string $attribute, mixed $value, \Closure $fail) use ($codeType, $required): void {
                if ($value === null || $value === '') {
                    if ($required) {
                        $fail(__('validation.required', ['attribute' => $attribute]));
                    }

                    return;
                }
                if (! is_string($value)) {
                    $fail(__('The :attribute must be a valid string.', ['attribute' => $attribute]));

                    return;
                }
                $parts = array_values(array_filter(array_map('trim', explode('+', $value)), fn ($p) => $p !== ''));
                foreach ($parts as $part) {
                    $ok = self::query()
                        ->where('code_type', $codeType)
                        ->where('code_description', $part)
                        ->where('dropdown_type', self::DROPDOWN_TYPE_MASTER)
                        ->active()
                        ->exists();
                    if (! $ok) {
                        $fail('Invalid colour "'.$part.'" — each segment must exist in generic codes (code_type '.$codeType.', MASTER).');

                        return;
                    }
                }
            },
        ];
    }
}
