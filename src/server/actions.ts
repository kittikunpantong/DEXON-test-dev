"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import {
  createCml,
  createLine,
  createTestPoint,
  createThickness,
  deleteCml,
  deleteLine,
  deleteTestPoint,
  deleteThickness,
  updateCml,
  updateLine,
  updateTestPoint,
  updateThickness,
} from "@/server/line-service";
import {
  parseCmlForm,
  parseLineForm,
  parseTestPointForm,
  parseThicknessForm,
  readKey,
} from "@/lib/validators";

export type ActionState = { error?: string };

function fail(error: unknown): ActionState {
  if (error instanceof Error && error.message) return { error: error.message };
  return { error: "Could not save" };
}

function detailPath(lineNumber: string, cmlNumber?: string, tpNumber?: string): string {
  const params = new URLSearchParams();
  if (cmlNumber) params.set("cml", cmlNumber);
  if (tpNumber) params.set("tp", tpNumber);
  const query = params.toString();
  const path = `/lines/${encodeURIComponent(lineNumber)}`;
  return query ? `${path}?${query}` : path;
}

export async function createLineAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = parseLineForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  try {
    await createLine(parsed.data);
  } catch (error) {
    return fail(error);
  }
  redirect(detailPath(parsed.data.lineNumber));
}

export async function updateLineAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const current = readKey(formData, "currentLineNumber");
  const parsed = parseLineForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  try {
    await updateLine(current, parsed.data);
  } catch (error) {
    return fail(error);
  }
  redirect(detailPath(parsed.data.lineNumber));
}

export async function deleteLineAction(formData: FormData): Promise<void> {
  await requireUser();
  const lineNumber = readKey(formData, "lineNumber");
  await deleteLine(lineNumber);
  redirect("/");
}

export async function createCmlAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const lineNumber = readKey(formData, "lineNumber");
  const parsed = parseCmlForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  try {
    await createCml(lineNumber, parsed.data);
  } catch (error) {
    return fail(error);
  }
  redirect(detailPath(lineNumber, String(parsed.data.cmlNumber)));
}

export async function updateCmlAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const lineNumber = readKey(formData, "lineNumber");
  const current = Number(readKey(formData, "currentCmlNumber"));
  const parsed = parseCmlForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  try {
    await updateCml(lineNumber, current, parsed.data);
  } catch (error) {
    return fail(error);
  }
  redirect(detailPath(lineNumber, String(parsed.data.cmlNumber)));
}

export async function deleteCmlAction(formData: FormData): Promise<void> {
  await requireUser();
  const lineNumber = readKey(formData, "lineNumber");
  await deleteCml(lineNumber, Number(readKey(formData, "cmlNumber")));
  redirect(detailPath(lineNumber));
}

export async function createTestPointAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const lineNumber = readKey(formData, "lineNumber");
  const cmlNumber = readKey(formData, "cmlNumber");
  const parsed = parseTestPointForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  try {
    await createTestPoint(lineNumber, Number(cmlNumber), parsed.data);
  } catch (error) {
    return fail(error);
  }
  redirect(detailPath(lineNumber, cmlNumber, String(parsed.data.tpNumber)));
}

export async function updateTestPointAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const lineNumber = readKey(formData, "lineNumber");
  const cmlNumber = readKey(formData, "cmlNumber");
  const current = Number(readKey(formData, "currentTpNumber"));
  const parsed = parseTestPointForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  try {
    await updateTestPoint(lineNumber, Number(cmlNumber), current, parsed.data);
  } catch (error) {
    return fail(error);
  }
  redirect(detailPath(lineNumber, cmlNumber, String(parsed.data.tpNumber)));
}

export async function deleteTestPointAction(formData: FormData): Promise<void> {
  await requireUser();
  const lineNumber = readKey(formData, "lineNumber");
  const cmlNumber = readKey(formData, "cmlNumber");
  await deleteTestPoint(lineNumber, Number(cmlNumber), Number(readKey(formData, "tpNumber")));
  redirect(detailPath(lineNumber, cmlNumber));
}

export async function createThicknessAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const lineNumber = readKey(formData, "lineNumber");
  const cmlNumber = readKey(formData, "cmlNumber");
  const tpNumber = readKey(formData, "tpNumber");
  const parsed = parseThicknessForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  try {
    await createThickness(lineNumber, Number(cmlNumber), Number(tpNumber), parsed.data);
  } catch (error) {
    return fail(error);
  }
  redirect(detailPath(lineNumber, cmlNumber, tpNumber));
}

export async function updateThicknessAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const lineNumber = readKey(formData, "lineNumber");
  const cmlNumber = readKey(formData, "cmlNumber");
  const tpNumber = readKey(formData, "tpNumber");
  const currentDate = readKey(formData, "currentInspectionDate");
  const parsed = parseThicknessForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  try {
    await updateThickness(lineNumber, Number(cmlNumber), Number(tpNumber), currentDate, parsed.data);
  } catch (error) {
    return fail(error);
  }
  redirect(detailPath(lineNumber, cmlNumber, tpNumber));
}

export async function deleteThicknessAction(formData: FormData): Promise<void> {
  await requireUser();
  const lineNumber = readKey(formData, "lineNumber");
  const cmlNumber = readKey(formData, "cmlNumber");
  const tpNumber = readKey(formData, "tpNumber");
  await deleteThickness(
    lineNumber,
    Number(cmlNumber),
    Number(tpNumber),
    readKey(formData, "inspectionDate"),
  );
  redirect(detailPath(lineNumber, cmlNumber, tpNumber));
}
