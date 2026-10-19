import Decimal from "decimal.js";
import { ActionForm } from "@/components/action-form";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Field } from "@/components/fields";
import {
  formatDate,
  formatDiameter,
  formatLife,
  formatRate,
  formatThickness,
  type CmlView,
  type LifeValue,
  type LineView,
  type TestPointView,
} from "@/lib/present";
import {
  createCmlAction,
  createTestPointAction,
  createThicknessAction,
  deleteCmlAction,
  deleteLineAction,
  deleteTestPointAction,
  deleteThicknessAction,
  updateCmlAction,
  updateTestPointAction,
  updateThicknessAction,
} from "@/server/actions";

function tone(life: LifeValue, designLife?: number): string {
  if (life.status === "unlimited") return "is-success";
  if (life.status !== "finite" || life.years == null) return "is-muted";
  const years = new Decimal(life.years);
  if (years.lte(0)) return "is-error";
  if (designLife != null && years.lt(designLife)) return "is-warning";
  return "is-success";
}

function LifeCell({ life, designLife }: { life: LifeValue; designLife?: number }) {
  const text = formatLife(life);
  return <span className={tone(life, designLife)}>{text}</span>;
}

function href(lineNumber: string, cmlNumber?: number, tpNumber?: number): string {
  const params = new URLSearchParams();
  if (cmlNumber != null) params.set("cml", String(cmlNumber));
  if (tpNumber != null) params.set("tp", String(tpNumber));
  const query = params.toString();
  const path = `/lines/${encodeURIComponent(lineNumber)}`;
  return query ? `${path}?${query}` : path;
}

