import { Prisma } from "@prisma/client";
import { PrismaClientInitializationError, PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import Decimal from "decimal.js";
import {
  computeLine,
  type CmlInput,
  type ComputedLine,
  type LifeStatus,
  type LineInput,
  type TestPointInput,
  type ThicknessInput,
} from "../lib/calculations";
import { dateToIso, decimalToString, isoToUtcDate } from "../lib/dates";
import type { CmlView, LineView, TestPointView } from "../lib/present";
import { DatabaseUnavailableError, isDatabaseUnavailable, prisma } from "../lib/db";
import {
  cmlSlot,
  infoSlot,
  releaseDeletedCml,
  releaseDeletedInfo,
  releaseDeletedTestPoint,
  releaseDeletedThickness,
  softDeleteCml,
  softDeleteLine,
  softDeleteTestPoint,
  softDeleteThickness,
  testPointSlot,
  thicknessSlot,
} from "../lib/soft-delete";
import type { CmlFormData, LineFormData, TestPointFormData, ThicknessFormData } from "../lib/validators";

const active = { deletedAt: null };

const lineInclude = {
  cmls: {
    where: active,
    orderBy: { cmlNumber: "asc" as const },
    include: {
      testPoints: {
        where: active,
        orderBy: { tpNumber: "asc" as const },
        include: {
          readings: {
            where: active,
            orderBy: { inspectionDate: "asc" as const },
          },
        },
      },
    },
  },
};

type DecimalValue = { toString(): string };

type ReadingRecord = {
  inspectionDate: Date;
  actualThickness: DecimalValue;
};

type TestPointRecord = {
  tpNumber: number;
  tpDescription: number;
  note: string | null;
  readings: ReadingRecord[];
};

type CmlRecord = {
  cmlNumber: number;
  cmlDescription: string;
  testPoints: TestPointRecord[];
};

type LineRecord = {
  lineNumber: string;
  location: string;
  fromLocation: string;
  toLocation: string;
  drawingNumber: string;
  service: string;
  material: string;
  inserviceDate: Date | null;
  pipeSize: DecimalValue;
  originalThickness: DecimalValue | null;
  stress: DecimalValue;
  jointEfficiency: DecimalValue;
  ca: DecimalValue;
  designLife: number;
  designPressure: DecimalValue;
  operatingPressure: DecimalValue;
  designTemperature: DecimalValue;
  operatingTemperature: DecimalValue;
  cmls: CmlRecord[];
};

function lifeData(status: LifeStatus, years: string | null) {
  return {
    lifeStatus: status,
    remainingLife: status === "finite" ? years : null,
  };
}

async function settle<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (error) {
    if (isDatabaseUnavailable(error) || error instanceof PrismaClientInitializationError) {
      throw new DatabaseUnavailableError();
    }
    throw error;
  }
}

function toInput(record: LineRecord): LineInput {
  const cmls: CmlInput[] = record.cmls.map((cml) => ({
    cmlNumber: cml.cmlNumber,
    cmlDescription: cml.cmlDescription,
    testPoints: cml.testPoints.map(
      (point): TestPointInput => ({
        tpNumber: point.tpNumber,
        tpDescription: point.tpDescription,
        note: point.note,
        readings: point.readings.map(
          (reading): ThicknessInput => ({
            inspectionDate: dateToIso(reading.inspectionDate),
            actualThickness: decimalToString(reading.actualThickness) ?? "0",
          }),
        ),
      }),
    ),
  }));

  return {
    pipeSize: decimalToString(record.pipeSize) ?? "0",
    originalThickness: decimalToString(record.originalThickness),
    stress: decimalToString(record.stress) ?? "0",
    jointEfficiency: decimalToString(record.jointEfficiency) ?? "0",
    designPressure: decimalToString(record.designPressure) ?? "0",
    inserviceDate: record.inserviceDate ? dateToIso(record.inserviceDate) : null,
    cmls,
  };
}

function lineData(input: LineFormData) {
  return {
    lineNumber: input.lineNumber,
    location: input.location,
    fromLocation: input.fromLocation,
    toLocation: input.toLocation,
    drawingNumber: input.drawingNumber,
    service: input.service,
    material: input.material,
    inserviceDate: input.inserviceDate ? isoToUtcDate(input.inserviceDate) : null,
    pipeSize: input.pipeSize,
    originalThickness: input.originalThickness,
    stress: input.stress,
    jointEfficiency: input.jointEfficiency,
    ca: input.ca,
    designLife: input.designLife,
    designPressure: input.designPressure,
    operatingPressure: input.operatingPressure,
    designTemperature: input.designTemperature,
    operatingTemperature: input.operatingTemperature,
  };
}

