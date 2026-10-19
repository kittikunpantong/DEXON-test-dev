"use client";

import { useState, type ReactNode } from "react";

import {
  createCml,
  createTestPoint,
  createThickness,
  deleteCml,
  deleteTestPoint,
  deleteThickness,
  updateCml,
  updateTestPoint,
  updateThickness,
} from "@/app/actions";
import { CmlForm, TestPointForm, ThicknessForm } from "@/components/forms";
import { DeleteButton, FormModal } from "@/components/modal";
import { buttonCompact, buttonCompactDanger, buttonCompactPrimary, decisionLabel } from "@/components/ui";
import type { ComputedCml, ComputedTestPoint, LifeStatus } from "@/lib/calculations";
import { formatLife, formatPlainDecimal, formatRate, formatThaiDate, formatThickness } from "@/lib/format";

function LifeValue({ status, years }: { status: LifeStatus; years: string | null }) {
  const text = formatLife(status, years);
  if (!text) return <span className="text-[var(--muted)]">—</span>;
  const critical = status === "finite" && Number(years) === 0;
  return <span className={critical ? "font-bold text-[var(--error)]" : ""}>{text}</span>;
}

function showDecisionBadges(items: Array<{ governsRate: boolean; governsLife: boolean }>) {
  const labels = items
    .map((item) => decisionLabel(item.governsRate, item.governsLife))
    .filter((label): label is string => Boolean(label));
  return new Set(labels).size > 1 || (labels.length > 0 && labels.length < items.length);
}

