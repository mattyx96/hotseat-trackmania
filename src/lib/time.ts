const pad = (value: number, length = 2): string => String(value).padStart(length, '0');

/** Formats a lap time as `M:SS.mmm` (e.g. 83456 -> `1:23.456`). */
export function formatTime(ms: number): string {
  const safe = Math.max(0, Math.round(ms));
  const minutes = Math.floor(safe / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1000);
  const millis = safe % 1000;
  return `${minutes}:${pad(seconds)}.${pad(millis, 3)}`;
}

/** Splits a lap time into minute / second / millisecond parts for editing. */
export function splitTime(ms: number): { minutes: number; seconds: number; millis: number } {
  const safe = Math.max(0, Math.round(ms));
  return {
    minutes: Math.floor(safe / 60_000),
    seconds: Math.floor((safe % 60_000) / 1000),
    millis: safe % 1000,
  };
}

/** Formats a signed difference, e.g. `-1.356` / `+0.400`. */
export function formatDelta(ms: number): string {
  const rounded = Math.round(ms);
  const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : '';
  const absolute = Math.abs(rounded);
  const seconds = Math.floor(absolute / 1000);
  const millis = absolute % 1000;
  return `${sign}${seconds}.${pad(millis, 3)}`;
}

/** Keeps the most recent `length` digits from raw input (segmented time fields). */
export function segmentDigits(raw: string, length: number): string {
  return raw.replace(/\D/g, '').slice(-length);
}

/**
 * Normalises a segment value on blur: clamps to `max`, pads to `length` digits,
 * and falls back to zeros when empty. Minutes are left unpadded (`allowBare`).
 */
export function normalizeSegment(value: string, length: number, max: number, allowBare = false): string {
  if (value === '') return allowBare ? '0' : '0'.repeat(length);
  const clamped = Math.min(max, Math.max(0, Number(value) || 0));
  return allowBare ? String(clamped) : String(clamped).padStart(length, '0');
}

/** Formats a countdown/clock as `MM:SS`, or `H:MM:SS` past an hour. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Parses a lap time into milliseconds.
 * Accepts `m:ss.mmm`, `h:mm:ss.mmm`, plain seconds (`83.456`) and comma decimals.
 * Returns `null` when the value cannot be parsed or is not positive.
 */
export function parseTime(input: string): number | null {
  const raw = input.trim().replace(',', '.');
  if (!raw) return null;

  const parts = raw.split(':');
  if (parts.length === 0 || parts.length > 3) return null;

  let totalSeconds = 0;
  for (const part of parts) {
    const value = Number(part.trim());
    if (!Number.isFinite(value) || value < 0) return null;
    totalSeconds = totalSeconds * 60 + value;
  }

  if (totalSeconds <= 0) return null;
  return Math.round(totalSeconds * 1000);
}
