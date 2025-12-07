import type { Metadata } from "next";
import { AuthProvider } from "@/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stealth",
  description: "Automated investment research workflow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
