import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ExpAlyze - IFA Commission & Revenue Ledger",
  description: "A modern, responsive financial statement ingestion, ledger, and analysis platform for Indian IFAs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased bg-slate-50/50 text-slate-900`}
      >
        {children}
      </body>
    </html>
  );
}
