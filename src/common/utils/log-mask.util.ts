const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'authorization',
  'token',
  'access_token',
  'refresh_token',
  'card_number',
  'cardNumber',
  'cvc',
  'cvv',
  'ssn',
]);

export function maskSensitive(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) return value.map(maskSensitive);

  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = '[REDACTED]';
      continue;
    }
    out[k] = maskSensitive(v);
  }

  return out;
}

