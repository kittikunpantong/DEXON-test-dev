import Decimal from "decimal.js";
import { z } from "zod";

import { isIsoDate } from "./dates";

export type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

function invalid(error: z.ZodError): Parsed<never> {
  return { ok: false, error: error.issues[0]?.message ?? "Invalid data" };
}

function text(max: number, label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);
}

function decimalInput(options: {
  precision: number;
  scale: number;
  label: string;
  min?: string;
  max?: string;
  signed?: boolean;
  required?: boolean;
  greaterThan?: string;
}) {
  return z.string().trim().superRefine((value, ctx) => {
    const required = options.required !== false;
    if (!required && value === "") return;
    if (value === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${options.label} is required` });
      return;
    }
    const pattern = options.signed ? /^-?\d+(\.\d+)?$/ : /^\d+(\.\d+)?$/;
    if (!pattern.test(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${options.label} must be a number` });
      return;
    }
    const unsigned = value.startsWith("-") ? value.slice(1) : value;
    const [intRaw, fraction = ""] = unsigned.split(".");
    const intDigits = intRaw.replace(/^0+(?=\d)/, "") || "0";
    if (fraction.length > options.scale || intDigits.length > options.precision - options.scale) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${options.label} must fit decimal(${options.precision},${options.scale})`,
      });
      return;
    }
    const amount = new Decimal(value);
    if (options.greaterThan !== undefined && amount.lte(options.greaterThan)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${options.label} must be greater than ${options.greaterThan}` });
    }
    if (options.min !== undefined && amount.lt(options.min)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${options.label} must be at least ${options.min}` });
    }
    if (options.max !== undefined && amount.gt(options.max)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${options.label} must be at most ${options.max}` });
    }
  });
}

function wholeNumber(label: string, min: number, max: number) {
  return z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (!/^\d+$/.test(value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be a whole number` });
        return;
      }
      const number = Number(value);
      if (number < min || number > max) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be between ${min} and ${max}` });
      }
    })
    .transform(Number);
}

const optionalDate = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    if (value !== "" && !isIsoDate(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "In-service date is invalid" });
    }
  })
  .transform((value) => (value === "" ? null : value));

const lineSchema = z.object({
  lineNumber: z
    .string()
    .trim()
    .min(1, "Line number is required")
    .max(64, "Line number must be at most 64 characters")
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "Line number may contain only letters, numbers, dots, hyphens, and underscores"),
  location: text(255, "Location"),
  fromLocation: text(255, "From"),
  toLocation: text(255, "To"),
  drawingNumber: text(255, "Drawing"),
  service: text(255, "Service"),
  material: text(255, "Material"),
  inserviceDate: optionalDate,
  pipeSize: decimalInput({ precision: 6, scale: 3, label: "Pipe size", greaterThan: "0" }),
  originalThickness: decimalInput({
    precision: 8,
    scale: 3,
    label: "Original thickness",
    min: "0",
    required: false,
  }).transform((value) => (value === "" ? null : value)),
  stress: decimalInput({ precision: 12, scale: 3, label: "Stress", min: "0" }),
  jointEfficiency: decimalInput({ precision: 5, scale: 3, label: "Joint efficiency", min: "0", max: "1" }),
  ca: decimalInput({ precision: 8, scale: 3, label: "Corrosion allowance", min: "0" }),
  designLife: wholeNumber("Design life", 0, 999),
  designPressure: decimalInput({ precision: 10, scale: 3, label: "Design pressure", min: "0" }),
  operatingPressure: decimalInput({ precision: 10, scale: 3, label: "Operating pressure", min: "0" }),
  designTemperature: decimalInput({ precision: 8, scale: 3, label: "Design temperature", signed: true }),
  operatingTemperature: decimalInput({ precision: 8, scale: 3, label: "Operating temperature", signed: true }),
});

export type LineFormData = z.infer<typeof lineSchema>;

const cmlSchema = z.object({
  cmlNumber: wholeNumber("CML number", 1, 999999),
  cmlDescription: text(255, "CML description"),
});

export type CmlFormData = z.infer<typeof cmlSchema>;

const testPointSchema = z.object({
  tpNumber: wholeNumber("Test point number", 1, 999999),
  tpDescription: wholeNumber("Angle", 0, 359),
  note: z.string().trim().max(500, "Note must be at most 500 characters").transform((value) => (value === "" ? null : value)),
});

export type TestPointFormData = z.infer<typeof testPointSchema>;

const thicknessSchema = z.object({
  inspectionDate: z.string().trim().refine(isIsoDate, "Inspection date is invalid"),
  actualThickness: decimalInput({ precision: 8, scale: 3, label: "Actual thickness", min: "0" }),
});

export type ThicknessFormData = z.infer<typeof thicknessSchema>;

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function parseLineForm(formData: FormData): Parsed<LineFormData> {
  const result = lineSchema.safeParse({
    lineNumber: formString(formData, "lineNumber"),
    location: formString(formData, "location"),
    fromLocation: formString(formData, "fromLocation"),
    toLocation: formString(formData, "toLocation"),
    drawingNumber: formString(formData, "drawingNumber"),
    service: formString(formData, "service"),
    material: formString(formData, "material"),
    inserviceDate: formString(formData, "inserviceDate"),
    pipeSize: formString(formData, "pipeSize"),
    originalThickness: formString(formData, "originalThickness"),
    stress: formString(formData, "stress"),
    jointEfficiency: formString(formData, "jointEfficiency"),
    ca: formString(formData, "ca"),
    designLife: formString(formData, "designLife"),
    designPressure: formString(formData, "designPressure"),
    operatingPressure: formString(formData, "operatingPressure"),
    designTemperature: formString(formData, "designTemperature"),
    operatingTemperature: formString(formData, "operatingTemperature"),
  });
  return result.success ? { ok: true, data: result.data } : invalid(result.error);
}

export function parseCmlForm(formData: FormData): Parsed<CmlFormData> {
  const result = cmlSchema.safeParse({
    cmlNumber: formString(formData, "cmlNumber"),
    cmlDescription: formString(formData, "cmlDescription"),
  });
  return result.success ? { ok: true, data: result.data } : invalid(result.error);
}

export function parseTestPointForm(formData: FormData): Parsed<TestPointFormData> {
  const result = testPointSchema.safeParse({
    tpNumber: formString(formData, "tpNumber"),
    tpDescription: formString(formData, "tpDescription"),
    note: formString(formData, "note"),
  });
  return result.success ? { ok: true, data: result.data } : invalid(result.error);
}

export function readKey(formData: FormData, key: string): string {
  return formString(formData, key).trim();
}

export function parseThicknessForm(formData: FormData): Parsed<ThicknessFormData> {
  const result = thicknessSchema.safeParse({
    inspectionDate: formString(formData, "inspectionDate"),
    actualThickness: formString(formData, "actualThickness"),
  });
  return result.success ? { ok: true, data: result.data } : invalid(result.error);
}