function Panel({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--ink)]">{title}</h2>
          <p className="mt-1 text-sm font-light text-[var(--muted)]">{hint}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ReadingTable({
  lineNumber,
  cmlNumber,
  point,
}: {
  lineNumber: string;
  cmlNumber: number;
  point: ComputedTestPoint;
}) {
  return (
    <div className="overflow-x-auto border border-[var(--hairline)]">
      <table className="data-table compact">
        <thead>
          <tr>
            <th>Inspection date</th>
            <th>Actual thickness (mm)</th>
            <th className="calc">Interval rate</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {point.readings.map((reading) => (
            <tr key={reading.inspectionDate}>
              <td>{formatThaiDate(reading.inspectionDate)}</td>
              <td>{formatThickness(reading.actualThickness)}</td>
              <td className="calc">{formatRate(reading.intervalCorrosionRate) || "—"}</td>
              <td>
                <div className="flex justify-end gap-2">
                  <FormModal
                    label="Edit"
                    className={buttonCompact}
                    kicker={`${point.tpDescription}°`}
                    title="Edit thickness"
                    description="The first row for this angle has no interval rate, because there is no earlier reading"
                  >
                    <ThicknessForm
                      action={updateThickness.bind(null, lineNumber, cmlNumber, point.tpNumber, reading.inspectionDate)}
                      defaults={{
                        inspectionDate: reading.inspectionDate,
                        actualThickness: formatPlainDecimal(reading.actualThickness),
                      }}
                      submitLabel="Save thickness"
                    />
                  </FormModal>
                  <DeleteButton
                    action={deleteThickness.bind(null, lineNumber, cmlNumber, point.tpNumber, reading.inspectionDate)}
                    label="Delete"
                    className={buttonCompactDanger}
                    title={`Delete reading on ${formatThaiDate(reading.inspectionDate)}`}
                    message="This thickness reading will be removed, and the next interval rate will be recalculated"
                  />
                </div>
              </td>
            </tr>
          ))}
          {point.readings.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-[var(--muted)]">
                No thickness history yet
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export function InspectionTree({ lineNumber, cmls }: { lineNumber: string; cmls: ComputedCml[] }) {
  const [cmlId, setCmlId] = useState<number | null>(cmls[0]?.cmlNumber ?? null);
  const [tpId, setTpId] = useState<number | null>(cmls[0]?.testPoints[0]?.tpNumber ?? null);
  const cml = cmls.find((item) => item.cmlNumber === cmlId) ?? null;
  const point = cml?.testPoints.find((item) => item.tpNumber === tpId) ?? null;
  const showCmlBadge = showDecisionBadges(cmls);
  const showPointBadge = cml ? showDecisionBadges(cml.testPoints) : false;

  function selectCml(number: number) {
    setCmlId(number);
    const next = cmls.find((item) => item.cmlNumber === number);
    setTpId(next?.testPoints[0]?.tpNumber ?? null);
  }

  return (
    <div className="grid gap-8">
      <Panel
        title="CMLs"
        hint="Open a CML to see its test points. Design thicknesses are shared by every CML on this line"
        action={
          <FormModal
            label="Add CML"
            className={buttonCompactPrimary}
            kicker={lineNumber}
            title="Add CML"
            description="CML numbers restart on this line. Thickness values are calculated from the parent line"
          >
            <CmlForm action={createCml.bind(null, lineNumber)} submitLabel="Save CML" />
          </FormModal>
        }
      >
        <div className="overflow-x-auto border border-[var(--hairline)]">
          <table className="data-table compact">
            <thead>
              <tr>
                <th>CML</th>
                <th>Description</th>
                <th className="calc">Outside diameter</th>
                <th className="calc">Design thickness</th>
                <th className="calc">Structural thickness</th>
                <th className="calc">Required thickness</th>
                <th className="calc">Rate</th>
                <th className="calc">Life</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cmls.map((item) => {
                const badge = decisionLabel(item.governsRate, item.governsLife);
                const picked = item.cmlNumber === cml?.cmlNumber;
                return (
                  <tr key={item.cmlNumber} className={picked ? "picked" : undefined}>
                    <td className="font-bold text-[var(--ink)]">
                      {item.cmlNumber}
                      {showCmlBadge && badge ? (
                        <span className="ml-2 text-[11px] font-bold tracking-[0.5px] text-[var(--primary)] uppercase">{badge}</span>
                      ) : null}
                    </td>
                    <td>{item.cmlDescription}</td>
                    <td className="calc">{formatThickness(item.actualOutsideDiameter) || "—"}</td>
                    <td className="calc">{formatThickness(item.designThickness) || "—"}</td>
                    <td className="calc">{formatThickness(item.structuralThickness) || "—"}</td>
                    <td className="calc">{formatThickness(item.requiredThickness) || "—"}</td>
                    <td className="calc">{formatRate(item.corrosionRate) || "—"}</td>
                    <td className="calc">
                      <LifeValue status={item.lifeStatus} years={item.remainingLife} />
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button type="button" className={picked ? buttonCompactPrimary : buttonCompact} onClick={() => selectCml(item.cmlNumber)}>
                          View points
                        </button>
                        <FormModal
                          label="Edit"
                          className={buttonCompact}
                          kicker={`CML ${item.cmlNumber}`}
                          title="Edit CML"
                          description="Only the number and description can be edited. Calculated thicknesses change when the parent line changes"
                        >
                          <CmlForm
                            action={updateCml.bind(null, lineNumber, item.cmlNumber)}
                            defaults={{ cmlNumber: item.cmlNumber, cmlDescription: item.cmlDescription }}
                            submitLabel="Save CML"
                          />
                        </FormModal>
                        <DeleteButton
                          action={deleteCml.bind(null, lineNumber, item.cmlNumber)}
                          label="Delete"
                          className={buttonCompactDanger}
                          title={`Delete CML ${item.cmlNumber}`}
                          message="Test points and thickness history for this CML will also be deleted. This cannot be undone."
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {cmls.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-[var(--muted)]">
                    No CMLs on this line yet
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Test points"
        hint={cml ? `CML ${cml.cmlNumber} ${cml.cmlDescription}` : "Select a CML first"}
        action={
          cml ? (
            <FormModal
              label="Add test point"
              className={buttonCompactPrimary}
              kicker={`CML ${cml.cmlNumber}`}
              title="Add test point"
              description="Test point numbers restart on this CML. Common angles are 0, 90, 180, and 270 degrees"
            >
              <TestPointForm action={createTestPoint.bind(null, lineNumber, cml.cmlNumber)} submitLabel="Save test point" />
            </FormModal>
          ) : null
        }
      >
        <div className="overflow-x-auto border border-[var(--hairline)]">
          <table className="data-table compact">
            <thead>
              <tr>
                <th>Point</th>
                <th>Degrees</th>
                <th>Note</th>
                <th className="calc">Short-term</th>
                <th className="calc">Long-term</th>
                <th className="calc">Since in-service</th>
                <th className="calc">Governing rate</th>
                <th className="calc">Life</th>
                <th className="calc">Required date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cml?.testPoints.map((item) => {
                const badge = decisionLabel(item.governsRate, item.governsLife);
                const picked = item.tpNumber === point?.tpNumber;
                return (
                  <tr key={item.tpNumber} className={picked ? "picked" : undefined}>
                    <td className="font-bold text-[var(--ink)]">
                      {item.tpNumber}
                      {showPointBadge && badge ? (
                        <span className="ml-2 text-[11px] font-bold tracking-[0.5px] text-[var(--primary)] uppercase">{badge}</span>
                      ) : null}
                    </td>
                    <td>{item.tpDescription}°</td>
                    <td>{item.note || "—"}</td>
                    <td className="calc">{formatRate(item.shortTermRate) || "—"}</td>
                    <td className="calc">{formatRate(item.longTermRate) || "—"}</td>
                    <td className="calc">{formatRate(item.inserviceRate) || "—"}</td>
                    <td className="calc">{formatRate(item.corrosionRate) || "—"}</td>
                    <td className="calc">
                      <LifeValue status={item.lifeStatus} years={item.remainingLife} />
                    </td>
                    <td className="calc">{item.retirementDate ? formatThaiDate(item.retirementDate) : "—"}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button type="button" className={picked ? buttonCompactPrimary : buttonCompact} onClick={() => setTpId(item.tpNumber)}>
                          View thickness
                        </button>
                        <FormModal
                          label="Edit"
                          className={buttonCompact}
                          kicker={`CML ${cml.cmlNumber}`}
                          title={`Edit ${item.tpDescription}° angle`}
                          description="Changing the test point number also updates the thickness history for this angle"
                        >
                          <TestPointForm
                            action={updateTestPoint.bind(null, lineNumber, cml.cmlNumber, item.tpNumber)}
                            defaults={{ tpNumber: item.tpNumber, tpDescription: item.tpDescription, note: item.note }}
                            submitLabel="Save test point"
                          />
                        </FormModal>
                        <DeleteButton
                          action={deleteTestPoint.bind(null, lineNumber, cml.cmlNumber, item.tpNumber)}
                          label="Delete"
                          className={buttonCompactDanger}
                          title={`Delete ${item.tpDescription}° angle`}
                          message="Thickness history for this angle will also be deleted. This cannot be undone."
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!cml || cml.testPoints.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-[var(--muted)]">
                    {cml ? "No test points on this CML yet" : "Select a CML to see test points"}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Thickness"
        hint={point && cml ? `${point.tpDescription}° on CML ${cml.cmlNumber}. One angle can have many inspection dates` : "Select a test point first"}
        action={
          point && cml ? (
            <FormModal
              label="Add thickness"
              className={buttonCompactPrimary}
              kicker={`${point.tpDescription}°`}
              title="Add thickness"
              description="One angle can have one reading per inspection date. The first row has no interval rate"
            >
              <ThicknessForm action={createThickness.bind(null, lineNumber, cml.cmlNumber, point.tpNumber)} submitLabel="Save thickness" />
            </FormModal>
          ) : null
        }
      >
        {point && cml ? (
          <ReadingTable lineNumber={lineNumber} cmlNumber={cml.cmlNumber} point={point} />
        ) : (
          <p className="border border-[var(--hairline)] px-4 py-8 text-sm text-[var(--muted)]">Select a test point to see thickness history</p>
        )}
      </Panel>
    </div>
  );
}
