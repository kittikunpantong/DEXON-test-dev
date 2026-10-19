import Link from "next/link";

export const buttonPrimary =
  "inline-flex h-12 items-center justify-center bg-[var(--primary)] px-8 text-[14px] font-bold tracking-[0.5px] text-white active:bg-[var(--primary-active)] disabled:bg-[var(--primary-disabled)] disabled:text-[var(--muted)]";

export const buttonSecondary =
  "inline-flex h-12 items-center justify-center border border-[var(--hairline-strong)] bg-white px-8 text-[14px] font-bold tracking-[0.5px] text-[var(--ink)] disabled:text-[var(--muted)]";

export const buttonOnDark =
  "inline-flex h-12 items-center justify-center border border-white bg-transparent px-8 text-[14px] font-bold tracking-[0.5px] text-white";

export const buttonOnDarkCompact =
  "inline-flex h-10 items-center justify-center border border-white bg-transparent px-4 text-[12px] font-bold tracking-[0.5px] text-white";

export const buttonDanger =
  "inline-flex h-12 items-center justify-center bg-[var(--error)] px-8 text-[14px] font-bold tracking-[0.5px] text-white disabled:bg-[var(--primary-disabled)] disabled:text-[var(--muted)]";

export const buttonCompact =
  "inline-flex h-11 items-center justify-center border border-[var(--hairline)] bg-white px-3 text-[12px] font-bold tracking-[0.5px] text-[var(--ink)]";

export const buttonCompactPrimary =
  "inline-flex h-11 items-center justify-center bg-[var(--primary)] px-4 text-[12px] font-bold tracking-[0.5px] text-white active:bg-[var(--primary-active)] disabled:bg-[var(--primary-disabled)] disabled:text-[var(--muted)]";

export const buttonCompactDanger =
  "inline-flex h-11 items-center justify-center border border-[var(--hairline)] bg-white px-3 text-[12px] font-bold tracking-[0.5px] text-[var(--error)]";

export const inputClass =
  "h-12 w-full border border-[var(--hairline)] bg-white px-4 text-[16px] font-light text-[var(--ink)] outline-none focus:border-[var(--ink)]";

export function SiteHeader({ extra, account }: { extra?: React.ReactNode; account?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 min-h-16 border-b border-[var(--hairline)] bg-white">
      <div className="mx-auto flex min-h-16 max-w-[1440px] items-center justify-between gap-4 px-6 py-2">
        <Link href="/" className="flex items-center gap-3 text-[var(--ink)]">
          <span className="grid h-8 w-8 place-items-center bg-[var(--primary)] text-sm font-bold text-white">DX</span>
          <span className="text-base font-bold tracking-[0.3px]">DEXON Technology</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 text-[14px] font-normal tracking-[0.3px] text-[var(--ink)]">
          <Link href="/">Lines</Link>
          {account}
          {extra}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-[var(--surface-soft)] text-[var(--body)]">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <FooterColumn title="Lines" text="One row per line, storing size, pressure, material, and in-service date" />
        <FooterColumn title="CMLs" text="CMLs restart on each line and store the thicknesses the system calculates" />
        <FooterColumn title="Test points" text="Test points restart on each CML. The angle is in degrees" />
        <FooterColumn title="Thickness" text="One reading per angle per inspection date. The first row has no interval rate" />
      </div>
      <div className="mx-auto max-w-[1440px] px-6 pb-10 text-sm font-light text-[var(--muted)]">
        DEXON pipe thickness inspection
      </div>
    </footer>
  );
}

function FooterColumn({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h2 className="text-[13px] font-bold tracking-[1.5px] text-[var(--ink)] uppercase">{title}</h2>
      <p className="mt-3 text-sm font-light leading-relaxed">{text}</p>
    </div>
  );
}

export function Hero({
  kicker,
  title,
  lede,
  size = "xl",
  children,
  footer,
}: {
  kicker: string;
  title: string;
  lede?: string;
  size?: "xl" | "md";
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="bg-[var(--surface-dark)] text-white">
      <div className="section mx-auto flex max-w-[1440px] flex-col gap-8 px-6">
        <p className="text-[13px] font-bold tracking-[1.5px] text-[var(--on-dark-soft)] uppercase">{kicker}</p>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <h1 className={size === "xl" ? "hero-title" : "text-[32px] leading-[1.15] font-bold"}>{title}</h1>
            {lede ? <p className="mt-4 max-w-3xl text-base font-light text-[var(--on-dark-soft)]">{lede}</p> : null}
          </div>
          {children}
        </div>
        {footer}
      </div>
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] font-bold tracking-[1.5px] text-[var(--ink)] uppercase">{label}</span>
      {children}
      {hint ? <span className="text-[12px] font-normal tracking-[0.5px] text-[var(--muted)]">{hint}</span> : null}
    </label>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="border border-[var(--error)] bg-white px-4 py-3 text-sm font-light text-[var(--error)]" role="alert">
      {message}
    </p>
  );
}

export function decisionLabel(governsRate: boolean, governsLife: boolean): string | null {
  if (governsRate && governsLife) return "Governing";
  if (governsRate) return "Highest rate";
  if (governsLife) return "Shortest life";
  return null;
}
