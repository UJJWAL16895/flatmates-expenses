import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Flatmates — Shared Expenses",
  description: "Track and settle shared expenses with your flatmates. Import CSV data, detect anomalies, and simplify settlements.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased" style={{ background: 'var(--bg-primary)' }}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
