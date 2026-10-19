import { notFound } from "next/navigation";

import { updateLine } from "@/app/actions";
import { LineForm } from "@/components/forms";
import { Hero } from "@/components/ui";
import { loadLineView } from "@/lib/line-data";

export const dynamic = "force-dynamic";

export default async function EditLinePage({ params }: { params: Promise<{ lineNumber: string }> }) {
  const { lineNumber } = await params;
  const view = await loadLineView(decodeURIComponent(lineNumber));
  if (!view) notFound();

  return (
    <>
      <Hero kicker="Edit line" title={view.record.lineNumber} lede="Changing the line number also updates its CMLs, test points, and thickness history" size="md" />
      <section className="section mx-auto max-w-[1440px] px-6">
        <LineForm
          action={updateLine.bind(null, view.record.lineNumber)}
          defaults={view.record}
          submitLabel="Save changes"
        />
      </section>
    </>
  );
}
