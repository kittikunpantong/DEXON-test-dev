"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { dateToDb, isDatabaseUnavailable, prisma } from "@/lib/db";
import { recalculateLine } from "@/lib/line-data";
import { linePath } from "@/lib/paths";
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
} from "@/lib/soft-delete";
import {
  parseCmlForm,
  parseLineForm,
  parseTestPointForm,
  parseThicknessForm,
  type LineFormData,
} from "@/lib/validators";

export type ActionState = { error?: string } | null;

async function withDatabase(work: () => Promise<ActionState>): Promise<ActionState> {
  await requireUser();
  try {
    return await work();
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return { error: "Could not connect to the database. Check that MySQL on localhost port 3307 is running." };
    }
    throw error;
  }
}

function lineData(data: LineFormData) {
  return {
    lineNumber: data.lineNumber,
    location: data.location,
    fromLocation: data.fromLocation,
    toLocation: data.toLocation,
    drawingNumber: data.drawingNumber,
    service: data.service,
    material: data.material,
    inserviceDate: data.inserviceDate ? dateToDb(data.inserviceDate) : null,
    pipeSize: data.pipeSize,
    originalThickness: data.originalThickness,
    stress: data.stress,
    jointEfficiency: data.jointEfficiency,
    ca: data.ca,
    designLife: data.designLife,
    designPressure: data.designPressure,
    operatingPressure: data.operatingPressure,
    designTemperature: data.designTemperature,
    operatingTemperature: data.operatingTemperature,
  };
}

function refreshLine(lineNumber: string) {
  revalidatePath("/");
  revalidatePath(linePath(lineNumber));
}

export async function createLine(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseLineForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  return withDatabase(async () => {
    const slot = await infoSlot(parsed.data.lineNumber);
    if (slot === "taken") return { error: "This line number already exists" };
    if (slot === "revive") {
      await prisma.info.update({
        where: { lineNumber: parsed.data.lineNumber },
        data: { ...lineData(parsed.data), deletedAt: null },
      });
    } else {
      await prisma.info.create({ data: lineData(parsed.data) });
    }
    await recalculateLine(parsed.data.lineNumber);
    refreshLine(parsed.data.lineNumber);
    redirect(linePath(parsed.data.lineNumber));
  });
}

export async function updateLine(currentLineNumber: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseLineForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  return withDatabase(async () => {
    if (parsed.data.lineNumber !== currentLineNumber) {
      const slot = await infoSlot(parsed.data.lineNumber);
      if (slot === "taken") return { error: "This line number already exists" };
      if (slot === "revive") await releaseDeletedInfo(parsed.data.lineNumber);
    }
    await prisma.info.update({ where: { lineNumber: currentLineNumber }, data: lineData(parsed.data) });
    await recalculateLine(parsed.data.lineNumber);
    refreshLine(currentLineNumber);
    refreshLine(parsed.data.lineNumber);
    redirect(linePath(parsed.data.lineNumber));
  });
}

export async function deleteLine(lineNumber: string): Promise<void> {
  await requireUser();
  await softDeleteLine(lineNumber);
  revalidatePath("/");
  redirect("/");
}

export async function createCml(lineNumber: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseCmlForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  return withDatabase(async () => {
    const slot = await cmlSlot(lineNumber, parsed.data.cmlNumber);
    if (slot === "taken") return { error: "This CML number already exists on this line" };
    if (slot === "revive") {
      await prisma.cml.update({
        where: { lineNumber_cmlNumber: { lineNumber, cmlNumber: parsed.data.cmlNumber } },
        data: { cmlDescription: parsed.data.cmlDescription, deletedAt: null },
      });
    } else {
      await prisma.cml.create({
        data: {
          lineNumber,
          cmlNumber: parsed.data.cmlNumber,
          cmlDescription: parsed.data.cmlDescription,
        },
      });
    }
    await recalculateLine(lineNumber);
    refreshLine(lineNumber);
    redirect(linePath(lineNumber));
  });
}

export async function updateCml(
  lineNumber: string,
  currentCmlNumber: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseCmlForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  return withDatabase(async () => {
    if (parsed.data.cmlNumber !== currentCmlNumber) {
      const slot = await cmlSlot(lineNumber, parsed.data.cmlNumber);
      if (slot === "taken") return { error: "This CML number already exists on this line" };
      if (slot === "revive") await releaseDeletedCml(lineNumber, parsed.data.cmlNumber);
    }
    await prisma.cml.update({
      where: { lineNumber_cmlNumber: { lineNumber, cmlNumber: currentCmlNumber } },
      data: { cmlNumber: parsed.data.cmlNumber, cmlDescription: parsed.data.cmlDescription },
    });
    await recalculateLine(lineNumber);
    refreshLine(lineNumber);
    redirect(linePath(lineNumber));
  });
}

export async function deleteCml(lineNumber: string, cmlNumber: number): Promise<void> {
  await requireUser();
  await softDeleteCml(lineNumber, cmlNumber);
  await recalculateLine(lineNumber);
  refreshLine(lineNumber);
  redirect(linePath(lineNumber));
}

