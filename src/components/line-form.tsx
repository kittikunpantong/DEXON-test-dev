import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/fields";
import type { ActionState } from "@/server/actions";
import type { LineView } from "@/lib/present";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function LineForm({
  action,
  line,
  submitLabel,
}: {
  action: Action;
  line?: LineView;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} submitLabel={submitLabel}>
      {line ? <input type="hidden" name="currentLineNumber" value={line.lineNumber} /> : null}
      <div className="form-grid">
        <Field label="Line number" name="lineNumber" defaultValue={line?.lineNumber} required />
        <Field label="Location" name="location" defaultValue={line?.location} required />
        <Field label="From" name="fromLocation" defaultValue={line?.fromLocation} required />
        <Field label="To" name="toLocation" defaultValue={line?.toLocation} required />
        <Field label="Drawing" name="drawingNumber" defaultValue={line?.drawingNumber} required />
        <Field label="Service" name="service" defaultValue={line?.service} required />
        <Field label="Material" name="material" defaultValue={line?.material} required />
        <Field
          label="In-service date"
          name="inserviceDate"
          type="date"
          defaultValue={line?.inserviceDate}
          hint="Optional. Without an in-service date, the since-in-service rate is not calculated"
        />
        <Field
          label="Pipe size (in)"
          name="pipeSize"
          type="number"
          step="0.001"
          min="0.001"
          defaultValue={line?.pipeSize}
          required
        />
        <Field
          label="Original thickness (mm)"
          name="originalThickness"
          type="number"
          step="0.001"
          min="0"
          defaultValue={line?.originalThickness}
          hint="Optional. Used as the starting point for the since-in-service rate"
        />
        <Field
          label="Allowable stress"
          name="stress"
          type="number"
          step="0.001"
          min="0"
          defaultValue={line?.stress}
          required
          hint="Same unit as design pressure"
        />
        <Field
          label="Joint efficiency"
          name="jointEfficiency"
          type="number"
          step="0.001"
          min="0"
          max="1"
          defaultValue={line?.jointEfficiency}
          required
          hint="From 0 to 1"
        />
        <Field
          label="Corrosion allowance (mm)"
          name="ca"
          type="number"
          step="0.001"
          min="0"
          defaultValue={line?.ca}
          required
          hint="Stored on the line and not added into required thickness"
        />
        <Field
          label="Design life (yr)"
          name="designLife"
          type="number"
          step="1"
          min="1"
          defaultValue={line?.designLife}
          required
        />
        <Field
          label="Design pressure"
          name="designPressure"
          type="number"
          step="0.001"
          min="0"
          defaultValue={line?.designPressure}
          required
        />
        <Field
          label="Operating pressure"
          name="operatingPressure"
          type="number"
          step="0.001"
          min="0"
          defaultValue={line?.operatingPressure}
          required
        />
        <Field
          label="Design temperature"
          name="designTemperature"
          type="number"
          step="0.001"
          defaultValue={line?.designTemperature}
          required
        />
        <Field
          label="Operating temperature"
          name="operatingTemperature"
          type="number"
          step="0.001"
          defaultValue={line?.operatingTemperature}
          required
        />
      </div>
    </ActionForm>
  );
}
