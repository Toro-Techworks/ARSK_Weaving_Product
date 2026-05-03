<?php

namespace App\Support;

final class Gstin
{
    private const REGEX = '/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/';

    public static function normalize(?string $value): string
    {
        return strtoupper(preg_replace('/\s+/', '', trim((string) $value)));
    }

    public static function isValid(?string $value): bool
    {
        $v = self::normalize($value);

        return strlen($v) === 15 && (bool) preg_match(self::REGEX, $v);
    }
}
