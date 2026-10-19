import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";

import "./globals.css";

const sans = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "700"],
});

export const metadata: Metadata = {
  title: "Pipe thickness inspection",
  description: "Record pipe inspection points, corrosion rates, and remaining life",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.className} min-h-screen antialiased`}>{children}</body>
    </html>
  );
}
