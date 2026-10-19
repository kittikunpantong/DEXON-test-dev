export function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required = false,
  hint,
  min,
  max,
  step,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: "text" | "number" | "date" | "search";
  required?: boolean;
  hint?: string;
  min?: number | string;
  max?: number | string;
  step?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        min={min}
        max={max}
        step={step}
        inputMode={type === "number" ? "decimal" : undefined}
      />
      {hint ? <small className="hint">{hint}</small> : null}
    </label>
  );
}
