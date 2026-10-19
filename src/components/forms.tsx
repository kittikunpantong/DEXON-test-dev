"use client";

import { useActionState } from "react";

import type { ActionState } from "@/app/actions";
import { buttonCompactDanger, buttonPrimary, buttonSecondary, Field, FormError, inputClass } from "@/components/ui";

export function BoundForm({
  action,
  className,
  children,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  className?: string;
  children: (state: ActionState, pending: boolean) => React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children(state, pending)}
    </form>
  );
}

export function ConfirmSubmit({
  action,
  label,
  confirm,
  className = buttonCompactDanger,
}: {
  action: () => Promise<void>;
  label: string;
  confirm: string;
  className?: string;
}) {
  return (
    <form
      action={async () => {
        if (!window.confirm(confirm)) return;
        await action();
      }}
    >
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}

export type LineDefaults = {
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

export function LineForm({
  action,
  defaults,
  submitLabel,
  onCancel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: Partial<LineDefaults>;
  submitLabel: string;
  onCancel?: () => void;
  variant?: "inline" | "dialog";
}) {
  return (
    <BoundForm action={action} className="grid gap-6">
      {(state, pending) => (
        <>
          <FormError message={state?.error} />
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Line number" hint="For example 6-PL-J4N-01007">
              <input className={inputClass} name="lineNumber" defaultValue={defaults?.lineNumber ?? ""} required />
            </Field>
            <Field label="Location">
              <input className={inputClass} name="location" defaultValue={defaults?.location ?? ""} required />
            </Field>
            <Field label="From">
              <input className={inputClass} name="fromLocation" defaultValue={defaults?.fromLocation ?? ""} required />
            </Field>
            <Field label="To">
              <input className={inputClass} name="toLocation" defaultValue={defaults?.toLocation ?? ""} required />
            </Field>
            <Field label="Drawing">
              <input className={inputClass} name="drawingNumber" defaultValue={defaults?.drawingNumber ?? ""} required />
            </Field>
            <Field label="Service">
              <input className={inputClass} name="service" defaultValue={defaults?.service ?? ""} required />
            </Field>
            <Field label="Material">
              <input className={inputClass} name="material" defaultValue={defaults?.material ?? ""} required />
            </Field>
            <Field label="In-service date" hint="Used for the since-in-service rate when there is only one reading">
              <input className={inputClass} type="date" name="inserviceDate" defaultValue={defaults?.inserviceDate ?? ""} />
            </Field>
            <Field label="Pipe size (in)">
              <input className={inputClass} name="pipeSize" inputMode="decimal" defaultValue={defaults?.pipeSize ?? ""} required />
            </Field>
            <Field label="Original thickness (mm)">
              <input
                className={inputClass}
                name="originalThickness"
                inputMode="decimal"
                defaultValue={defaults?.originalThickness ?? ""}
              />
            </Field>
            <Field label="Stress" hint="Use the same unit as design pressure">
              <input className={inputClass} name="stress" inputMode="decimal" defaultValue={defaults?.stress ?? ""} required />
            </Field>
            <Field label="Joint efficiency" hint="0 to 1">
              <input
                className={inputClass}
                name="jointEfficiency"
                inputMode="decimal"
                defaultValue={defaults?.jointEfficiency ?? ""}
                required
              />
            </Field>
            <Field label="Corrosion allowance (mm)" hint="Stored on the line and not added into required thickness">
              <input className={inputClass} name="ca" inputMode="decimal" defaultValue={defaults?.ca ?? ""} required />
            </Field>
            <Field label="Design life (yr)">
              <input className={inputClass} name="designLife" inputMode="numeric" defaultValue={defaults?.designLife ?? ""} required />
            </Field>
            <Field label="Design pressure">
              <input
                className={inputClass}
                name="designPressure"
                inputMode="decimal"
                defaultValue={defaults?.designPressure ?? ""}
                required
              />
            </Field>
            <Field label="Operating pressure">
              <input
                className={inputClass}
                name="operatingPressure"
                inputMode="decimal"
                defaultValue={defaults?.operatingPressure ?? ""}
                required
              />
            </Field>
            <Field label="Design temperature">
              <input
                className={inputClass}
                name="designTemperature"
                inputMode="decimal"
                defaultValue={defaults?.designTemperature ?? ""}
                required
              />
            </Field>
            <Field label="Operating temperature">
              <input
                className={inputClass}
                name="operatingTemperature"
                inputMode="decimal"
                defaultValue={defaults?.operatingTemperature ?? ""}
                required
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className={buttonPrimary} type="submit" disabled={pending}>
              {pending ? "Saving" : submitLabel}
            </button>
            {onCancel ? (
              <button className={buttonSecondary} type="button" onClick={onCancel}>
                Cancel
              </button>
            ) : (
              <a className={buttonSecondary} href={defaults?.lineNumber ? `/lines/${encodeURIComponent(defaults.lineNumber)}` : "/"}>
                Cancel
              </a>
            )}
          </div>
        </>
      )}
    </BoundForm>
  );
}

export function CmlForm({
  action,
  defaults,
  submitLabel,
  onCancel,
  variant = "inline",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: { cmlNumber?: number; cmlDescription?: string };
  submitLabel: string;
  onCancel?: () => void;
  variant?: "inline" | "dialog";
}) {
  const dialog = variant === "dialog";
  return (
    <BoundForm action={action} className={dialog ? "grid gap-5" : "grid gap-4 md:grid-cols-[160px_1fr_auto] md:items-end"}>
      {(state, pending) => (
        <>
          <div className={dialog ? undefined : "md:col-span-3"}>
            <FormError message={state?.error} />
          </div>
          <Field label="CML number">
            <input className={inputClass} name="cmlNumber" inputMode="numeric" defaultValue={defaults?.cmlNumber ?? ""} required />
          </Field>
          <Field label="Description" hint="For example straight pipe, elbow, tee">
            <input className={inputClass} name="cmlDescription" defaultValue={defaults?.cmlDescription ?? ""} required />
          </Field>
          <div className="flex flex-wrap gap-3">
            <button className={buttonPrimary} type="submit" disabled={pending}>
              {pending ? "Saving" : submitLabel}
            </button>
            {onCancel ? (
              <button className={buttonSecondary} type="button" onClick={onCancel}>
                Cancel
              </button>
            ) : null}
          </div>
        </>
      )}
    </BoundForm>
  );
}

export function TestPointForm({
  action,
  defaults,
  submitLabel,
  onCancel,
  variant = "inline",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: { tpNumber?: number; tpDescription?: number; note?: string | null };
  submitLabel: string;
  onCancel?: () => void;
  variant?: "inline" | "dialog";
}) {
  const dialog = variant === "dialog";
  return (
    <BoundForm action={action} className={dialog ? "grid gap-5" : "grid gap-4 md:grid-cols-4 md:items-end"}>
      {(state, pending) => (
        <>
          <div className={dialog ? undefined : "md:col-span-4"}>
            <FormError message={state?.error} />
          </div>
          <Field label="Test point number">
            <input className={inputClass} name="tpNumber" inputMode="numeric" defaultValue={defaults?.tpNumber ?? ""} required />
          </Field>
          <Field label="Angle (degrees)" hint="0 to 359">
            <input
              className={inputClass}
              name="tpDescription"
              inputMode="numeric"
              defaultValue={defaults?.tpDescription ?? ""}
              required
            />
          </Field>
          <Field label="Note">
            <input className={inputClass} name="note" defaultValue={defaults?.note ?? ""} />
          </Field>
          <div className="flex flex-wrap gap-3">
            <button className={buttonPrimary} type="submit" disabled={pending}>
              {pending ? "Saving" : submitLabel}
            </button>
            {onCancel ? (
              <button className={buttonSecondary} type="button" onClick={onCancel}>
                Cancel
              </button>
            ) : null}
          </div>
        </>
      )}
    </BoundForm>
  );
}

export function ThicknessForm({
  action,
  defaults,
  submitLabel,
  onCancel,
  variant = "inline",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: { inspectionDate?: string; actualThickness?: string };
  submitLabel: string;
  onCancel?: () => void;
  variant?: "inline" | "dialog";
}) {
  const dialog = variant === "dialog";
  return (
    <BoundForm action={action} className={dialog ? "grid gap-5" : "grid gap-4 md:grid-cols-3 md:items-end"}>
      {(state, pending) => (
        <>
          <div className={dialog ? undefined : "md:col-span-3"}>
            <FormError message={state?.error} />
          </div>
          <Field label="Inspection date">
            <input className={inputClass} type="date" name="inspectionDate" defaultValue={defaults?.inspectionDate ?? ""} required />
          </Field>
          <Field label="Actual thickness (mm)">
            <input
              className={inputClass}
              name="actualThickness"
              inputMode="decimal"
              defaultValue={defaults?.actualThickness ?? ""}
              required
            />
          </Field>
          <div className="flex flex-wrap gap-3">
            <button className={buttonPrimary} type="submit" disabled={pending}>
              {pending ? "Saving" : submitLabel}
            </button>
            {onCancel ? (
              <button className={buttonSecondary} type="button" onClick={onCancel}>
                Cancel
              </button>
            ) : null}
          </div>
        </>
      )}
    </BoundForm>
  );
}