export async function recalculateLine(lineNumber: string): Promise<void> {
  const record = (await prisma.info.findUnique({
    where: { lineNumber },
    include: lineInclude,
  })) as (LineRecord & { deletedAt: Date | null }) | null;
  if (!record || record.deletedAt) return;
  const computed = computeLine(toInput(record));
  const writes: Prisma.PrismaPromise<unknown>[] = [
    prisma.info.update({
      where: { lineNumber },
      data: {
        corrosionRate: computed.corrosionRate,
        ...lifeData(computed.lifeStatus, computed.remainingLife),
      },
    }),
  ];

  for (const cml of computed.cmls) {
    writes.push(
      prisma.cml.update({
        where: { lineNumber_cmlNumber: { lineNumber, cmlNumber: cml.cmlNumber } },
        data: {
          actualOutsideDiameter: cml.actualOutsideDiameter,
          designThickness: cml.designThickness,
          structuralThickness: cml.structuralThickness,
          requiredThickness: cml.requiredThickness,
          corrosionRate: cml.corrosionRate,
          ...lifeData(cml.lifeStatus, cml.remainingLife),
        },
      }),
    );
    for (const point of cml.testPoints) {
      writes.push(
        prisma.testPoint.update({
          where: {
            lineNumber_cmlNumber_tpNumber: {
              lineNumber,
              cmlNumber: cml.cmlNumber,
              tpNumber: point.tpNumber,
            },
          },
          data: {
            corrosionRate: point.corrosionRate,
            ...lifeData(point.lifeStatus, point.remainingLife),
          },
        }),
      );
      for (const reading of point.readings) {
        writes.push(
          prisma.thickness.update({
            where: {
              lineNumber_cmlNumber_tpNumber_inspectionDate: {
                lineNumber,
                cmlNumber: cml.cmlNumber,
                tpNumber: point.tpNumber,
                inspectionDate: isoToUtcDate(reading.inspectionDate),
              },
            },
            data: { intervalCorrosionRate: reading.intervalCorrosionRate },
          }),
        );
      }
    }
  }

  await prisma.$transaction(writes);
}

async function loadRecord(lineNumber: string): Promise<LineRecord | null> {
  const record = await settle(
    prisma.info.findUnique({ where: { lineNumber }, include: lineInclude }) as Promise<
      (LineRecord & { deletedAt: Date | null }) | null
    >,
  );
  if (!record || record.deletedAt) return null;
  return record;
}

function plain(value: { toString(): string } | null | undefined): string | null {
  const text = decimalToString(value);
  if (text == null) return null;
  return new Decimal(text).toString();
}

function geometryOf(source: {
  actualOutsideDiameter: string | null;
  designThickness: string | null;
  structuralThickness: string | null;
  requiredThickness: string | null;
}) {
  return {
    actualOutsideDiameter: source.actualOutsideDiameter,
    designThickness: source.designThickness,
    structuralThickness: source.structuralThickness,
    requiredThickness: source.requiredThickness,
  };
}

function toView(record: LineRecord, computed: ComputedLine): LineView {
  return {
    lineNumber: record.lineNumber,
    location: record.location,
    fromLocation: record.fromLocation,
    toLocation: record.toLocation,
    drawingNumber: record.drawingNumber,
    service: record.service,
    material: record.material,
    inserviceDate: record.inserviceDate ? dateToIso(record.inserviceDate) : null,
    pipeSize: plain(record.pipeSize) ?? "0",
    originalThickness: plain(record.originalThickness),
    stress: plain(record.stress) ?? "0",
    jointEfficiency: plain(record.jointEfficiency) ?? "0",
    ca: plain(record.ca) ?? "0",
    designLife: record.designLife,
    designPressure: plain(record.designPressure) ?? "0",
    operatingPressure: plain(record.operatingPressure) ?? "0",
    designTemperature: plain(record.designTemperature) ?? "0",
    operatingTemperature: plain(record.operatingTemperature) ?? "0",
    corrosionRate: computed.corrosionRate,
    life: { status: computed.lifeStatus, years: computed.remainingLife },
    retirementDate: computed.retirementDate,
    geometry: geometryOf(computed),
    cmls: computed.cmls.map((cml): CmlView => ({
      cmlNumber: cml.cmlNumber,
      cmlDescription: cml.cmlDescription,
      geometry: geometryOf(cml),
      corrosionRate: cml.corrosionRate,
      life: { status: cml.lifeStatus, years: cml.remainingLife },
      retirementDate: cml.retirementDate,
      governsRate: cml.governsRate,
      governsLife: cml.governsLife,
      testPoints: cml.testPoints.map(
        (point): TestPointView => ({
          tpNumber: point.tpNumber,
          tpDescription: point.tpDescription,
          note: point.note,
          readings: point.readings,
          shortTermRate: point.shortTermRate,
          longTermRate: point.longTermRate,
          inserviceRate: point.inserviceRate,
          corrosionRate: point.corrosionRate,
          life: { status: point.lifeStatus, years: point.remainingLife },
          retirementDate: point.retirementDate,
          governsRate: point.governsRate,
          governsLife: point.governsLife,
        }),
      ),
    })),
  };
}

