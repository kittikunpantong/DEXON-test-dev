import { prisma } from "./db";

export type RecordSlot = "insert" | "revive" | "taken";

function slotOf(row: { deletedAt: Date | null } | null): RecordSlot {
  if (!row) return "insert";
  return row.deletedAt ? "revive" : "taken";
}

export async function softDeleteLine(lineNumber: string): Promise<void> {
  const deletedAt = new Date();
  await prisma.$transaction([
    prisma.thickness.updateMany({ where: { lineNumber, deletedAt: null }, data: { deletedAt } }),
    prisma.testPoint.updateMany({ where: { lineNumber, deletedAt: null }, data: { deletedAt } }),
    prisma.cml.updateMany({ where: { lineNumber, deletedAt: null }, data: { deletedAt } }),
    prisma.info.update({ where: { lineNumber }, data: { deletedAt } }),
  ]);
}

export async function softDeleteCml(lineNumber: string, cmlNumber: number): Promise<void> {
  const deletedAt = new Date();
  await prisma.$transaction([
    prisma.thickness.updateMany({ where: { lineNumber, cmlNumber, deletedAt: null }, data: { deletedAt } }),
    prisma.testPoint.updateMany({ where: { lineNumber, cmlNumber, deletedAt: null }, data: { deletedAt } }),
    prisma.cml.update({ where: { lineNumber_cmlNumber: { lineNumber, cmlNumber } }, data: { deletedAt } }),
  ]);
}

export async function softDeleteTestPoint(lineNumber: string, cmlNumber: number, tpNumber: number): Promise<void> {
  const deletedAt = new Date();
  await prisma.$transaction([
    prisma.thickness.updateMany({ where: { lineNumber, cmlNumber, tpNumber, deletedAt: null }, data: { deletedAt } }),
    prisma.testPoint.update({
      where: { lineNumber_cmlNumber_tpNumber: { lineNumber, cmlNumber, tpNumber } },
      data: { deletedAt },
    }),
  ]);
}

export async function softDeleteThickness(
  lineNumber: string,
  cmlNumber: number,
  tpNumber: number,
  inspectionDate: Date,
): Promise<void> {
  await prisma.thickness.update({
    where: {
      lineNumber_cmlNumber_tpNumber_inspectionDate: { lineNumber, cmlNumber, tpNumber, inspectionDate },
    },
    data: { deletedAt: new Date() },
  });
}

export async function infoSlot(lineNumber: string): Promise<RecordSlot> {
  const row = await prisma.info.findUnique({ where: { lineNumber }, select: { deletedAt: true } });
  return slotOf(row);
}

export async function cmlSlot(lineNumber: string, cmlNumber: number): Promise<RecordSlot> {
  const row = await prisma.cml.findUnique({
    where: { lineNumber_cmlNumber: { lineNumber, cmlNumber } },
    select: { deletedAt: true },
  });
  return slotOf(row);
}

export async function testPointSlot(lineNumber: string, cmlNumber: number, tpNumber: number): Promise<RecordSlot> {
  const row = await prisma.testPoint.findUnique({
    where: { lineNumber_cmlNumber_tpNumber: { lineNumber, cmlNumber, tpNumber } },
    select: { deletedAt: true },
  });
  return slotOf(row);
}

export async function thicknessSlot(
  lineNumber: string,
  cmlNumber: number,
  tpNumber: number,
  inspectionDate: Date,
): Promise<RecordSlot> {
  const row = await prisma.thickness.findUnique({
    where: {
      lineNumber_cmlNumber_tpNumber_inspectionDate: { lineNumber, cmlNumber, tpNumber, inspectionDate },
    },
    select: { deletedAt: true },
  });
  return slotOf(row);
}

// The business code is the primary key, so a hidden row has to be removed before a different active row can take that code.
export async function releaseDeletedInfo(lineNumber: string): Promise<void> {
  if ((await infoSlot(lineNumber)) === "revive") await prisma.info.delete({ where: { lineNumber } });
}

export async function releaseDeletedCml(lineNumber: string, cmlNumber: number): Promise<void> {
  if ((await cmlSlot(lineNumber, cmlNumber)) === "revive") {
    await prisma.cml.delete({ where: { lineNumber_cmlNumber: { lineNumber, cmlNumber } } });
  }
}

export async function releaseDeletedTestPoint(lineNumber: string, cmlNumber: number, tpNumber: number): Promise<void> {
  if ((await testPointSlot(lineNumber, cmlNumber, tpNumber)) === "revive") {
    await prisma.testPoint.delete({ where: { lineNumber_cmlNumber_tpNumber: { lineNumber, cmlNumber, tpNumber } } });
  }
}

export async function releaseDeletedThickness(
  lineNumber: string,
  cmlNumber: number,
  tpNumber: number,
  inspectionDate: Date,
): Promise<void> {
  if ((await thicknessSlot(lineNumber, cmlNumber, tpNumber, inspectionDate)) === "revive") {
    await prisma.thickness.delete({
      where: {
        lineNumber_cmlNumber_tpNumber_inspectionDate: { lineNumber, cmlNumber, tpNumber, inspectionDate },
      },
    });
  }
}
