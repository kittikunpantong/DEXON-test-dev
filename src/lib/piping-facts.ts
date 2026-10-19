import { formatThaiDate, formatThickness } from "@/lib/format";

type PipingRecord = {
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

type PipingGeometry = {
  actualOutsideDiameter: string | null;
  designThickness: string | null;
  structuralThickness: string | null;
  requiredThickness: string | null;
};

export function pipingFacts(record: PipingRecord, geometry: PipingGeometry): Array<{ label: string; value: string }> {
  const show = (value: string | null | undefined) => value || "—";
  return [
    { label: "Location", value: show(record.location) },
    { label: "From", value: show(record.fromLocation) },
    { label: "To", value: show(record.toLocation) },
    { label: "Drawing", value: show(record.drawingNumber) },
    { label: "Service", value: show(record.service) },
    { label: "Material", value: show(record.material) },
    { label: "In-service date", value: show(formatThaiDate(record.inserviceDate)) },
    { label: "Pipe size (in)", value: show(record.pipeSize) },
    { label: "Original thickness (mm)", value: show(formatThickness(record.originalThickness)) },
    { label: "Stress", value: show(record.stress) },
    { label: "Joint efficiency", value: show(record.jointEfficiency) },
    { label: "Corrosion allowance (mm)", value: show(formatThickness(record.ca)) },
    { label: "Design life (yr)", value: String(record.designLife) },
    { label: "Design pressure", value: show(record.designPressure) },
    { label: "Operating pressure", value: show(record.operatingPressure) },
    { label: "Design temperature", value: show(record.designTemperature) },
    { label: "Operating temperature", value: show(record.operatingTemperature) },
    { label: "Outside diameter (mm)", value: show(formatThickness(geometry.actualOutsideDiameter)) },
    { label: "Design thickness (mm)", value: show(formatThickness(geometry.designThickness)) },
    { label: "Structural thickness (mm)", value: show(formatThickness(geometry.structuralThickness)) },
    { label: "Required thickness (mm)", value: show(formatThickness(geometry.requiredThickness)) },
  ];
}
