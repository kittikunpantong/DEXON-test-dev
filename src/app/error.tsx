"use client";

import { buttonPrimary } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="section mx-auto grid max-w-3xl gap-6 px-6">
      <h1 className="text-[32px] leading-[1.15] font-bold text-[var(--ink)]">Something went wrong</h1>
      <p className="font-light text-[var(--body)]">{error.message || "This action could not be completed"}</p>
      <button className={buttonPrimary} type="button" onClick={() => reset()}>
        Try again
      </button>
    </section>
  );
}
