import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Byggjakt — billigste byggevarer-tur",
  description:
    "Sammenlign byggevarepriser i Norge og finn den billigste totale turen — pris, bompenger, drivstoff og kjøretid.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb">
      <body>{children}</body>
    </html>
  );
}
