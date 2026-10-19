import { notFound } from "next/navigation";

import { updateThickness } from "@/app/actions";
import { ThicknessForm } from "@/components/forms";
import { Hero } from "@/components/ui";
import { formatPlainDecimal } from "@/lib/format";
import { loadLineView } from "@/lib/line-data";

export const dynamic = "force-dynamic";

export default async function EditThicknessPage({
  params,
}: {
  params: Promise<{ lineNumber: string; cmlNumber: string; tpNumber: string; date: string }>;
}) {
  const { lineNumber, cmlNumber, tpNumber, date } = await params;
  const decoded = decodeURIComponent(lineNumber);
  const cmlNo = Number(cmlNumber);
  const tpNo = Number(tpNumber);
  if (!Number.isInteger(cmlNo) || !Number.isInteger(tpNo)) notFound();
  const view = await loadLineView(decoded);
  const point = view?.computed.cmls.find((item) => item.cmlNumber === cmlNo)?.testPoints.find((item) => item.tpNumber === tpNo);
  const reading = point?.readings.find((item) => item.inspectionDate === date);
  if (!view || !point || !reading) notFound();

  return (
    <>
      <Hero
        kicker={`${view.record.lineNumber} · CML ${cmlNo} · ${point.tpDescription}°`}
        title="Edit thickness"
        size="md"
      />
      <section className="section mx-auto max-w-[1440px] px-6">
        <ThicknessForm
          action={updateThickness.bind(null, decoded, cmlNo, tpNo, reading.inspectionDate)}
          defaults={{ inspectionDate: reading.inspectionDate, actualThickness: formatPlainDecimal(reading.actualThickness) }}
          submitLabel="Save thickness"
        />
      </section>
    </>
  );
}