export async function listLines(): Promise<LineView[]> {
  const records = await settle(
    prisma.info.findMany({ where: active, include: lineInclude, orderBy: { lineNumber: "asc" } }) as Promise<LineRecord[]>,
  );
  return records.map((record) => toView(record, computeLine(toInput(record))));
}

export async function getLine(lineNumber: string): Promise<LineView | null> {
  const record = await loadRecord(lineNumber);
  return record ? toView(record, computeLine(toInput(record))) : null;
}

function duplicateMessage(): string {
  return "This code already exists at the same level";
}

function isDuplicate(error: unknown): boolean {
  return error instanceof PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createLine(input: LineFormData): Promise<void> {
  const slot = await infoSlot(input.lineNumber);
  if (slot === "taken") throw new Error("This line number already exists");
  try {
    if (slot === "revive") {
      await prisma.info.update({
        where: { lineNumber: input.lineNumber },
        data: { ...lineData(input), deletedAt: null },
      });
    } else {
      await prisma.info.create({ data: lineData(input) });
    }
    await recalculateLine(input.lineNumber);
  } catch (error) {
    if (isDuplicate(error)) throw new Error("This line number already exists");
    throw error;
  }
}

export async function updateLine(currentLineNumber: string, input: LineFormData): Promise<void> {
  if (currentLineNumber !== input.lineNumber) {
    const slot = await infoSlot(input.lineNumber);
    if (slot === "taken") throw new Error("This line number already exists");
    if (slot === "revive") await releaseDeletedInfo(input.lineNumber);
  }
  try {
    await prisma.info.update({
      where: { lineNumber: currentLineNumber },
      data: lineData(input),
    });
  } catch (error) {
    if (isDuplicate(error)) throw new Error("This line number already exists");
    throw error;
  }
  await recalculateLine(input.lineNumber);
}

export async function deleteLine(lineNumber: string): Promise<void> {
  await softDeleteLine(lineNumber);
}

export async function createCml(lineNumber: string, input: CmlFormData): Promise<void> {
  const slot = await cmlSlot(lineNumber, input.cmlNumber);
  if (slot === "taken") throw new Error(duplicateMessage());
  try {
    if (slot === "revive") {
      await prisma.cml.update({
        where: { lineNumber_cmlNumber: { lineNumber, cmlNumber: input.cmlNumber } },
        data: { cmlDescription: input.cmlDescription, deletedAt: null },
      });
    } else {
      await prisma.cml.create({
        data: {
          lineNumber,
          cmlNumber: input.cmlNumber,
          cmlDescription: input.cmlDescription,
        },
      });
    }
  } catch (error) {
    if (isDuplicate(error)) throw new Error(duplicateMessage());
    throw error;
  }
  await recalculateLine(lineNumber);
}

export async function updateCml(
  lineNumber: string,
  currentCmlNumber: number,
  input: CmlFormData,
): Promise<void> {
  if (currentCmlNumber !== input.cmlNumber) {
    const slot = await cmlSlot(lineNumber, input.cmlNumber);
    if (slot === "taken") throw new Error(duplicateMessage());
    if (slot === "revive") await releaseDeletedCml(lineNumber, input.cmlNumber);
  }
  await prisma.cml.update({
    where: { lineNumber_cmlNumber: { lineNumber, cmlNumber: currentCmlNumber } },
    data: { cmlNumber: input.cmlNumber, cmlDescription: input.cmlDescription },
  });
  await recalculateLine(lineNumber);
}

export async function deleteCml(lineNumber: string, cmlNumber: number): Promise<void> {
  await softDeleteCml(lineNumber, cmlNumber);
  await recalculateLine(lineNumber);
}

export async function createTestPoint(
  lineNumber: string,
  cmlNumber: number,
  input: TestPointFormData,
): Promise<void> {
  const slot = await testPointSlot(lineNumber, cmlNumber, input.tpNumber);
  if (slot === "taken") throw new Error(duplicateMessage());
  try {
    if (slot === "revive") {
      await prisma.testPoint.update({
        where: { lineNumber_cmlNumber_tpNumber: { lineNumber, cmlNumber, tpNumber: input.tpNumber } },
        data: { tpDescription: input.tpDescription, note: input.note, deletedAt: null },
      });
    } else {
      await prisma.testPoint.create({
        data: {
          lineNumber,
          cmlNumber,
          tpNumber: input.tpNumber,
          tpDescription: input.tpDescription,
          note: input.note,
        },
      });
    }
  } catch (error) {
    if (isDuplicate(error)) throw new Error(duplicateMessage());
    throw error;
  }
  await recalculateLine(lineNumber);
}

export async function updateTestPoint(
  lineNumber: string,
  cmlNumber: number,
  currentTpNumber: number,
  input: TestPointFormData,
): Promise<void> {
  if (currentTpNumber !== input.tpNumber) {
    const slot = await testPointSlot(lineNumber, cmlNumber, input.tpNumber);
    if (slot === "taken") throw new Error(duplicateMessage());
    if (slot === "revive") await releaseDeletedTestPoint(lineNumber, cmlNumber, input.tpNumber);
  }
  await prisma.testPoint.update({
    where: {
      lineNumber_cmlNumber_tpNumber: { lineNumber, cmlNumber, tpNumber: currentTpNumber },
    },
    data: {
      tpNumber: input.tpNumber,
      tpDescription: input.tpDescription,
      note: input.note,
    },
  });
  await recalculateLine(lineNumber);
}

export async function deleteTestPoint(
  lineNumber: string,
  cmlNumber: number,
  tpNumber: number,
): Promise<void> {
  await softDeleteTestPoint(lineNumber, cmlNumber, tpNumber);
  await recalculateLine(lineNumber);
}

export async function createThickness(
  lineNumber: string,
  cmlNumber: number,
  tpNumber: number,
  input: ThicknessFormData,
): Promise<void> {
  const inspectionDate = isoToUtcDate(input.inspectionDate);
  const slot = await thicknessSlot(lineNumber, cmlNumber, tpNumber, inspectionDate);
  if (slot === "taken") throw new Error("This angle already has a thickness reading on that date");
  try {
    if (slot === "revive") {
      await prisma.thickness.update({
        where: {
          lineNumber_cmlNumber_tpNumber_inspectionDate: { lineNumber, cmlNumber, tpNumber, inspectionDate },
        },
        data: { actualThickness: input.actualThickness, deletedAt: null },
      });
    } else {
      await prisma.thickness.create({
        data: {
          lineNumber,
          cmlNumber,
          tpNumber,
          inspectionDate,
          actualThickness: input.actualThickness,
        },
      });
    }
  } catch (error) {
    if (isDuplicate(error)) throw new Error("This angle already has a thickness reading on that date");
    throw error;
  }
  await recalculateLine(lineNumber);
}

export async function updateThickness(
  lineNumber: string,
  cmlNumber: number,
  tpNumber: number,
  currentDate: string,
  input: ThicknessFormData,
): Promise<void> {
  if (currentDate !== input.inspectionDate) {
    const inspectionDate = isoToUtcDate(input.inspectionDate);
    const slot = await thicknessSlot(lineNumber, cmlNumber, tpNumber, inspectionDate);
    if (slot === "taken") throw new Error("This angle already has a thickness reading on that date");
    if (slot === "revive") await releaseDeletedThickness(lineNumber, cmlNumber, tpNumber, inspectionDate);
  }
  await prisma.thickness.update({
    where: {
      lineNumber_cmlNumber_tpNumber_inspectionDate: {
        lineNumber,
        cmlNumber,
        tpNumber,
        inspectionDate: isoToUtcDate(currentDate),
      },
    },
    data: {
      inspectionDate: isoToUtcDate(input.inspectionDate),
      actualThickness: input.actualThickness,
    },
  });
  await recalculateLine(lineNumber);
}

export async function deleteThickness(
  lineNumber: string,
  cmlNumber: number,
  tpNumber: number,
  inspectionDate: string,
): Promise<void> {
  await softDeleteThickness(lineNumber, cmlNumber, tpNumber, isoToUtcDate(inspectionDate));
  await recalculateLine(lineNumber);
}
