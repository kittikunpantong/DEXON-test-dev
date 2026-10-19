import { createLine } from "@/app/actions";
import { LineForm } from "@/components/forms";
import { Hero } from "@/components/ui";

export default function NewLinePage() {
  return (
    <>
      <Hero kicker="New line" title="Add line" lede="Thickness and corrosion rate are calculated after save. Do not enter them by hand." size="md" />
      <section className="section mx-auto max-w-[1440px] px-6">
        <LineForm action={createLine} submitLabel="Save line" />
      </section>
    </>
  );
}
