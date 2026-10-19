import Decimal from "decimal.js";

const DAY_MS = 86_400_000;

export function isoToUtcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export function yearsBetween(earlierIso: string, laterIso: string): Decimal {
  const earlier = Date.parse(`${earlierIso}T00:00:00.000Z`);
  const later = Date.parse(`${laterIso}T00:00:00.000Z`);
  return new Decimal(later - earlier).div(DAY_MS).div("365.25");
}

export function addDays(isoDate: string, days: number): string {
  const start = Date.parse(`${isoDate}T00:00:00.000Z`);
  return new Date(start + days * DAY_MS).toISOString().slice(0, 10);
}

export function dateToIso(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function toIsoDate(value: Date): string {
  return dateToIso(value);
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function decimalToString(value: { toString(): string } | null | undefined): string | null {
  if (value == null) return null;
  return value.toString();
}
