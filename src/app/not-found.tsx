import Link from "next/link";

import { buttonPrimary } from "@/components/ui";

export default function NotFound() {
  return (
    <section className="section mx-auto grid max-w-3xl gap-6 px-6">
      <p className="text-[13px] font-bold tracking-[1.5px] text-[var(--muted)] uppercase">404</p>
      <h1 className="text-[32px] leading-[1.15] font-bold text-[var(--ink)]">Page not found</h1>
      <Link className={buttonPrimary} href="/">
        Back to the line register
      </Link>
    </section>
  );
}
