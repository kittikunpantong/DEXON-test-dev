import Decimal from "decimal.js";

import { formatRate, formatThaiDate, formatThickness } from "./format";

export type LifeValue = {
  status: "empty" | "unlimited" | "finite";
  years: string | null;
};

export type GeometryView = {
  actualOutsideDiameter: string | null;
  designThickness: string | null;
  structuralThickness: string | null;
  requiredThickness: string | null;
};

export type ReadingView = {
  inspectionDate: string;
  actualThickness: string;
  intervalCorrosionRate: string | null;
};

export type TestPointView = {
  tpNumber: number;
  tpDescription: number;
  note: string | null;
  readings: ReadingView[];
  shortTermRate: string | null;
  longTermRate: string | null;
  inserviceRate: string | null;
  corrosionRate: string | null;
  life: LifeValue;
  retirementDate: string | null;
  governsRate: boolean;
  governsLife: boolean;
};

export type CmlView = {
  cmlNumber: number;
  cmlDescription: string;
  geometry: GeometryView;
  corrosionRate: string | null;
  life: LifeValue;
  retirementDate: string | null;
  testPoints: TestPointView[];
  governsRate: boolean;
  governsLife: boolean;
};

export type LineView = {
  lineNumber: string;
  location: string;
  fromLocation: string;
  toLocation: string;
  drawingNumber: string;
  service: string;
  material: string;
  inserviceDate: string | null;
  pipeSize: string;
  originalThickness: string | null;
  stress: string;
  jointEfficiency: string;
  ca: string;
  designLife: number;
  designPressure: string;
  operatingPressure: string;
  designTemperature: string;
  operatingTemperature: string;
  corrosionRate: string | null;
  life: LifeValue;
  retirementDate: string | null;
  geometry: GeometryView;
  cmls: CmlView[];
};

export function formatDate(iso: string | null | undefined): string {
  return formatThaiDate(iso);
}

export function formatDiameter(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return new Decimal(value).toString();
}

export function formatLife(life: LifeValue): string {
  if (life.status === "unlimited") return "Unlimited";
  if (life.status !== "finite" || !life.years) return "";
  return new Decimal(life.years).toFixed(1);
}

export { formatRate, formatThickness };