export async function createTestPoint(
  lineNumber: string,
  cmlNumber: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseTestPointForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  return withDatabase(async () => {
    const slot = await testPointSlot(lineNumber, cmlNumber, parsed.data.tpNumber);
    if (slot === "taken") return { error: "This test point number already exists on this CML" };
    if (slot === "revive") {
      await prisma.testPoint.update({
        where: { lineNumber_cmlNumber_tpNumber: { lineNumber, cmlNumber, tpNumber: parsed.data.tpNumber } },
        data: { tpDescription: parsed.data.tpDescription, note: parsed.data.note, deletedAt: null },
      });
    } else {
      await prisma.testPoint.create({
        data: {
          lineNumber,
          cmlNumber,
          tpNumber: parsed.data.tpNumber,
          tpDescription: parsed.data.tpDescription,
          note: parsed.data.note,
        },
      });
    }
    await recalculateLine(lineNumber);
    refreshLine(lineNumber);
    redirect(linePath(lineNumber));
  });
}

export async function updateTestPoint(
  lineNumber: string,
  cmlNumber: number,
  currentTpNumber: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseTestPointForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  return withDatabase(async () => {
    if (parsed.data.tpNumber !== currentTpNumber) {
      const slot = await testPointSlot(lineNumber, cmlNumber, parsed.data.tpNumber);
      if (slot === "taken") return { error: "This test point number already exists on this CML" };
      if (slot === "revive") await releaseDeletedTestPoint(lineNumber, cmlNumber, parsed.data.tpNumber);
    }
    await prisma.testPoint.update({
      where: { lineNumber_cmlNumber_tpNumber: { lineNumber, cmlNumber, tpNumber: currentTpNumber } },
      data: {
        tpNumber: parsed.data.tpNumber,
        tpDescription: parsed.data.tpDescription,
        note: parsed.data.note,
      },
    });
    await recalculateLine(lineNumber);
    refreshLine(lineNumber);
    redirect(linePath(lineNumber));
  });
}

export async function deleteTestPoint(lineNumber: string, cmlNumber: number, tpNumber: number): Promise<void> {
  await requireUser();
  await softDeleteTestPoint(lineNumber, cmlNumber, tpNumber);
  await recalculateLine(lineNumber);
  refreshLine(lineNumber);
  redirect(linePath(lineNumber));
}

export async function createThickness(
  lineNumber: string,
  cmlNumber: number,
  tpNumber: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseThicknessForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  return withDatabase(async () => {
    const inspectionDate = dateToDb(parsed.data.inspectionDate);
    const slot = await thicknessSlot(lineNumber, cmlNumber, tpNumber, inspectionDate);
    if (slot === "taken") return { error: "This test point already has a thickness reading on the selected date" };
    if (slot === "revive") {
      await prisma.thickness.update({
        where: {
          lineNumber_cmlNumber_tpNumber_inspectionDate: { lineNumber, cmlNumber, tpNumber, inspectionDate },
        },
        data: { actualThickness: parsed.data.actualThickness, deletedAt: null },
      });
    } else {
      await prisma.thickness.create({
        data: {
          lineNumber,
          cmlNumber,
          tpNumber,
          inspectionDate,
          actualThickness: parsed.data.actualThickness,
        },
      });
    }
    await recalculateLine(lineNumber);
    refreshLine(lineNumber);
    redirect(linePath(lineNumber));
  });
}

export async function updateThickness(
  lineNumber: string,
  cmlNumber: number,
  tpNumber: number,
  currentDate: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseThicknessForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  return withDatabase(async () => {
    if (parsed.data.inspectionDate !== currentDate) {
      const inspectionDate = dateToDb(parsed.data.inspectionDate);
      const slot = await thicknessSlot(lineNumber, cmlNumber, tpNumber, inspectionDate);
      if (slot === "taken") return { error: "This test point already has a thickness reading on the selected date" };
      if (slot === "revive") await releaseDeletedThickness(lineNumber, cmlNumber, tpNumber, inspectionDate);
    }
    await prisma.thickness.update({
      where: {
        lineNumber_cmlNumber_tpNumber_inspectionDate: {
          lineNumber,
          cmlNumber,
          tpNumber,
          inspectionDate: dateToDb(currentDate),
        },
      },
      data: {
        inspectionDate: dateToDb(parsed.data.inspectionDate),
        actualThickness: parsed.data.actualThickness,
      },
    });
    await recalculateLine(lineNumber);
    refreshLine(lineNumber);
    redirect(linePath(lineNumber));
  });
}

export async function deleteThickness(
  lineNumber: string,
  cmlNumber: number,
  tpNumber: number,
  inspectionDate: string,
): Promise<void> {
  await requireUser();
  await softDeleteThickness(lineNumber, cmlNumber, tpNumber, dateToDb(inspectionDate));
  await recalculateLine(lineNumber);
  refreshLine(lineNumber);
  redirect(linePath(lineNumber));
}
