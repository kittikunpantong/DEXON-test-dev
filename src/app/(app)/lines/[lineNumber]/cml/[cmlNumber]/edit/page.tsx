import { notFound } from "next/navigation";

import { updateCml } from "@/app/actions";
import { CmlForm } from "@/components/forms";
import { Hero } from "@/components/ui";
import { loadLineView } from "@/lib/line-data";

export const dynamic = "force-dynamic";

export default async function EditCmlPage({
  params,
}: {
  params: Promise<{ lineNumber: string; cmlNumber: string }>;
}) {
  const { lineNumber, cmlNumber } = await params;
  const decoded = decodeURIComponent(lineNumber);
  const number = Number(cmlNumber);
  if (!Number.isInteger(number)) notFound();
  const view = await loadLineView(decoded);
  const cml = view?.computed.cmls.find((item) => item.cmlNumber === number);
  if (!view || !cml) notFound();

  return (
    <>
      <Hero
        kicker={view.record.lineNumber}
        title={`Edit CML ${cml.cmlNumber}`}
        lede="CML thicknesses are calculated from the parent line. Only the number and description can be edited."
        size="md"
      />
      <section className="section mx-auto max-w-[1440px] px-6">
        <CmlForm
          action={updateCml.bind(null, decoded, cml.cmlNumber)}
          defaults={{ cmlNumber: cml.cmlNumber, cmlDescription: cml.cmlDescription }}
          submitLabel="Save CML"
        />
      </section>
    </>
  );
}
