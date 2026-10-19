import { notFound } from "next/navigation";

import { InspectionTree } from "@/components/inspection-tree";
import { LineInfoButton } from "@/components/modal";
import { Hero, buttonOnDarkCompact } from "@/components/ui";
import { isDatabaseUnavailable } from "@/lib/db";
import { formatLife, formatRate, formatThaiDate } from "@/lib/format";
import { loadLineView } from "@/lib/line-data";
import { pipingFacts } from "@/lib/piping-facts";

export const dynamic = "force-dynamic";

export default async function LineDetailPage({ params }: { params: Promise<{ lineNumber: string }> }) {
  const { lineNumber } = await params;
  const decoded = decodeURIComponent(lineNumber);
  let view: Awaited<ReturnType<typeof loadLineView>> = null;
  try {
    view = await loadLineView(decoded);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return (
        <Hero
          kicker="Not connected"
          title="Database is not responding"
          lede="Check MySQL on localhost port 3307, then run npm run db:setup"
          size="md"
        />
      );
    }
    throw error;
  }
  if (!view) notFound();

  const { record, computed } = view;
  const lifeText = formatLife(computed.lifeStatus, computed.remainingLife);
  const retirement =
    computed.lifeStatus === "finite" && Number(computed.remainingLife) === 0
      ? "Required thickness reached"
      : computed.retirementDate
        ? formatThaiDate(computed.retirementDate)
        : computed.lifeStatus === "unlimited"
          ? "Unlimited"
          : "Not calculated";

  return (
    <>
      <section className="bg-[var(--surface-dark)] text-white">
        <div className="mx-auto grid max-w-[1440px] gap-5 px-6 py-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[12px] font-bold tracking-[1.2px] text-[var(--on-dark-soft)] uppercase">Line</p>
              <h1 className="mt-2 text-[32px] leading-none font-bold md:text-[40px]">{record.lineNumber}</h1>
              <p className="mt-2 text-sm font-light text-[var(--on-dark-soft)]">
                {record.fromLocation} → {record.toLocation} · {record.service}
              </p>
            </div>
            <LineInfoButton
              record={record}
              facts={pipingFacts(record, computed)}
              className={buttonOnDarkCompact}
              label="Line data"
            />
          </div>
          <div className="grid gap-px bg-[var(--surface-dark-elevated)] sm:grid-cols-3">
            <Kpi label="Remaining life (yr)" value={lifeText || "Not calculated"} />
            <Kpi label="Corrosion rate (mm/yr)" value={formatRate(computed.corrosionRate) || "Not calculated"} />
            <Kpi label="Required thickness date" value={retirement} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] px-6 py-8">
        <InspectionTree key={record.lineNumber} lineNumber={record.lineNumber} cmls={computed.cmls} />
      </section>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--surface-dark)] px-4 py-3">
      <div className="text-xl leading-none font-bold tabular-nums">{value}</div>
      <div className="mt-2 text-[11px] font-bold tracking-[0.8px] text-[var(--on-dark-soft)] uppercase">{label}</div>
    </div>
  );
}

