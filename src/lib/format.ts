import Decimal from "decimal.js";

import type { LifeStatus } from "./calculations";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatThaiDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return "";
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function formatDecimal(value: string | null | undefined, places: number): string {
  if (value === null || value === undefined || value === "") return "";
  return new Decimal(value).toFixed(places);
}

export function formatThickness(value: string | null | undefined): string {
  return formatDecimal(value, 3);
}

export function formatRate(value: string | null | undefined): string {
  return formatDecimal(value, 4);
}

export function formatLife(status: LifeStatus, years: string | null | undefined): string {
  if (status === "unlimited") return "Unlimited";
  if (status !== "finite" || years === null || years === undefined || years === "") return "";
  return new Decimal(years).toFixed(1);
}

export function formatPlainDecimal(value: string | number | { toString(): string } | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return new Decimal(value.toString()).toFixed();
}
