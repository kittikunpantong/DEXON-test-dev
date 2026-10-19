"use client";

import { usePathname } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();
  const current = pathname === "/lines/new" ? "new" : pathname.startsWith("/lines/") ? "detail" : "index";

  return (
    <header className="site-header">
      <a className="brand" href="/">
        DEXON
        <small>Pipe inspection</small>
      </a>
      <nav className="nav-links" aria-label="Primary">
        <a href="/" aria-current={current === "index" ? "page" : undefined}>
          Line list
        </a>
        <a href="/lines/new" aria-current={current === "new" ? "page" : undefined}>
          Add line
        </a>
      </nav>
      <details className="nav-mobile">
        <summary>Menu</summary>
        <a href="/">Line list</a>
        <a href="/lines/new">Add line</a>
      </details>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <h2>Pipe thickness inspection</h2>
          <p>
            Record lines, CMLs, test points, and thickness history, then calculate corrosion rate and remaining life from the values entered
          </p>
        </div>
        <div>
          <h2>Records</h2>
          <ul>
            <li>Lines</li>
            <li>CML</li>
            <li>Test points</li>
            <li>Thickness</li>
          </ul>
        </div>
        <div>
          <h2>Calculated values</h2>
          <ul>
            <li>Outside diameter</li>
            <li>Required thickness</li>
            <li>Corrosion rate</li>
            <li>Remaining life</li>
          </ul>
        </div>
        <div>
          <h2>Display</h2>
          <ul>
            <li>Thickness to 3 places</li>
            <li>Rate to 4 places</li>
            <li>Life to 1 place</li>
            <li>Unlimited when the rate is not positive</li>
          </ul>
        </div>
      </div>
      <div className="container">
        <p className="copy">DEXON Piping Inspection</p>
      </div>
    </footer>
  );
}

export function SetupNotice() {
  return (
    <section className="section">
      <div className="container">
        <h2>Database is not connected</h2>
        <p className="muted" style={{ marginTop: 12 }}>
          Check that MySQL on localhost port 3307 is running and that .env points at the dexon database, then create the tables and sample data
        </p>
        <div className="panel">
          <p>npm run db:setup</p>
        </div>
      </div>
    </section>
  );
}
