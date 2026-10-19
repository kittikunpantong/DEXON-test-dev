import { notFound } from "next/navigation";

import { updateTestPoint } from "@/app/actions";
import { TestPointForm } from "@/components/forms";
import { Hero } from "@/components/ui";
import { loadLineView } from "@/lib/line-data";

export const dynamic = "force-dynamic";

export default async function EditTestPointPage({
  params,
}: {
  params: Promise<{ lineNumber: string; cmlNumber: string; tpNumber: string }>;
}) {
  const { lineNumber, cmlNumber, tpNumber } = await params;
  const decoded = decodeURIComponent(lineNumber);
  const cmlNo = Number(cmlNumber);
  const tpNo = Number(tpNumber);
  if (!Number.isInteger(cmlNo) || !Number.isInteger(tpNo)) notFound();
  const view = await loadLineView(decoded);
  const point = view?.computed.cmls.find((item) => item.cmlNumber === cmlNo)?.testPoints.find((item) => item.tpNumber === tpNo);
  if (!view || !point) notFound();

  return (
    <>
      <Hero kicker={`${view.record.lineNumber} · CML ${cmlNo}`} title={`Edit ${point.tpDescription}° angle`} size="md" />
      <section className="section mx-auto max-w-[1440px] px-6">
        <TestPointForm
          action={updateTestPoint.bind(null, decoded, cmlNo, point.tpNumber)}
          defaults={{ tpNumber: point.tpNumber, tpDescription: point.tpDescription, note: point.note }}
          submitLabel="Save test point"
        />
      </section>
    </>
  );
}
