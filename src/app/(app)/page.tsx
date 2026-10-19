import Link from "next/link";

import { AddLineButton, LineInfoButton } from "@/components/modal";
import { buttonCompact, buttonCompactPrimary } from "@/components/ui";
import type { LifeStatus } from "@/lib/calculations";
import { isDatabaseUnavailable } from "@/lib/db";
import { formatLife, formatRate } from "@/lib/format";
import { loadLineSummaries, type LineView } from "@/lib/line-data";
import { linePath } from "@/lib/paths";
import { pipingFacts } from "@/lib/piping-facts";

export const dynamic = "force-dynamic";

const FILTERS: Array<{ id: string; label: string }> = [
  { id: "all", label: "All" },
  { id: "finite", label: "Finite life" },
  { id: "unlimited", label: "Unlimited" },
  { id: "empty", label: "Not calculated" },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; life?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const life = FILTERS.some((item) => item.id === params.life) ? (params.life ?? "all") : "all";

  let lines: LineView[] = [];
  let databaseError = "";
  try {
    lines = await loadLineSummaries();
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    databaseError = "Could not sign in to MySQL, or the database server is not running";
  }

  const filtered = lines.filter((line) => {
    if (life !== "all" && line.computed.lifeStatus !== (life as LifeStatus)) return false;
    if (!query) return true;
    const haystack = [
      line.record.lineNumber,
      line.record.location,
      line.record.fromLocation,
      line.record.toLocation,
      line.record.drawingNumber,
      line.record.service,
      line.record.material,
    ]
      .join(" ")
      .toLocaleLowerCase();
    return haystack.includes(query.toLocaleLowerCase());
  });

  const shortest = lines.find((line) => line.computed.lifeStatus === "finite");
  const fastest = lines.reduce<LineView | null>((best, line) => {
    if (!line.computed.corrosionRate) return best;
    if (!best?.computed.corrosionRate) return line;
    return Number(line.computed.corrosionRate) > Number(best.computed.corrosionRate) ? line : best;
  }, null);

  return (
    <>
      <section className="bg-[var(--surface-dark)] text-white">
        <div className="mx-auto grid max-w-[1440px] gap-5 px-6 py-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[12px] font-bold tracking-[1.2px] text-[var(--on-dark-soft)] uppercase">Pipe thickness inspection</p>
              <h1 className="mt-2 text-[32px] leading-none font-bold md:text-[40px]">Line register</h1>
              <p className="mt-2 text-sm font-light text-[var(--on-dark-soft)]">Sorted by shortest remaining life</p>
            </div>
            <AddLineButton className={buttonCompactPrimary} />
          </div>
          <div className="grid gap-px bg-[var(--surface-dark-elevated)] sm:grid-cols-3">
            <Kpi label="Lines" value={databaseError ? "—" : String(lines.length)} />
            <Kpi
              label="Shortest life (yr)"
              value={databaseError ? "—" : shortest ? formatLife(shortest.computed.lifeStatus, shortest.computed.remainingLife) : "Not calculated"}
            />
            <Kpi label="Highest rate (mm/yr)" value={databaseError ? "—" : formatRate(fastest?.computed.corrosionRate) || "Not calculated"} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-4 px-6 py-8">
        {databaseError ? (
          <DatabaseNotice message={databaseError} />
        ) : (
          <>
            <form className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between" action="/">
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((item) => {
                  const active = item.id === life;
                  return (
                    <Link key={item.id} href={filterHref(query, item.id)} className={active ? "chip chip-active" : "chip"}>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <input
                  className="h-11 w-full border border-[var(--hairline)] bg-white px-3 text-sm font-light text-[var(--ink)] outline-none focus:border-[var(--ink)] lg:w-72"
                  name="q"
                  defaultValue={query}
                  placeholder="Search line, location, service, material"
                  aria-label="Search lines"
                />
                {life !== "all" ? <input type="hidden" name="life" value={life} /> : null}
                <button className={buttonCompactPrimary} type="submit">
                  Search
                </button>
              </div>
            </form>

            <p className="text-sm text-[var(--muted)]">
              Showing {filtered.length} of {lines.length} lines
            </p>

            <div className="overflow-x-auto border border-[var(--hairline)]">
              <table className="data-table compact">
                <thead>
                  <tr>
                    <th>Line number</th>
                    <th>Location</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Size (in)</th>
                    <th>Service</th>
                    <th>Material</th>
                    <th className="calc">Rate</th>
                    <th className="calc">Life</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((line) => {
                    const lifeText = formatLife(line.computed.lifeStatus, line.computed.remainingLife);
                    const critical = line.computed.lifeStatus === "finite" && Number(line.computed.remainingLife) === 0;
                    return (
                      <tr key={line.record.lineNumber}>
                        <td className="font-bold text-[var(--ink)]">{line.record.lineNumber}</td>
                        <td>{line.record.location}</td>
                        <td>{line.record.fromLocation}</td>
                        <td>{line.record.toLocation}</td>
                        <td>{line.record.pipeSize}</td>
                        <td>{line.record.service}</td>
                        <td>{line.record.material}</td>
                        <td className="calc">{formatRate(line.computed.corrosionRate) || "—"}</td>
                        <td className={`calc ${critical ? "font-bold text-[var(--error)]" : ""}`}>{lifeText || "—"}</td>
                        <td>
                          <div className="flex justify-end gap-2">
                            <LineInfoButton
                              record={line.record}
                              facts={pipingFacts(line.record, line.computed)}
                              className={buttonCompact}
                            />
                            <Link href={linePath(line.record.lineNumber)} className={buttonCompactPrimary}>
                              Inspections
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-[var(--muted)]">
                        No lines match these filters
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        )}
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

function filterHref(query: string, life: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (life !== "all") params.set("life", life);
  const value = params.toString();
  return value ? `/?${value}` : "/";
}

function DatabaseNotice({ message }: { message: string }) {
  return (
    <div className="grid max-w-3xl gap-4 border border-[var(--hairline)] bg-[var(--surface-card)] p-6">
      <h2 className="text-2xl font-bold text-[var(--ink)]">MySQL is not connected</h2>
      <p className="font-light">{message}</p>
      <ol className="list-decimal space-y-2 pl-5 font-light">
        <li>Start MySQL on localhost port 3307 and create a database named dexon</li>
        <li>Grant the .env user access from this machine. If MySQL runs in Docker, the host the server sees is often 192.168.65.1 rather than localhost</li>
        <li>Run npm run db:setup to create the tables and sample data</li>
      </ol>
    </div>
  );
}
