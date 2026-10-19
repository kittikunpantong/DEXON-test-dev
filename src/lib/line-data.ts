import { Prisma } from "@prisma/client";

import { computeLine, type ComputedLine, type LineInput } from "./calculations";
import { toIsoDate } from "./dates";
import { dateToDb, prisma } from "./db";
import { formatPlainDecimal } from "./format";

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
          readings: { where: active, orderBy: { inspectionDate: "asc" as const } },
        },
      },
    },
  },
} satisfies Prisma.InfoInclude;

type LineRow = Prisma.InfoGetPayload<{ include: typeof lineInclude }>;

export type LineRecord = {
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
};

export type LineView = {
  record: LineRecord;
  computed: ComputedLine;
};

function toLineInput(row: LineRow): LineInput {
  return {
    pipeSize: row.pipeSize.toString(),
    originalThickness: row.originalThickness?.toString() ?? null,
    stress: row.stress.toString(),
    jointEfficiency: row.jointEfficiency.toString(),
    designPressure: row.designPressure.toString(),
    inserviceDate: row.inserviceDate ? toIsoDate(row.inserviceDate) : null,
    cmls: row.cmls.map((cml) => ({
      cmlNumber: cml.cmlNumber,
      cmlDescription: cml.cmlDescription,
      testPoints: cml.testPoints.map((point) => ({
        tpNumber: point.tpNumber,
        tpDescription: point.tpDescription,
        note: point.note,
        readings: point.readings.map((reading) => ({
          inspectionDate: toIsoDate(reading.inspectionDate),
          actualThickness: reading.actualThickness.toString(),
        })),
      })),
    })),
  };
}

function toRecord(row: LineRow): LineRecord {
  return {
    lineNumber: row.lineNumber,
    location: row.location,
    fromLocation: row.fromLocation,
    toLocation: row.toLocation,
    drawingNumber: row.drawingNumber,
    service: row.service,
    material: row.material,
    inserviceDate: row.inserviceDate ? toIsoDate(row.inserviceDate) : null,
    pipeSize: formatPlainDecimal(row.pipeSize),
    originalThickness: row.originalThickness ? formatPlainDecimal(row.originalThickness) : null,
    stress: formatPlainDecimal(row.stress),
    jointEfficiency: formatPlainDecimal(row.jointEfficiency),
    ca: formatPlainDecimal(row.ca),
    designLife: row.designLife,
    designPressure: formatPlainDecimal(row.designPressure),
    operatingPressure: formatPlainDecimal(row.operatingPressure),
    designTemperature: formatPlainDecimal(row.designTemperature),
    operatingTemperature: formatPlainDecimal(row.operatingTemperature),
  };
}

async function findLine(lineNumber: string): Promise<LineRow | null> {
  const row = await prisma.info.findUnique({ where: { lineNumber }, include: lineInclude });
  if (!row || row.deletedAt) return null;
  return row;
}

export async function loadLineView(lineNumber: string): Promise<LineView | null> {
  const row = await findLine(lineNumber);
  if (!row) return null;
  return { record: toRecord(row), computed: computeLine(toLineInput(row)) };
}

export async function loadLineSummaries(): Promise<LineView[]> {
  const rows = await prisma.info.findMany({ where: active, include: lineInclude });
  return rows
    .map((row) => ({ record: toRecord(row), computed: computeLine(toLineInput(row)) }))
    .sort((a, b) => compareViews(a, b));
}

function compareViews(a: LineView, b: LineView): number {
  const rank = (view: LineView) => {
    if (view.computed.lifeStatus === "finite") return [0, Number(view.computed.remainingLife ?? 0)] as const;
    if (view.computed.lifeStatus === "unlimited") return [1, 0] as const;
    return [2, 0] as const;
  };
  const [aGroup, aLife] = rank(a);
  const [bGroup, bLife] = rank(b);
  if (aGroup !== bGroup) return aGroup - bGroup;
  if (aLife !== bLife) return aLife - bLife;
  return a.record.lineNumber.localeCompare(b.record.lineNumber);
}

export async function recalculateLine(lineNumber: string): Promise<void> {
  const row = await findLine(lineNumber);
  if (!row) return;
  const computed = computeLine(toLineInput(row));

  await prisma.$transaction(
    async (tx) => {
      await tx.info.update({
        where: { lineNumber },
        data: {
          corrosionRate: computed.corrosionRate,
          remainingLife: computed.remainingLife,
          lifeStatus: computed.lifeStatus,
        },
      });

      for (const cml of computed.cmls) {
        await tx.cml.update({
          where: { lineNumber_cmlNumber: { lineNumber, cmlNumber: cml.cmlNumber } },
          data: {
            actualOutsideDiameter: cml.actualOutsideDiameter,
            designThickness: cml.designThickness,
            structuralThickness: cml.structuralThickness,
            requiredThickness: cml.requiredThickness,
            corrosionRate: cml.corrosionRate,
            remainingLife: cml.remainingLife,
            lifeStatus: cml.lifeStatus,
          },
        });

        for (const point of cml.testPoints) {
          await tx.testPoint.update({
            where: {
              lineNumber_cmlNumber_tpNumber: {
                lineNumber,
                cmlNumber: cml.cmlNumber,
                tpNumber: point.tpNumber,
              },
            },
            data: {
              corrosionRate: point.corrosionRate,
              remainingLife: point.remainingLife,
              lifeStatus: point.lifeStatus,
            },
          });

          for (const reading of point.readings) {
            await tx.thickness.update({
              where: {
                lineNumber_cmlNumber_tpNumber_inspectionDate: {
                  lineNumber,
                  cmlNumber: cml.cmlNumber,
                  tpNumber: point.tpNumber,
                  inspectionDate: dateToDb(reading.inspectionDate),
                },
              },
              data: { intervalCorrosionRate: reading.intervalCorrosionRate },
            });
          }
        }
      }
    },
    { timeout: 20000 },
  );
}