export function InspectionDetail({
  line,
  cml,
  point,
}: {
  line: LineView;
  cml: CmlView | null;
  point: TestPointView | null;
}) {
  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="hero-row">
            <div>
              <p className="lede" style={{ marginTop: 0, letterSpacing: "1.5px", fontWeight: 700, fontSize: 13 }}>
                Line details
              </p>
              <h1>{line.lineNumber}</h1>
              <p className="lede">
                {line.fromLocation} → {line.toLocation} · {line.service} · {line.material}
              </p>
            </div>
            <div className="actions">
              <a className="btn btn-secondary-dark" href={`/lines/${encodeURIComponent(line.lineNumber)}/edit`}>
                Edit line
              </a>
              <a className="btn btn-secondary-dark" href="/">
                Back to the list
              </a>
            </div>
          </div>
          <div className="spec-row">
            <div className="spec-cell">
              <strong className={tone(line.life, line.designLife)}>{formatLife(line.life) || "—"}</strong>
              <span>Line remaining life (yr)</span>
            </div>
            <div className="spec-cell">
              <strong>{formatRate(line.corrosionRate) || "—"}</strong>
              <span>Line rate (mm/yr)</span>
            </div>
            <div className="spec-cell">
              <strong>{line.retirementDate ? formatDate(line.retirementDate) : "—"}</strong>
              <span>Required thickness date</span>
            </div>
            <div className="spec-cell">
              <strong>{formatThickness(line.geometry.requiredThickness) || "—"}</strong>
              <span>Required thickness (mm)</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Line data</h2>
              <p className="muted" style={{ marginTop: 8 }}>
                Corrosion allowance is stored, and is not added into the required thickness formula
              </p>
            </div>
            <form action={deleteLineAction}>
              <input type="hidden" name="lineNumber" value={line.lineNumber} />
              <ConfirmSubmit message="Delete this line, including every CML, test point, and thickness history">
                Delete line
              </ConfirmSubmit>
            </form>
          </div>
          <div className="grid-facts">
            <Fact label="Location" value={line.location} />
            <Fact label="From" value={line.fromLocation} />
            <Fact label="To" value={line.toLocation} />
            <Fact label="Drawing" value={line.drawingNumber} />
            <Fact label="Service" value={line.service} />
            <Fact label="Material" value={line.material} />
            <Fact label="In-service date" value={formatDate(line.inserviceDate)} />
            <Fact label="Pipe size (in)" value={formatDiameter(line.pipeSize)} />
            <Fact label="Original thickness (mm)" value={formatThickness(line.originalThickness)} />
            <Fact label="Stress" value={formatThickness(line.stress)} />
            <Fact label="Joint efficiency" value={formatThickness(line.jointEfficiency)} />
            <Fact label="Corrosion allowance (mm)" value={formatThickness(line.ca)} />
            <Fact label="Design life (yr)" value={String(line.designLife)} />
            <Fact label="Design pressure" value={formatThickness(line.designPressure)} />
            <Fact label="Operating pressure" value={formatThickness(line.operatingPressure)} />
            <Fact label="Design temperature" value={formatThickness(line.designTemperature)} />
            <Fact label="Operating temperature" value={formatThickness(line.operatingTemperature)} />
            <Fact label="Outside diameter (mm)" value={formatDiameter(line.geometry.actualOutsideDiameter)} />
            <Fact label="Design thickness (mm)" value={formatThickness(line.geometry.designThickness)} />
            <Fact label="Structural thickness (mm)" value={formatThickness(line.geometry.structuralThickness)} />
          </div>

          <div className="block">
            <div className="block-head">
              <div>
                <h3>CML</h3>
                <p className="muted">These thicknesses are calculated from the parent line. Every CML on the same line shares the same numbers.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>CML</th>
                    <th>Description</th>
                    <th className="num">OD (mm)</th>
                    <th className="num">Design</th>
                    <th className="num">Structural</th>
                    <th className="num">Required</th>
                    <th className="num">Rate (mm/yr)</th>
                    <th className="num">Remaining life (yr)</th>
                  </tr>
                </thead>
                <tbody>
                  {line.cmls.length === 0 ? (
                    <tr>
                      <td colSpan={8}>No CMLs yet</td>
                    </tr>
                  ) : (
                    line.cmls.map((item) => (
                      <tr key={item.cmlNumber} className={cml?.cmlNumber === item.cmlNumber ? "is-selected" : ""}>
                        <td>
                          <a className="row-link" href={href(line.lineNumber, item.cmlNumber)}>
                            {item.cmlNumber}
                          </a>
                          {item.governsLife ? <span className="badge">Shortest life</span> : null}
                        </td>
                        <td>{item.cmlDescription}</td>
                        <td className="num">{formatDiameter(item.geometry.actualOutsideDiameter)}</td>
                        <td className="num">{formatThickness(item.geometry.designThickness)}</td>
                        <td className="num">{formatThickness(item.geometry.structuralThickness)}</td>
                        <td className="num">{formatThickness(item.geometry.requiredThickness)}</td>
                        <td className="num">{formatRate(item.corrosionRate)}</td>
                        <td className="num">
                          <LifeCell life={item.life} designLife={line.designLife} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <details className="panel">
              <summary>Add CML</summary>
              <ActionForm action={createCmlAction} submitLabel="Save CML" className="inline-form">
                <input type="hidden" name="lineNumber" value={line.lineNumber} />
                <Field label="CML number" name="cmlNumber" type="number" min="1" step="1" required />
                <Field label="Description" name="cmlDescription" required hint="For example Pipe, Elbow i, Tee i" />
              </ActionForm>
            </details>
          </div>

          {cml ? (
            <div className="block">
              <div className="block-head">
                <div>
                  <h3>Test points for CML {cml.cmlNumber}</h3>
                  <p className="muted">{cml.cmlDescription}</p>
                </div>
                <form action={deleteCmlAction}>
                  <input type="hidden" name="lineNumber" value={line.lineNumber} />
                  <input type="hidden" name="cmlNumber" value={cml.cmlNumber} />
                  <ConfirmSubmit message="Delete this CML, including its test points and thickness history">
                    Delete CML
                  </ConfirmSubmit>
                </form>
              </div>
              <details className="editor">
                <summary>Edit CML</summary>
                <ActionForm action={updateCmlAction} submitLabel="Save CML" className="inline-form">
                  <input type="hidden" name="lineNumber" value={line.lineNumber} />
                  <input type="hidden" name="currentCmlNumber" value={cml.cmlNumber} />
                  <Field label="CML number" name="cmlNumber" type="number" min="1" step="1" defaultValue={cml.cmlNumber} required />
                  <Field label="Description" name="cmlDescription" defaultValue={cml.cmlDescription} required />
                </ActionForm>
              </details>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Test point</th>
                      <th>Angle</th>
                      <th>Note</th>
                      <th className="num">Short-term</th>
                      <th className="num">Long-term</th>
                      <th className="num">Since in-service</th>
                      <th className="num">Governing rate</th>
                      <th className="num">Remaining life</th>
                      <th>Required date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cml.testPoints.length === 0 ? (
                      <tr>
                        <td colSpan={9}>No test points yet</td>
                      </tr>
                    ) : (
                      cml.testPoints.map((item) => (
                        <tr key={item.tpNumber} className={point?.tpNumber === item.tpNumber ? "is-selected" : ""}>
                          <td>
                            <a className="row-link" href={href(line.lineNumber, cml.cmlNumber, item.tpNumber)}>
                              {item.tpNumber}
                            </a>
                            {item.governsLife ? <span className="badge">Shortest life</span> : null}
                          </td>
                          <td>{item.tpDescription}°</td>
                          <td>{item.note}</td>
                          <td className="num">{formatRate(item.shortTermRate)}</td>
                          <td className="num">{formatRate(item.longTermRate)}</td>
                          <td className="num">{formatRate(item.inserviceRate)}</td>
                          <td className="num">{formatRate(item.corrosionRate)}</td>
                          <td className="num">
                            <LifeCell life={item.life} designLife={line.designLife} />
                          </td>
                          <td>{formatDate(item.retirementDate)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <details className="panel">
                <summary>Add test point</summary>
                <ActionForm action={createTestPointAction} submitLabel="Save test point" className="inline-form">
                  <input type="hidden" name="lineNumber" value={line.lineNumber} />
                  <input type="hidden" name="cmlNumber" value={cml.cmlNumber} />
                  <Field label="Test point number" name="tpNumber" type="number" min="1" step="1" required />
                  <Field label="Angle (degrees)" name="tpDescription" type="number" min="0" max="359" step="1" required hint="For example 0, 90, 180, 270" />
                  <Field label="Note" name="note" />
                </ActionForm>
              </details>
            </div>
          ) : null}

          {cml && point ? (
            <div className="block">
              <div className="block-head">
                <div>
                  <h3>
                    Thickness for test point {point.tpNumber} · {point.tpDescription}°
                  </h3>
                  <p className="muted">The first row for this angle has no interval rate, because there is no earlier reading</p>
                </div>
                <form action={deleteTestPointAction}>
                  <input type="hidden" name="lineNumber" value={line.lineNumber} />
                  <input type="hidden" name="cmlNumber" value={cml.cmlNumber} />
                  <input type="hidden" name="tpNumber" value={point.tpNumber} />
                  <ConfirmSubmit message="Delete this test point, including its thickness history">Delete test point</ConfirmSubmit>
                </form>
              </div>
              <details className="editor">
                <summary>Edit test point</summary>
                <ActionForm action={updateTestPointAction} submitLabel="Save test point" className="inline-form">
                  <input type="hidden" name="lineNumber" value={line.lineNumber} />
                  <input type="hidden" name="cmlNumber" value={cml.cmlNumber} />
                  <input type="hidden" name="currentTpNumber" value={point.tpNumber} />
                  <Field label="Test point number" name="tpNumber" type="number" min="1" step="1" defaultValue={point.tpNumber} required />
                  <Field label="Angle (degrees)" name="tpDescription" type="number" min="0" max="359" step="1" defaultValue={point.tpDescription} required />
                  <Field label="Note" name="note" defaultValue={point.note} />
                </ActionForm>
              </details>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Inspection date</th>
                      <th className="num">Actual thickness (mm)</th>
                      <th className="num">Interval rate (mm/yr)</th>
                      <th>Edit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {point.readings.length === 0 ? (
                      <tr>
                        <td colSpan={4}>No thickness history yet</td>
                      </tr>
                    ) : (
                      point.readings.map((reading) => (
                        <tr key={reading.inspectionDate}>
                          <td>{formatDate(reading.inspectionDate)}</td>
                          <td className="num">{formatThickness(reading.actualThickness)}</td>
                          <td className="num">{formatRate(reading.intervalCorrosionRate)}</td>
                          <td>
                            <details>
                              <summary className="btn btn-text">Edit</summary>
                              <ActionForm action={updateThicknessAction} submitLabel="Save thickness" className="inline-form">
                                <input type="hidden" name="lineNumber" value={line.lineNumber} />
                                <input type="hidden" name="cmlNumber" value={cml.cmlNumber} />
                                <input type="hidden" name="tpNumber" value={point.tpNumber} />
                                <input type="hidden" name="currentInspectionDate" value={reading.inspectionDate} />
                                <Field label="Inspection date" name="inspectionDate" type="date" defaultValue={reading.inspectionDate} required />
                                <Field label="Actual thickness (mm)" name="actualThickness" type="number" min="0" step="0.001" defaultValue={reading.actualThickness} required />
                              </ActionForm>
                              <form action={deleteThicknessAction} style={{ marginTop: 12 }}>
                                <input type="hidden" name="lineNumber" value={line.lineNumber} />
                                <input type="hidden" name="cmlNumber" value={cml.cmlNumber} />
                                <input type="hidden" name="tpNumber" value={point.tpNumber} />
                                <input type="hidden" name="inspectionDate" value={reading.inspectionDate} />
                                <ConfirmSubmit message={`Delete the thickness reading on ${formatDate(reading.inspectionDate)}`}>
                                  Delete this reading
                                </ConfirmSubmit>
                              </form>
                            </details>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <details className="panel" open={point.readings.length === 0}>
                <summary>Add thickness</summary>
                <ActionForm action={createThicknessAction} submitLabel="Save thickness" className="inline-form">
                  <input type="hidden" name="lineNumber" value={line.lineNumber} />
                  <input type="hidden" name="cmlNumber" value={cml.cmlNumber} />
                  <input type="hidden" name="tpNumber" value={point.tpNumber} />
                  <Field label="Inspection date" name="inspectionDate" type="date" required />
                  <Field label="Actual thickness (mm)" name="actualThickness" type="number" min="0" step="0.001" required />
                </ActionForm>
              </details>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="fact">
      <b>{value || "—"}</b>
      <span>{label}</span>
    </div>
  );
}
